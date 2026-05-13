import WebSocket from 'ws'
import { createAdminClient } from './supabase'
import { tickBus, Tick } from './tick-bus'

const DERIV_WS_URL = 'wss://ws.binaryws.com/websockets/v3?app_id=1089'
const CANDLE_DURATION_SEC = 1   // always 1-second candles

export type WorkerStatus = 'stopped' | 'connecting' | 'connected' | 'error'

interface PairConfig {
  id: string
  symbol: string
  derivSymbol: string
  candleDuration: number
}

interface CandleState {
  time: number
  open: number
  high: number
  low:  number
  close: number
}

const g = global as any
const KEY = '__derivWorker__'

// Resolvers waiting for first history batch per pairId
const historyReady: Map<string, Array<() => void>> = (g.__historyReady__ ??= new Map())

interface WorkerState {
  status: WorkerStatus
  ws: WebSocket | null
  pairs: Map<string, PairConfig>
  pairById: Map<string, PairConfig>
  candles: Map<string, CandleState>
  historyStore: Map<string, CandleState[]>  // pairId → completed candles, never evicted by live ticks
  lastError: string | null
  reconnectTimer: ReturnType<typeof setTimeout> | null
  candleDuration: number
  startedAt: number | null
  pendingHistory: Map<number, string>
  reqCounter: number
}

function getState(): WorkerState {
  if (!g[KEY]) {
    g[KEY] = {
      status: 'stopped', ws: null,
      pairs: new Map(), pairById: new Map(), candles: new Map(),
      historyStore: new Map(),
      lastError: null, reconnectTimer: null,
      candleDuration: CANDLE_DURATION_SEC,
      startedAt: null, pendingHistory: new Map(), reqCounter: 1,
    } satisfies WorkerState
  }
  return g[KEY]
}

// ── Public API ───────────────────────────────────────────────────────────────

export function getHistory(pairId: string): CandleState[] {
  return getState().historyStore.get(pairId) ?? []
}

/** Resolves as soon as in-memory history is available for pairId, or after timeoutMs. */
export function waitForHistory(pairId: string, timeoutMs = 4000): Promise<void> {
  if ((getState().historyStore.get(pairId) ?? []).length > 0) return Promise.resolve()
  return new Promise(resolve => {
    const resolvers = historyReady.get(pairId) ?? []
    resolvers.push(resolve)
    historyReady.set(pairId, resolvers)
    setTimeout(resolve, timeoutMs)
  })
}

export function getWorkerStatus() {
  const s = getState()
  return {
    status: s.status,
    pairs: [...s.pairs.values()].map(p => p.symbol),  // unique by deriv_symbol
    lastError: s.lastError,
    startedAt: s.startedAt,
  }
}

export async function startWorker() {
  const s = getState()
  if (s.status === 'connecting' || s.status === 'connected') return
  await reloadPairs()
  connect()
}

export async function stopWorker() {
  const s = getState()
  if (s.reconnectTimer) { clearTimeout(s.reconnectTimer); s.reconnectTimer = null }
  if (s.ws) { s.ws.removeAllListeners(); s.ws.close(); s.ws = null }
  s.status = 'stopped'
  s.startedAt = null
}

export async function reloadPairs() {
  const s = getState()
  try {
    const db = createAdminClient()
    const [{ data: settings }, { data: binaryRows }] = await Promise.all([
      db.from('platform_settings').select('candle_duration_seconds').eq('id', 1).single(),
      db.from('binary_pairs').select('id, symbol, deriv_symbol').eq('is_active', true).not('deriv_symbol', 'is', null).neq('deriv_symbol', ''),
    ])

    s.candleDuration = CANDLE_DURATION_SEC
    s.pairs.clear()
    s.pairById.clear()

    for (const row of (binaryRows || [])) {
      const cfg: PairConfig = { id: row.id, symbol: row.symbol, derivSymbol: row.deriv_symbol, candleDuration: CANDLE_DURATION_SEC }
      s.pairs.set(row.deriv_symbol, cfg)
      s.pairById.set(row.id, cfg)
    }

    if (s.ws && s.status === 'connected') subscribePairs(s.ws, s)
  } catch (err: any) {
    s.lastError = err?.message ?? 'DB error reloading pairs'
  }
}

// ── WebSocket internals ──────────────────────────────────────────────────────

function connect() {
  const s = getState()
  if (s.reconnectTimer) { clearTimeout(s.reconnectTimer); s.reconnectTimer = null }

  s.status = 'connecting'
  const ws = new WebSocket(DERIV_WS_URL)
  s.ws = ws

  ws.on('open', () => {
    s.status = 'connected'
    s.startedAt = Date.now()
    s.lastError = null
    subscribePairs(ws, s)
  })

  ws.on('message', (raw: Buffer) => {
    try { handleMessage(JSON.parse(raw.toString()), s) } catch {}
  })

  ws.on('error', (err: Error) => { s.lastError = err.message; s.status = 'error' })

  ws.on('close', () => {
    if (s.status !== 'stopped') {
      s.status = 'error'
      s.reconnectTimer = setTimeout(() => connect(), 5000)
    }
  })
}

