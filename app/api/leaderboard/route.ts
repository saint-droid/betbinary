import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export type Period = 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month'

export async function GET(req: NextRequest) {
  const period = (new URL(req.url).searchParams.get('period') || 'today') as Period

  const profitCol: Record<Period, string> = {
    today:      'profit_today',
    yesterday:  'profit_yesterday',
    this_week:  'profit_this_week',
    last_week:  'profit_last_week',
    this_month: 'profit_this_month',
  }
  const tradesCol: Record<Period, string> = {
    today:      'trades_today',
    yesterday:  'trades_yesterday',
    this_week:  'trades_this_week',
    last_week:  'trades_last_week',
    this_month: 'trades_this_month',
  }

  const pCol = profitCol[period] ?? 'profit_today'
  const tCol = tradesCol[period] ?? 'trades_today'

  const siteId = process.env.NEXT_PUBLIC_SITE_ID || null

  const db = createAdminClient()
  let q = db
    .from('fake_traders')
    .select('*')
    .eq('is_active', true)
    .gt(pCol, 0)
    .order(pCol, { ascending: false })
    .limit(20)

  if (siteId) q = q.eq('site_id', siteId)

  const { data, error } = await q

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const traders = (data || []).map((t: Record<string, unknown>) => ({
    id: t.id,
    name: t.name,
    avatar_seed: t.avatar_seed,
    country_code: t.country_code,
    profit: Number(t[pCol]),
    trades: Number(t[tCol]),
  }))

  return NextResponse.json({ traders, period })
}
