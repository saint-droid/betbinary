import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase'

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
    .from('deposits')
    .select('*, users!inner(username, phone), manually_approved_by', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (status && status !== 'all') query = query.eq('status', status)
  if (siteId) query = query.eq('site_id', siteId)

  if (search) {
    query = query.or(`mpesa_transaction_id.ilike.%${search}%,phone.ilike.%${search}%,users.username.ilike.%${search}%`)
  }

  if (dateRange !== 'all') {
    const now = new Date()
    let startDate = new Date()
    if (dateRange === 'today') startDate.setHours(0, 0, 0, 0)
    else if (dateRange === 'yesterday') {
      startDate.setDate(startDate.getDate() - 1); startDate.setHours(0, 0, 0, 0)
      const endDate = new Date(startDate); endDate.setHours(23, 59, 59, 999)
      query = query.lte('created_at', endDate.toISOString())
    }
    else if (dateRange === 'this_week') {
      const day = startDate.getDay()
      const diff = startDate.getDate() - day + (day === 0 ? -6 : 1)
      startDate.setDate(diff); startDate.setHours(0, 0, 0, 0)
    }
    else if (dateRange === 'last_week') {
      const day = startDate.getDay()
      const diff = startDate.getDate() - day + (day === 0 ? -6 : 1) - 7
      startDate.setDate(diff); startDate.setHours(0, 0, 0, 0)
      const endDate = new Date(startDate); endDate.setDate(endDate.getDate() + 6); endDate.setHours(23, 59, 59, 999)
      query = query.lte('created_at', endDate.toISOString())
    }
    query = query.gte('created_at', startDate.toISOString())
  }

  // Get stats for all matching records before pagination
  const { data: allMatchingData, error: statsError } = await query
  if (statsError) return NextResponse.json({ error: statsError.message }, { status: 500 })

  const stats = {
    total: { count: 0, amount: 0 },
    completed: { count: 0, amount: 0 },
    pending: { count: 0, amount: 0 },
    failed: { count: 0, amount: 0 }
  }
  
  if (allMatchingData) {
    for (const d of allMatchingData) {
      const amt = Number(d.amount_kes) || 0
      const isMpesa = !!d.mpesa_transaction_id && d.phone !== 'MANUAL'
      stats.total.count++
      if (d.status === 'completed') {
        stats.completed.count++
        stats.completed.amount += isMpesa ? amt : 0
        // Total = only real gateway completed deposits
        stats.total.amount += isMpesa ? amt : 0
      } else if (d.status === 'pending') {
        stats.pending.count++
        stats.pending.amount += isMpesa ? amt : 0
      } else if (d.status === 'failed') {
        stats.failed.count++
        stats.failed.amount += isMpesa ? amt : 0
      }
    }
  }

  query = query.range(offset, offset + limit - 1)
  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ deposits: data, total: count, page, limit, stats })
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { action, deposit_id, user_id, amount_kes, amount_usd } = await req.json()
  const db = createAdminClient()

  if (action === 'approve') {
    const { data, error } = await db.rpc('fn_confirm_deposit', { p_deposit_id: deposit_id })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await db.from('deposits').update({ manually_approved_by: session.id }).eq('id', deposit_id)
    return NextResponse.json(data)
  }

  if (action === 'reject') {
    const { error } = await db.from('deposits').update({ status: 'failed' }).eq('id', deposit_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (action === 'manual_credit') {
    const settings = await db.from('platform_settings').select('conversion_rate').eq('id', 1).single()
    const rate = settings.data?.conversion_rate || 129
    const usd = amount_usd || amount_kes / rate
    const { error: insertErr } = await db.from('deposits').insert({
      user_id, amount_kes, amount_usd: usd, conversion_rate_used: rate,
      phone: 'MANUAL', status: 'completed', manually_approved_by: session.id,
      completed_at: new Date().toISOString(),
    })
    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })
    await db.rpc('fn_credit_balance', { p_user_id: user_id, p_amount: usd, p_is_demo: false })
    return NextResponse.json({ success: true })
  }

  if (action === 'edit') {
    const { deposit_id: edit_id, amount_kes: edit_amount, mpesa_transaction_id, phone, status, created_at } = await req.json()
    const { data: existing } = await db.from('deposits').select('conversion_rate_used').eq('id', edit_id).single()
    const rate = existing?.conversion_rate_used || 129
    const edit_usd = edit_amount / rate

    const { error } = await db.from('deposits').update({
      amount_kes: edit_amount, amount_usd: edit_usd, mpesa_transaction_id, phone, status, created_at
    }).eq('id', edit_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (action === 'delete') {
    const { deposit_id: del_id } = await req.json()
    const { error } = await db.from('deposits').delete().eq('id', del_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