function subscribePairs(ws: WebSocket, s: WorkerState) {
  // Unsubscribe all existing tick streams before re-subscribing to avoid "already subscribed" errors
  ws.send(JSON.stringify({ forget_all: 'ticks' }))

  for (const [derivSymbol, cfg] of s.pairs) {
    // Fetch raw tick history — gives exact epoch-per-tick prices, same time base as live ticks
    const reqId = s.reqCounter++
    s.pendingHistory.set(reqId, cfg.id)
    ws.send(JSON.stringify({
      ticks_history: derivSymbol,
      adjust_start_time: 1,
      count: 5000,   // last 5000 ticks (~83 minutes at ~1 tick/sec)
      end: 'latest',
      style: 'ticks',
      req_id: reqId,
    }))

    // Subscribe to live tick stream
    ws.send(JSON.stringify({ ticks: derivSymbol, subscribe: 1 }))
  }
}

function handleMessage(msg: any, s: WorkerState) {
  if (msg.error) { s.lastError = msg.error.message; return }

  // Response to ticks_history with style:'ticks'
  if (msg.msg_type === 'history' && msg.history) {
    const pairId = s.pendingHistory.get(msg.req_id)
    s.pendingHistory.delete(msg.req_id)
    if (pairId) {
      storeTickHistory(pairId, msg.history.times, msg.history.prices, s)
    }
    return
  }

  if (msg.msg_type === 'tick' && msg.tick) {
    const { symbol, quote, epoch } = msg.tick
    const cfg = s.pairs.get(symbol)
    if (!cfg) return

    const price = Number(quote)
    const nowSec = Number(epoch)

    // Each tick is its own 1-second point — time = exact epoch second
    const tick: Tick = {
      pairId: cfg.id,
      price,
      time: nowSec,
      candle: { time: nowSec, open: price, high: price, low: price, close: price },
    }
    tickBus.publish(tick)

    const candleState = { time: nowSec, open: price, high: price, low: price, close: price }
    // Append to in-memory history so new subscribers get it
    appendToHistory(cfg.id, candleState, s)
    // Persist to DB so cold-start instances can read recent history
    persistCandle(cfg.id, candleState).catch(() => {})
  }
}

const HISTORY_LIMIT = 10000

function storeTickHistory(pairId: string, times: number[], prices: number[], s: WorkerState) {
  if (!times || !prices || times.length === 0) return
  const map = new Map<number, CandleState>()
  for (let i = 0; i < times.length; i++) {
    const t = Number(times[i])
    const p = Number(prices[i])
    map.set(t, { time: t, open: p, high: p, low: p, close: p })
  }
  const sorted = [...map.values()].sort((a, b) => a.time - b.time).slice(-HISTORY_LIMIT)
  s.historyStore.set(pairId, sorted)

  // Signal waiters immediately — in-memory is ready, chart route will use it directly
  const resolvers = historyReady.get(pairId) ?? []
  historyReady.delete(pairId)
  for (const r of resolvers) r()

  // Persist to DB in the background (for future cold starts)
  persistHistoryCandles(pairId, sorted).catch(() => {})

  // Seed tick bus with last point so chart has an immediate starting position
  if (sorted.length > 0) {
    const last = sorted[sorted.length - 1]
    tickBus.publish({ pairId, price: last.close, time: last.time, candle: { ...last } })
  }
}

function appendToHistory(pairId: string, candle: CandleState, s: WorkerState) {
  let store = s.historyStore.get(pairId)
  if (!store) { store = []; s.historyStore.set(pairId, store) }
  // Replace if same time, else append
  const last = store[store.length - 1]
  if (last && last.time === candle.time) {
    store[store.length - 1] = { ...candle }
  } else {
    store.push({ ...candle })
    if (store.length > HISTORY_LIMIT) store.shift()
  }
}

async function persistHistoryCandles(pairId: string, candles: CandleState[]) {
  const db = createAdminClient()
  const rows = candles.map(c => ({
    pair_id: pairId,
    time_open: new Date(c.time * 1000).toISOString(),
    open: c.open, high: c.high, low: c.low, close: c.close,
    volume: 0, is_simulated: false,
  }))
  // Batch in chunks of 500 to stay within PostgREST limits
  for (let i = 0; i < rows.length; i += 500) {
    await db.from('price_feed').upsert(rows.slice(i, i + 500), { onConflict: 'pair_id,time_open', ignoreDuplicates: true })
  }
  // Prune rows older than 24 hours to keep the table small
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  await db.from('price_feed').delete().eq('pair_id', pairId).lt('time_open', cutoff)
}

async function persistCandle(pairId: string, candle: CandleState) {
  try {
    const db = createAdminClient()
    await db.from('price_feed').upsert({
      pair_id: pairId,
      time_open: new Date(candle.time * 1000).toISOString(),
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: 0,
      is_simulated: false,
    }, { onConflict: 'pair_id,time_open', ignoreDuplicates: false })
  } catch {}
}

let autoStarted = false
export async function ensureWorkerRunning() {
  if (autoStarted) return
  autoStarted = true
  await startWorker()
}
