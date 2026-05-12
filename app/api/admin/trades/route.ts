import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const outcome = searchParams.get('outcome') || ''
  const is_demo = searchParams.get('is_demo') || ''
  const siteId = searchParams.get('site_id') || ''
  const page = parseInt(searchParams.get('page') || '1')
  const limit = 20
  const offset = (page - 1) * limit

  const db = createAdminClient()
  let query = db
    .from('trades')
    .select('*, users(username, account_type)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (outcome) query = query.eq('outcome', outcome)
  if (is_demo !== '') query = query.eq('is_demo', is_demo === 'true')
  if (siteId) query = query.eq('site_id', siteId)

  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const trades = data || []

  // Enrich with pair names via separate query (no FK needed)
  const pairIds = [...new Set(trades.map((t: any) => t.pair_id).filter(Boolean))]
  let pairMap: Record<string, { symbol: string; display_name: string }> = {}
  if (pairIds.length > 0) {
    const { data: pairs } = await db
      .from('binary_pairs')
      .select('id,symbol,display_name')
      .in('id', pairIds)
    for (const p of pairs || []) pairMap[p.id] = p
  }

  const enriched = trades.map((t: any) => ({
    ...t,
    binary_pairs: pairMap[t.pair_id] || null,
  }))

  return NextResponse.json({ trades: enriched, total: count, page, limit })
}
