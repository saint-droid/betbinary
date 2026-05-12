import { NextRequest } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase'
import { tickBus, Tick } from '@/lib/tick-bus'
import { ensureWorkerRunning } from '@/lib/deriv-ws'
import { ReadableStream } from 'stream/web'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const TZ_OFFSET_SEC = 3 * 3600

function buildPricePath(
  open: number, high: number, low: number, close: number, steps: number,
): number[] {
  const highFirst = Math.random() < 0.5
  const waypoints = highFirst ? [open, high, low, close] : [open, low, high, close]
  const seg1 = Math.max(1, Math.round(steps * 0.30))
  const seg2 = Math.max(1, Math.round(steps * 0.40))
  const seg3 = Math.max(1, steps - seg1 - seg2)
  const segments = [seg1, seg2, seg3]
  const path: number[] = []

  for (let s = 0; s < 3; s++) {
    const from = waypoints[s], to = waypoints[s + 1], n = segments[s]
    for (let i = 1; i <= n; i++) {
      const t = i / n
      const noise = (Math.random() - 0.5) * Math.abs(to - from) * 0.05
      path.push(from + (to - from) * t + noise)
    }
  }

  const clamped = path.map(p => Math.min(high, Math.max(low, p)))
  clamped[clamped.length - 1] = close
  return clamped
}

export async function GET(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return new Response('Unauthorized', { status: 401 })

  const pairId = new URL(req.url).searchParams.get('pair_id')
  if (!pairId) return new Response('pair_id required', { status: 400 })

  ensureWorkerRunning().catch(() => {})

  const db = createAdminClient()
  const [{ data: settings }, { data: pair }] = await Promise.all([
    db.from('platform_settings').select('candle_duration_seconds').eq('id', 1).single(),
    db.from('binary_pairs').select('deriv_symbol').eq('id', pairId).single(),
  ])

  const candleDuration = settings?.candle_duration_seconds ?? 60
  const isLive = !!(pair?.deriv_symbol)
  const tickIntervalMs = 500
  const stepsPerCandle = Math.floor((candleDuration * 1000) / tickIntervalMs)
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      let aborted = false
      req.signal.addEventListener('abort', () => { aborted = true })

      function send(data: object) {
        if (aborted) return
        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)) }
        catch { aborted = true }
      }

      if (isLive) {
        const buffered = tickBus.getBuffer(pairId)
        for (const tick of buffered) {
          send({ price: tick.price, candle: { time: tick.candle.time + TZ_OFFSET_SEC, open: tick.candle.open, high: tick.candle.high, low: tick.candle.low, close: tick.candle.close }, regime: 'ranging' })
        }
        const unsub = tickBus.subscribe(pairId, (tick: Tick) => {
          if (aborted) return
          send({ price: tick.price, candle: { time: tick.candle.time + TZ_OFFSET_SEC, open: tick.candle.open, high: tick.candle.high, low: tick.candle.low, close: tick.candle.close }, regime: 'ranging' })
        })
        req.signal.addEventListener('abort', () => { unsub(); try { controller.close() } catch {} })
        return
      }

      ;(async () => {
      while (!aborted) {
        const nowMs = Date.now()
        const nowSec = Math.floor(nowMs / 1000)
        const candleStartSec = Math.floor(nowSec / candleDuration) * candleDuration
        const elapsedMs = nowMs - candleStartSec * 1000

        const candleTimeIso = new Date(candleStartSec * 1000).toISOString()
        const nextCandleIso = new Date((candleStartSec + candleDuration) * 1000).toISOString()
        const { data: row } = await db
          .from('price_feed')
          .select('open, high, low, close, time_open')
          .eq('pair_id', pairId)
          .gte('time_open', candleTimeIso)
          .lt('time_open', nextCandleIso)
          .order('time_open', { ascending: true })
          .limit(1)
          .single()

        if (!row) {
          await new Promise(r => setTimeout(r, 1000))
          continue
        }

        const open = Number(row.open), high = Number(row.high)
        const low = Number(row.low), close = Number(row.close)
        const path = buildPricePath(open, high, low, close, stepsPerCandle)
        const stepsSoFar = Math.floor(elapsedMs / tickIntervalMs)
        let stepIndex = Math.min(stepsSoFar, path.length - 1)

        let liveHigh = open
        let liveLow  = open
        for (let i = 0; i < stepIndex; i++) {
          if (path[i] > liveHigh) liveHigh = path[i]
          if (path[i] < liveLow)  liveLow  = path[i]
        }

        while (!aborted && stepIndex < path.length) {
          const price = path[stepIndex]
          if (price > liveHigh) liveHigh = price
          if (price < liveLow)  liveLow  = price

          send({
            price,
            candle: { time: candleStartSec + TZ_OFFSET_SEC, open, high: liveHigh, low: liveLow, close: price },
            regime: 'ranging',
          })

          stepIndex++
          const nextTickMs = candleStartSec * 1000 + stepIndex * tickIntervalMs
          const waitMs = Math.max(0, nextTickMs - Date.now())
          if (waitMs > 0) await new Promise(r => setTimeout(r, waitMs))
        }

        if (!aborted) await new Promise(r => setTimeout(r, 200))
      }

      try { controller.close() } catch {}
      })()
    },
  })

  return new Response(stream as unknown as globalThis.ReadableStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
      Connection: 'keep-alive',
    },
  })
}
