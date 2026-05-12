import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase'

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()

  const [{ data: settings }, { data: overrides }, { data: activeTrades }] = await Promise.all([
    db.from('platform_settings')
      .select('house_win_rate, house_win_rate_vip, house_win_rate_demo, per_user_override_enabled, trade_ticks')
      .eq('id', 1).single(),
    db.from('user_overrides')
      .select('*, users(username, account_type)')
      .not('custom_win_rate', 'is', null),
    db.from('trades')
      .select('id, direction, amount_usd, users(username)')
      .eq('outcome', 'pending'),
  ])

  const buyVolume = activeTrades?.filter(t => t.direction === 'buy').reduce((s, t) => s + Number(t.amount_usd), 0) || 0
  const sellVolume = activeTrades?.filter(t => t.direction === 'sell').reduce((s, t) => s + Number(t.amount_usd), 0) || 0

  return NextResponse.json({ settings, overrides, activeTrades, buyVolume, sellVolume })
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const db = createAdminClient()

  if (body.action === 'update_global') {
    const update: any = {
      house_win_rate: body.house_win_rate,
      house_win_rate_vip: body.house_win_rate_vip,
      house_win_rate_demo: body.house_win_rate_demo,
    }
    if (body.trade_ticks != null) update.trade_ticks = body.trade_ticks
    const { error } = await db.from('platform_settings').update(update).eq('id', 1)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (body.action === 'set_user_override') {
    await db.from('user_overrides').upsert({
      user_id: body.user_id,
      custom_win_rate: body.custom_win_rate,
      is_blocked_from_trading: body.is_blocked_from_trading ?? false,
    }, { onConflict: 'user_id' })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
