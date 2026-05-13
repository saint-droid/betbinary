import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { generateAndPersist } from '@/lib/candle-gen'

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

  // Delete ALL candles for all pairs
  const { data: pairs } = await db.from('trading_pairs').select('id, symbol').eq('is_active', true)
  if (!pairs || pairs.length === 0) return NextResponse.json({ message: 'No active pairs' })

  for (const pair of pairs) {
    await db.from('price_feed').delete().eq('pair_id', pair.id)
  }

  const { data: settings } = await db
    .from('platform_settings')
    .select('candle_duration_seconds')
    .eq('id', 1)
    .single()

  const candleDuration = settings?.candle_duration_seconds ?? 60
  // 6 hours ahead
  const count = Math.ceil((6 * 60 * 60) / candleDuration)

  const results: Record<string, unknown> = {}
  for (const pair of pairs) {
    results[pair.symbol] = await generateAndPersist(pair.id, count)
  }

  return NextResponse.json({ ok: true, flushed: (pairs as any[]).map((p: any) => p.symbol), results })
}
