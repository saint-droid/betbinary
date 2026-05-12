import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const db = createAdminClient()

  const [{ data: user }, { data: overrides }, { data: trades }, { data: deposits }, { data: withdrawals }] =
    await Promise.all([
      db.from('users').select('*').eq('id', id).single(),
      db.from('user_overrides').select('*').eq('user_id', id).single(),
      db.from('trades').select('*').eq('user_id', id).order('created_at', { ascending: false }).limit(20),
      db.from('deposits').select('*').eq('user_id', id).order('created_at', { ascending: false }).limit(20),
      db.from('withdrawals').select('*').eq('user_id', id).order('created_at', { ascending: false }).limit(20),
    ])

  return NextResponse.json({ user, overrides, trades, deposits, withdrawals })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const db = createAdminClient()

  // Allowed fields to update on user
  const userFields: Record<string, unknown> = {}
  if ('account_type' in body) userFields.account_type = body.account_type
  if ('status' in body) userFields.status = body.status

  if ('balance_usd' in body) {
    const newBalance = Number(body.balance_usd)
    userFields.balance_usd = newBalance

    // Create a deposit record so the transaction appears in the deposits list
    const { data: currentUser } = await db.from('users').select('balance_usd').eq('id', id).single()
    const oldBalance = Number(currentUser?.balance_usd ?? 0)
    const delta = newBalance - oldBalance

    if (delta !== 0) {
      const { data: cfg } = await db.from('platform_settings').select('conversion_rate').eq('id', 1).single()
      const rate = Number(cfg?.conversion_rate) || 129
      await db.from('deposits').insert({
        user_id: id,
        amount_kes: Math.abs(delta) * rate,
        amount_usd: delta,
        conversion_rate_used: rate,
        phone: 'ADMIN_ADJUSTMENT',
        status: 'completed',
        manually_approved_by: session.id,
        completed_at: new Date().toISOString(),
      })
    }
  }

  if (Object.keys(userFields).length > 0) {
    const { error } = await db.from('users').update(userFields).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Override fields
  const overrideFields: Record<string, unknown> = {}
  if ('custom_win_rate' in body) overrideFields.custom_win_rate = body.custom_win_rate
  if ('is_blocked_from_trading' in body) overrideFields.is_blocked_from_trading = body.is_blocked_from_trading
  if ('is_blocked_from_chat' in body) overrideFields.is_blocked_from_chat = body.is_blocked_from_chat
  if ('admin_notes' in body) overrideFields.admin_notes = body.admin_notes

  if (Object.keys(overrideFields).length > 0) {
    await db.from('user_overrides').upsert({ user_id: id, ...overrideFields }, { onConflict: 'user_id' })
  }

  return NextResponse.json({ success: true })
}
