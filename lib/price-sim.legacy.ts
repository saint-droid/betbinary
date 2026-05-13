import { EventEmitter } from 'events'
import { createAdminClient } from './supabase'

// ── Types ──────────────────────────────────────────────────────────────
export type Regime = 'uptrend' | 'downtrend' | 'ranging'

export interface LiveCandle {
  time: number   // unix seconds, aligned to candle boundary
  open: number
  high: number
  low: number
  close: number
}

export interface TickEvent {
  price: number
  candle: LiveCandle
  regime: Regime
}

interface PairSim {
  pairId: string
  candleDuration: number
  lastPrice: number
  baseVol: number
  regime: Regime
  regimeTicksLeft: number
  trendStrength: number
  meanRevertTarget: number
  impulseLeft: number
  impulseDir: number
  currentCandle: LiveCandle | null
  emitter: EventEmitter
  handle: ReturnType<typeof setInterval>
  flushHandle: ReturnType<typeof setInterval>
  tickCount: number
  clients: number
  shutdownTimer: ReturnType<typeof setTimeout> | null
}

// ── Module-level simulation registry ──────────────────────────────────
const sims = new Map<string, PairSim>()

// ── Math utils ────────────────────────────────────────────────────────
function randn(): number {
  let u = 0, v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

// ── Regime switching ──────────────────────────────────────────────────
function switchRegime(sim: PairSim) {
  const r = Math.random()
  if (r < 0.32) {
    sim.regime = 'uptrend'
    sim.trendStrength = 0.35 + Math.random() * 0.65
    sim.regimeTicksLeft = 80 + Math.floor(Math.random() * 280)
  } else if (r < 0.62) {
    sim.regime = 'downtrend'
    sim.trendStrength = 0.35 + Math.random() * 0.65
    sim.regimeTicksLeft = 80 + Math.floor(Math.random() * 280)
  } else {
    sim.regime = 'ranging'
    sim.meanRevertTarget = sim.lastPrice
    sim.trendStrength = 0
    sim.regimeTicksLeft = 160 + Math.floor(Math.random() * 320)
  }
}

// ── Single tick price generation ──────────────────────────────────────
function generateNextPrice(sim: PairSim): number {
  sim.regimeTicksLeft--
  if (sim.regimeTicksLeft <= 0) switchRegime(sim)

  const vol = sim.baseVol
  let drift = 0
  if (sim.regime === 'uptrend') {
    drift = vol * 0.28 * sim.trendStrength
  } else if (sim.regime === 'downtrend') {
    drift = -vol * 0.28 * sim.trendStrength
  } else {
    const gap = (sim.meanRevertTarget - sim.lastPrice) / sim.lastPrice
    drift = gap * 0.12
  }

  if (sim.impulseLeft > 0) {
    drift += sim.impulseDir * vol * 1.2
    sim.impulseLeft--
  } else if (Math.random() < 0.003) {
    sim.impulseLeft = 3 + Math.floor(Math.random() * 6)
    sim.impulseDir = Math.random() < 0.5 ? 1 : -1
  }

  const noise = vol * randn()
  const newPrice = sim.lastPrice * (1 + drift + noise)
  return Math.max(newPrice, sim.lastPrice * 0.9995 * 0.001)
}

// ── Candle persistence ──────────────────────────────────────────────────
export async function persistCandle(
  pairId: string,
  c: LiveCandle,
  attempt = 1,
) {
  const timeIso = new Date(c.time * 1000).toISOString()
  const db = createAdminClient()
  const { error } = await db.from('price_feed').upsert({
    pair_id: pairId,
    time_open: timeIso,
    open: c.open, high: c.high, low: c.low, close: c.close,
    volume: Math.round(Math.random() * 800 + 200),
    is_simulated: true,
  }, { onConflict: 'pair_id,time_open', ignoreDuplicates: false })

  if (error) {
    const msg = (error.message ?? '').slice(0, 120)
    console.error(`[price-sim] persist failed attempt=${attempt} ${timeIso}: ${msg}`)
    if (attempt < 3) {
      await new Promise(r => setTimeout(r, attempt * 2000))
      return persistCandle(pairId, c, attempt + 1)
    }
  }
}

// ── Candle management + DB write ──────────────────────────────────────
function tickSim(sim: PairSim) {
  const newPrice = generateNextPrice(sim)
  sim.lastPrice = newPrice

  const nowSec = Math.floor(Date.now() / 1000)
  const candleTime = Math.floor(nowSec / sim.candleDuration) * sim.candleDuration

  if (!sim.currentCandle || sim.currentCandle.time !== candleTime) {
    // Candle closed — persist final state then open new candle
    if (sim.currentCandle) {
      persistCandle(sim.pairId, sim.currentCandle)
    }
    sim.currentCandle = { time: candleTime, open: newPrice, high: newPrice, low: newPrice, close: newPrice }
    persistCandle(sim.pairId, sim.currentCandle)
    sim.tickCount = 0
  } else {
    sim.currentCandle.high  = Math.max(sim.currentCandle.high, newPrice)
    sim.currentCandle.low   = Math.min(sim.currentCandle.low,  newPrice)
    sim.currentCandle.close = newPrice
    // Persist every 2 ticks (~1 second) so close price is always fresh in DB
    sim.tickCount++
    if (sim.tickCount % 2 === 0) persistCandle(sim.pairId, sim.currentCandle)
  }

  sim.emitter.emit('tick', {
    price: newPrice,
    candle: { ...sim.currentCandle },
    regime: sim.regime,
  } satisfies TickEvent)
}

// ── Get-or-create simulation for a pair ───────────────────────────────
export async function getOrCreateSim(pairId: string): Promise<PairSim | null> {
  if (sims.has(pairId)) {
    const existing = sims.get(pairId)!
    if (existing.shutdownTimer) {
      clearTimeout(existing.shutdownTimer)
      existing.shutdownTimer = null
    }
    existing.clients++
    return existing
  }

  const db = createAdminClient()

  const [{ data: pair }, { data: settings }] = await Promise.all([
    db.from('trading_pairs').select('id, base_price, volatility, drift').eq('id', pairId).single(),
    db.from('platform_settings').select('candle_duration_seconds').eq('id', 1).single(),
  ])

  if (!pair) return null

  const candleDuration = settings?.candle_duration_seconds ?? 60
  const storedVol = Math.max(Number(pair.volatility) || 0.001, 0.00001)
  const baseVol = storedVol / Math.sqrt(172800) * 18

  const nowSec = Math.floor(Date.now() / 1000)
  const currentCandleStart = Math.floor(nowSec / candleDuration) * candleDuration

  // Fetch the two most recent candles — current (in-progress) and previous (closed)
  const { data: recentRows } = await db
    .from('price_feed')
    .select('open, high, low, close, time_open')
    .eq('pair_id', pairId)
    .order('time_open', { ascending: false })
    .limit(2)

  const currentCandleRow = recentRows?.find((r: any) =>
    Math.floor(new Date(r.time_open).getTime() / 1000) === currentCandleStart
  )
  const lastClosedRow = recentRows?.find((r: any) =>
    Math.floor(new Date(r.time_open).getTime() / 1000) !== currentCandleStart
  ) ?? recentRows?.[0]

  // Seed price from current candle's latest close, or last closed candle, or base price
  let lastPrice = Number(
    currentCandleRow?.close ?? lastClosedRow?.close ?? pair.base_price ?? 1.0
  )

  // Gap fill: fill any missing closed candles between last known and now
  if (lastClosedRow?.time_open) {
    const lastCandleTime = Math.floor(new Date(lastClosedRow.time_open).getTime() / 1000)
    const nextExpected = lastCandleTime + candleDuration

    if (nextExpected < currentCandleStart) {
      const startTime = Math.max(nextExpected, currentCandleStart - 500 * candleDuration)
      let fillPrice = Number(lastClosedRow.close)
      const catchup: object[] = []

      for (let t = startTime; t < currentCandleStart; t += candleDuration) {
        const open = fillPrice
        let high = fillPrice, low = fillPrice
        for (let i = 0; i < 30; i++) {
          fillPrice = fillPrice * (1 + baseVol * randn() * 2.5)
          if (fillPrice > high) high = fillPrice
          if (fillPrice < low)  low  = fillPrice
        }
        catchup.push({
          pair_id: pairId,
          time_open: new Date(t * 1000).toISOString(),
          open, high, low, close: fillPrice,
          volume: Math.round(Math.random() * 800 + 200),
          is_simulated: true,
        })
      }

      if (catchup.length > 0) {
        await db.from('price_feed').upsert(catchup, {
          onConflict: 'pair_id,time_open',
          ignoreDuplicates: true,
        })
        lastPrice = fillPrice
      }
    }
  }

  // Restore the current in-progress candle from DB so new instances continue it
  let restoredCandle: LiveCandle | null = null
  if (currentCandleRow) {
    restoredCandle = {
      time: currentCandleStart,
      open: Number(currentCandleRow.open),
      high: Number(currentCandleRow.high),
      low:  Number(currentCandleRow.low),
      close: Number(currentCandleRow.close),
    }
    lastPrice = restoredCandle.close
  }

  const emitter = new EventEmitter()
  emitter.setMaxListeners(200)

  const sim: PairSim = {
    pairId,
    candleDuration,
    lastPrice,
    baseVol,
    regime: 'ranging',
    regimeTicksLeft: 40,
    trendStrength: 0,
    meanRevertTarget: lastPrice,
    impulseLeft: 0,
    impulseDir: 1,
    currentCandle: restoredCandle,
    emitter,
    handle: null as any,
    flushHandle: null as any,
    tickCount: 0,
    clients: 1,
    shutdownTimer: null,
  }

  sim.handle = setInterval(() => tickSim(sim), 500)
  sim.flushHandle = null as any

  // Cleanup old candles once per hour
  const cleanupHandle = setInterval(async () => {
    try { await db.rpc('cleanup_old_price_feed') } catch {}
  }, 60 * 60 * 1000)
  // Store on sim so it gets cleared on shutdown
  ;(sim as any).cleanupHandle = cleanupHandle

  sims.set(pairId, sim)
  return sim
}

export function releaseSim(pairId: string, sim: PairSim) {
  sim.clients--
  if (sim.clients <= 0) {
    sim.shutdownTimer = setTimeout(() => {
      const current = sims.get(pairId)
      if (current && current.clients <= 0) {
        clearInterval(current.handle)
        if (current.flushHandle) clearInterval(current.flushHandle)
        if ((current as any).cleanupHandle) clearInterval((current as any).cleanupHandle)
        if (current.currentCandle) persistCandle(pairId, current.currentCandle)
        sims.delete(pairId)
      }
    }, 5 * 60 * 1000)
  }
}
