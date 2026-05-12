import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserSession } from '@/lib/user-auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const session = await getUserSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') || 'trades'
  const limit = Math.min(Number(searchParams.get('limit') || '50'), 100)

  if (type === 'trades') {
    const { data, error } = await supabase
      .from('trades')
      .select('id,direction,amount_kes,amount_usd,entry_price,exit_price,outcome,payout_usd,is_demo,created_at,resolved_at,pair_id')
      .eq('user_id', session.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const trades = data || []

    // Enrich with pair names via separate query (no FK needed)
    const pairIds = [...new Set(trades.map((t: any) => t.pair_id).filter(Boolean))]
    let pairMap: Record<string, { symbol: string; display_name: string }> = {}
    if (pairIds.length > 0) {
      const { data: pairs } = await supabase
        .from('binary_pairs')
        .select('id,symbol,display_name')
        .in('id', pairIds)
      for (const p of pairs || []) pairMap[p.id] = p
    }

    const enriched = trades.map((t: any) => ({
      ...t,
      binary_pairs: pairMap[t.pair_id] || null,
    }))

    return NextResponse.json({ trades: enriched })
  }

  if (type === 'deposits') {
    const { data, error } = await supabase
      .from('deposits')
      .select('id,amount_kes,amount_usd,phone,status,bonus_applied,bonus_amount_usd,created_at,completed_at')
      .eq('user_id', session.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ deposits: data || [] })
  }

  if (type === 'withdrawals') {
    const { data, error } = await supabase
      .from('withdrawals')
      .select('id,amount_kes,amount_usd,phone,status,rejection_reason,created_at,completed_at')
      .eq('user_id', session.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ withdrawals: data || [] })
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
}
