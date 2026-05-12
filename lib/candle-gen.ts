import { createAdminClient } from './supabase'

export type Regime = 'uptrend' | 'downtrend' | 'ranging'

export interface GeneratedCandle {
  time: number   // unix seconds
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface RegimeState {
  regime: Regime
  ticksLeft: number
  trendStrength: number
  meanRevertTarget: number
  impulseLeft: number
  impulseDir: number
}

function randn(): number {
  let u = 0, v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

function switchRegime(state: RegimeState, currentPrice: number) {
  const r = Math.random()
  if (r < 0.32) {
    state.regime = 'uptrend'
    state.trendStrength = 0.35 + Math.random() * 0.65
    state.ticksLeft = 80 + Math.floor(Math.random() * 280)
  } else if (r < 0.62) {
    state.regime = 'downtrend'
    state.trendStrength = 0.35 + Math.random() * 0.65
    state.ticksLeft = 80 + Math.floor(Math.random() * 280)
  } else {
    state.regime = 'ranging'
    state.meanRevertTarget = currentPrice
    state.trendStrength = 0
    state.ticksLeft = 160 + Math.floor(Math.random() * 320)
  }
}

function nextMiniTick(price: number, baseVol: number, state: RegimeState): number {
  state.ticksLeft--
  if (state.ticksLeft <= 0) switchRegime(state, price)

  let drift = 0
  if (state.regime === 'uptrend') {
    drift = baseVol * 0.28 * state.trendStrength
  } else if (state.regime === 'downtrend') {
    drift = -baseVol * 0.28 * state.trendStrength
  } else {
    const gap = (state.meanRevertTarget - price) / price
    drift = gap * 0.12
  }

  if (state.impulseLeft > 0) {
    drift += state.impulseDir * baseVol * 1.2
    state.impulseLeft--
  } else if (Math.random() < 0.003) {
    state.impulseLeft = 3 + Math.floor(Math.random() * 6)
    state.impulseDir = Math.random() < 0.5 ? 1 : -1
  }

  const noise = baseVol * randn()
  const next = price * (1 + drift + noise)
  return Math.max(next, price * 0.0001)
}

export function generateCandles(
  startPrice: number,
  fromTimeSec: number,
  count: number,
  candleDuration: number,
  baseVol: number,
  initialRegime?: RegimeState,
): { candles: GeneratedCandle[]; finalPrice: number; finalRegime: RegimeState } {
  const state: RegimeState = initialRegime ?? {
    regime: 'ranging',
    ticksLeft: 40,
    trendStrength: 0,
    meanRevertTarget: startPrice,
    impulseLeft: 0,
    impulseDir: 1,
  }

  const candles: GeneratedCandle[] = []
  let price = startPrice

  for (let i = 0; i < count; i++) {
    const time = fromTimeSec + i * candleDuration
    const open = price
    let high = price
    let low = price

    for (let t = 0; t < 60; t++) {
      price = nextMiniTick(price, baseVol, state)
      if (price > high) high = price
      if (price < low)  low  = price
    }

    candles.push({ time, open, high, low, close: price, volume: Math.round(Math.random() * 800 + 200) })
  }

  return { candles, finalPrice: price, finalRegime: state }
}

/**
 * Generate and persist candles for a pair.
 *
 * Strategy:
 * 1. Find the latest candle that is <= now (the last "real" past candle)
 * 2. Generate `count` candles starting from the current candle slot
 * 3. Upsert with ignoreDuplicates so already-existing future slots are kept
 *
 * This ensures we always fill from NOW forward regardless of what junk
 * exists in the future part of the DB.
 */
export async function generateAndPersist(
  pairId: string,
  count: number,
): Promise<{ generated: number; from: string; to: string } | { error: string }> {
  const db = createAdminClient()

  const [{ data: pair }, { data: settings }] = await Promise.all([
    db.from('trading_pairs').select('base_price, volatility').eq('id', pairId).single(),
    db.from('platform_settings').select('candle_duration_seconds').eq('id', 1).single(),
  ])

  if (!pair) return { error: 'Pair not found' }

  const candleDuration = settings?.candle_duration_seconds ?? 60
  const storedVol = Math.max(Number(pair.volatility) || 0.001, 0.00001)
  const baseVol = storedVol / Math.sqrt(172800) * 18

  // Current candle slot (aligned to candleDuration boundary)
  const nowSec = Math.floor(Date.now() / 1000)
  const currentCandleSec = Math.floor(nowSec / candleDuration) * candleDuration

  // Seed price from the most recent candle at or before now
  const nowIso = new Date(currentCandleSec * 1000).toISOString()
  const { data: seedRow } = await db
    .from('price_feed')
    .select('close')
    .eq('pair_id', pairId)
    .lte('time_open', nowIso)
    .order('time_open', { ascending: false })
    .limit(1)
    .single()

  const seedPrice = Number(seedRow?.close ?? pair.base_price ?? 1.0)

  // Generate `count` candles from current slot onward
  const { candles } = generateCandles(seedPrice, currentCandleSec, count, candleDuration, baseVol)

  const rows = candles.map(c => ({
    pair_id: pairId,
    time_open: new Date(c.time * 1000).toISOString(),
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    volume: c.volume,
    is_simulated: true,
  }))

  const { error } = await db.from('price_feed').upsert(rows, {
    onConflict: 'pair_id,time_open',
    ignoreDuplicates: false, // overwrite so current candle gets fresh data
  })

  if (error) return { error: error.message }

  return {
    generated: candles.length,
    from: new Date(currentCandleSec * 1000).toISOString(),
    to: new Date(candles[candles.length - 1].time * 1000).toISOString(),
  }
}

export async function deleteOldCandles(
  pairId: string,
  olderThanHours = 48,
): Promise<{ deleted: number } | { error: string }> {
  const db = createAdminClient()
  const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000).toISOString()

  const { error, count } = await db
    .from('price_feed')
    .delete({ count: 'exact' })
    .eq('pair_id', pairId)
    .lt('time_open', cutoff)

  if (error) return { error: error.message }
  return { deleted: count ?? 0 }
}
