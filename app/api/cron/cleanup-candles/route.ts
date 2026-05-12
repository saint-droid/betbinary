import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { deleteOldCandles } from '@/lib/candle-gen'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true
  const auth = req.headers.get('authorization')
  const query = new URL(req.url).searchParams.get('secret')
  return auth === `Bearer ${secret}` || query === secret
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createAdminClient()
  const { data: pairs } = await db
    .from('trading_pairs')
    .select('id, symbol')

  if (!pairs || pairs.length === 0) {
    return NextResponse.json({ message: 'No pairs' })
  }

  const results: Record<string, unknown> = {}
  for (const pair of pairs) {
    results[pair.symbol] = await deleteOldCandles(pair.id, 48)
  }

  return NextResponse.json({ ok: true, results })
}
