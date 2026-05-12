import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase'

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()
  const { data, error } = await db
    .from('affiliate_withdrawals')
    .select('*, users!inner(username, phone)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ withdrawals: data || [] })
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { action, id, reason } = await req.json()
  const db = createAdminClient()

  if (action === 'approve') {
    const { error } = await db
      .from('affiliate_withdrawals')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('status', 'pending')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (action === 'reject') {
    // Fetch withdrawal to refund affiliate balance
    const { data: aw } = await db
      .from('affiliate_withdrawals')
      .select('user_id, amount_usd, status')
      .eq('id', id)
      .single()

    if (!aw) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data: user } = await db.from('users').select('affiliate_balance_usd').eq('id', aw.user_id).single()
    await db.from('users')
      .update({ affiliate_balance_usd: Number(user?.affiliate_balance_usd ?? 0) + Number(aw.amount_usd) })
      .eq('id', aw.user_id)

    await db.from('affiliate_withdrawals').update({
      status: 'rejected',
      rejection_reason: reason || 'Rejected by admin',
      updated_at: new Date().toISOString(),
    }).eq('id', id)

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
