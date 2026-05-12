import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase'

function randn(): number {
  let u = 0, v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

/**
 * Generate synthetic candles to fill a time gap and append to `out`.
 * For very large gaps, only fills the most-recent MAX_PER_GAP slots so the
 * DB write stays small and the visible chart window is always gap-free.
 */
const MAX_PER_GAP = 300

function fillGap(
  out: object[],
  pairId: string,
  fromTimeSec: number,   // first missing slot (inclusive)
  toTimeSec: number,     // first existing slot after gap (exclusive)
  startPrice: number,
  baseVol: number,
  candleDuration: number,
) {
  // For large gaps fill from the RECENT end so the visible window is clean
  const totalSlots = Math.ceil((toTimeSec - fromTimeSec) / candleDuration)
  const cappedFrom = totalSlots > MAX_PER_GAP
    ? toTimeSec - MAX_PER_GAP * candleDuration
    : fromTimeSec

  let price = startPrice
  for (let t = cappedFrom; t < toTimeSec; t += candleDuration) {
    const open = price
    let high = price, low = price
    for (let i = 0; i < 30; i++) {
      price = price * (1 + baseVol * randn() * 2.5)
      if (price > high) high = price
      if (price < low)  low  = price
    }
    out.push({
      pair_id: pairId,
      time_open: new Date(t * 1000).toISOString(),
      open, high, low, close: price,
      volume: Math.round(Math.random() * 800 + 200),
      is_simulated: true,
    })
  }
}

export async function GET(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const pairId = searchParams.get('pair_id')
  const limit  = Math.min(parseInt(searchParams.get('limit') || '200'), 500)

  const db = createAdminClient()

  const [pairsRes, settingsRes] = await Promise.all([
    db.from('trading_pairs').select('id, symbol, display_name, is_active').order('sort_order'),
    db.from('platform_settings').select('candle_duration_seconds').eq('id', 1).single(),
  ])

  if (!pairId) {
    return NextResponse.json({
      pairs: pairsRes.data || [],
      candle_duration_seconds: settingsRes.data?.candle_duration_seconds ?? 60,
      candles: [],
    })
  }

  const candleDuration = settingsRes.data?.candle_duration_seconds ?? 60

  // ── 1. Fetch the most recent N candles from DB (exclude future pre-generated) ──
  const nowIso = new Date().toISOString()
  const { data: rawDesc, error } = await db
    .from('price_feed')
    .select('time_open, open, high, low, close, volume')
    .eq('pair_id', pairId)
    .lte('time_open', nowIso)
    .order('time_open', { ascending: false })  // newest first
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Reverse to ascending order for gap scanning
  const candles = (rawDesc || []).reverse()

  // ── 2. Scan for gaps (internal + tail) and fill them ───────────────
  const nowSec          = Math.floor(Date.now() / 1000)
  const currentCandle   = Math.floor(nowSec / candleDuration) * candleDuration

  if (candles.length > 0) {
    // Get pair volatility once (needed for realistic gap candles)
    const { data: pair } = await db
      .from('trading_pairs')
      .select('volatility, base_price')
      .eq('id', pairId)
      .single()

    const storedVol = Math.max(Number(pair?.volatility) || 0.001, 0.00001)
    const baseVol   = storedVol / Math.sqrt(172800) * 18

    const gapRows: object[] = []

    // Internal gaps: scan consecutive candle pairs
    for (let i = 1; i < candles.length; i++) {
      const prevTime = Math.floor(new Date(candles[i - 1].time_open).getTime() / 1000)
      const currTime = Math.floor(new Date(candles[i].time_open).getTime() / 1000)
      const expected = prevTime + candleDuration

      if (currTime > expected) {
        fillGap(gapRows, pairId, expected, currTime,
          Number(candles[i - 1].close), baseVol, candleDuration)
      }
    }

    // Tail gap: from last DB candle to the current open candle
    const lastTime    = Math.floor(new Date(candles[candles.length - 1].time_open).getTime() / 1000)
    const tailStart   = lastTime + candleDuration
    if (tailStart < currentCandle) {
      // Cap tail gap at 500 candles to avoid huge writes after long outages
      const cappedStart = Math.max(tailStart, currentCandle - 500 * candleDuration)
      fillGap(gapRows, pairId, cappedStart, currentCandle,
        Number(candles[candles.length - 1].close), baseVol, candleDuration)
    }

    // Persist all generated candles and re-fetch if anything was filled
    if (gapRows.length > 0) {
      const { error: upsertErr } = await db.from('price_feed').upsert(gapRows, {
        onConflict: 'pair_id,time_open',
        ignoreDuplicates: true,
      })

      // Only re-fetch when upsert succeeded; otherwise fall through and return
      // existing data (client-side gap fill in CandleChart covers visual gaps)
      if (upsertErr) {
        console.error('[chart/gap-fill] upsert failed:', upsertErr.message)
      } else {
      // Re-fetch now that gaps are filled
      const { data: refetched } = await db
        .from('price_feed')
        .select('time_open, open, high, low, close, volume')
        .eq('pair_id', pairId)
        .lte('time_open', nowIso)
        .order('time_open', { ascending: false })
        .limit(limit)

      return NextResponse.json({
        pairs: pairsRes.data || [],
        candle_duration_seconds: candleDuration,
        candles: (refetched || []).reverse(),
      })
      } // end else (upsert succeeded)
    }
  }

  return NextResponse.json({
    pairs: pairsRes.data || [],
    candle_duration_seconds: candleDuration,
    candles,
  })
}
