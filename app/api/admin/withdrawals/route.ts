import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase'
import { initiateB2C } from '@/lib/mpesa'

export async function GET(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || ''
  const search = searchParams.get('search') || ''
  const dateRange = searchParams.get('dateRange') || 'all'
  const siteId = searchParams.get('site_id') || ''
  const page = parseInt(searchParams.get('page') || '1')
  const limit = 20
  const offset = (page - 1) * limit

  const db = createAdminClient()
  let query = db
    .from('withdrawals')
    .select('*, users!inner(username, phone)', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (status && status !== 'all') query = query.eq('status', status)
  if (siteId) query = query.eq('site_id', siteId)

  if (search) {
    query = query.or(`mpesa_transaction_id.ilike.%${search}%,phone.ilike.%${search}%,users.username.ilike.%${search}%`)
  }

  if (dateRange !== 'all') {
    const startDate = new Date()
    if (dateRange === 'today') startDate.setHours(0, 0, 0, 0)
    else if (dateRange === 'yesterday') {
      startDate.setDate(startDate.getDate() - 1); startDate.setHours(0, 0, 0, 0)
      const endDate = new Date(startDate); endDate.setHours(23, 59, 59, 999)
      query = query.lte('created_at', endDate.toISOString())
    }
    else if (dateRange === 'this_week') {
      const day = startDate.getDay()
      startDate.setDate(startDate.getDate() - day + (day === 0 ? -6 : 1)); startDate.setHours(0, 0, 0, 0)
    }
    else if (dateRange === 'last_week') {
      const day = startDate.getDay()
      startDate.setDate(startDate.getDate() - day + (day === 0 ? -6 : 1) - 7); startDate.setHours(0, 0, 0, 0)
      const endDate = new Date(startDate); endDate.setDate(endDate.getDate() + 6); endDate.setHours(23, 59, 59, 999)
      query = query.lte('created_at', endDate.toISOString())
    }
    query = query.gte('created_at', startDate.toISOString())
  }

  const { data: allMatchingData, error: statsError } = await query
  if (statsError) return NextResponse.json({ error: statsError.message }, { status: 500 })

  const stats = {
    total: { count: 0, amount: 0 },
    completed: { count: 0, amount: 0 },
    pending: { count: 0, amount: 0 },
    failed: { count: 0, amount: 0 },
  }

  if (allMatchingData) {
    for (const d of allMatchingData) {
      const amt = Number(d.amount_kes) || 0
      const isReal = d.phone !== 'tournament'
      stats.total.count++
      if (d.status === 'completed') {
        stats.completed.count++
        stats.completed.amount += isReal ? amt : 0
        stats.total.amount += isReal ? amt : 0
      } else if (d.status === 'pending' || d.status === 'approved' || d.status === 'processing') {
        stats.pending.count++
        stats.pending.amount += isReal ? amt : 0
      } else if (d.status === 'failed' || d.status === 'rejected' || d.status === 'cancelled') {
        stats.failed.count++
        stats.failed.amount += isReal ? amt : 0
      }
    }
  }

  query = query.range(offset, offset + limit - 1)
  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ withdrawals: data, total: count, page, limit, stats })
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { action, withdrawal_id, reason } = body
  const db = createAdminClient()

  if (action === 'approve') {
    // Fetch the withdrawal
    const { data: withdrawal } = await db
      .from('withdrawals')
      .select('id, user_id, amount_kes, phone, status')
      .eq('id', withdrawal_id)
      .single()

    if (!withdrawal) return NextResponse.json({ error: 'Withdrawal not found' }, { status: 404 })
    if (withdrawal.status !== 'pending') {
      return NextResponse.json({ error: 'Withdrawal is not in pending state' }, { status: 400 })
    }

    // Mark as processing
    await db.from('withdrawals').update({ status: 'processing' }).eq('id', withdrawal_id)

    // Attempt B2C payout
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
      const fnBase = `https://${projectRef}.supabase.co/functions/v1`
      const callbackUrl = `${fnBase}/mpesa-withdrawal-callback`
      const timeoutUrl = `${fnBase}/mpesa-withdrawal-timeout`

      const b2cResult = await initiateB2C({
        phone: withdrawal.phone,
        amountKes: Number(withdrawal.amount_kes),
        remarks: 'Withdrawal',
        occasion: withdrawal_id.slice(0, 12),
        callbackUrl,
        timeoutUrl,
      })

      if (b2cResult?.ConversationID) {
        await db.from('withdrawals').update({
          mpesa_transaction_id: b2cResult.ConversationID,
        }).eq('id', withdrawal_id)

        return NextResponse.json({ success: true, message: 'B2C payment initiated', conversationId: b2cResult.ConversationID })
      }

      // B2C returned but no ConversationID — treat as failure
      throw new Error('No ConversationID in B2C response')
    } catch (err: any) {
      // B2C failed — check if M-Pesa is configured at all
      const { data: mpesaSettings } = await db
        .from('platform_settings')
        .select('mpesa_b2c_initiator_name,mpesa_b2c_shortcode')
        .eq('id', 1)
        .single()

      if (!mpesaSettings?.mpesa_b2c_initiator_name) {
        // M-Pesa not configured — mark completed manually (admin will handle manually)
        await db.from('withdrawals').update({ status: 'completed' }).eq('id', withdrawal_id)
        return NextResponse.json({ success: true, message: 'Approved (M-Pesa not configured — marked completed)' })
      }

      // M-Pesa configured but failed — refund and mark failed
      const { data: withdrawal2 } = await db.from('withdrawals').select('user_id,amount_usd').eq('id', withdrawal_id).single()
      if (withdrawal2) {
        const { data: user } = await db.from('users').select('balance_usd').eq('id', withdrawal2.user_id).single()
        await db.from('users').update({ balance_usd: Number(user?.balance_usd ?? 0) + Number(withdrawal2.amount_usd) }).eq('id', withdrawal2.user_id)
      }
      await db.from('withdrawals').update({ status: 'cancelled', rejection_reason: `M-Pesa error: ${err.message}` }).eq('id', withdrawal_id)
      return NextResponse.json({ error: `B2C failed and refunded: ${err.message}` }, { status: 502 })
    }
  }

  if (action === 'reject') {
    // Fetch withdrawal to get user_id and amount for refund
    const { data: withdrawal } = await db
      .from('withdrawals')
      .select('user_id, amount_usd, status')
      .eq('id', withdrawal_id)
      .single()

    if (!withdrawal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Refund balance
    const { data: user } = await db.from('users').select('balance_usd').eq('id', withdrawal.user_id).single()
    await db.from('users')
      .update({ balance_usd: Number(user?.balance_usd ?? 0) + Number(withdrawal.amount_usd) })
      .eq('id', withdrawal.user_id)

    await db.from('withdrawals').update({
      status: 'rejected',
      rejection_reason: reason || 'Rejected by admin',
    }).eq('id', withdrawal_id)

    return NextResponse.json({ success: true })
  }

  if (action === 'edit') {
    const { withdrawal_id: edit_id, amount_kes: edit_amount, mpesa_transaction_id, phone, status: edit_status, created_at } = body
    const { data: existing } = await db.from('withdrawals').select('conversion_rate_used').eq('id', edit_id).single()
    const rate = existing?.conversion_rate_used || 129
    const edit_usd = edit_amount / rate

    const { error } = await db.from('withdrawals').update({
      amount_kes: edit_amount, amount_usd: edit_usd, mpesa_transaction_id, phone, status: edit_status, created_at
    }).eq('id', edit_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (action === 'delete') {
    const { error } = await db.from('withdrawals').delete().eq('id', withdrawal_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
