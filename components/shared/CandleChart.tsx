'use client'

import { useEffect, useRef, forwardRef, useImperativeHandle, useState } from 'react'
import {
  createChart, AreaSeries, ColorType, CrosshairMode, LineStyle, LineType,
  type UTCTimestamp, type IChartApi, type ISeriesApi,
  type IPriceLine,
} from 'lightweight-charts'

interface HistoricalCandle {
  time_open: string
  open: number; high: number; low: number; close: number
}

interface LiveCandle {
  time: number; open: number; high: number; low: number; close: number
}

export interface TickPayload {
  price: number
  candle: LiveCandle
  regime: 'uptrend' | 'downtrend' | 'ranging'
}

export interface CandleChartHandle {
  zoomIn: () => void
  zoomOut: () => void
  fitContent: () => void
  scrollToLatest: () => void
}

interface Props {
  historicalCandles: HistoricalCandle[]
  pairId: string
  candleDuration: number
  onTick?: (payload: TickPayload) => void
  streamUrl?: string
  entryPrice?: number | null
  visibleCandles?: number
  loading?: boolean
}

// lightweight-charts has no timezone support — shift all times by local offset
// so the X-axis labels match the user's wall clock.
const TZ_OFFSET_SEC = new Date().getTimezoneOffset() * -60  // e.g. +10800 for UTC+3

const toLocal = (utcSec: number): UTCTimestamp => (utcSec + TZ_OFFSET_SEC) as UTCTimestamp
const toLocalISO = (isoString: string): UTCTimestamp =>
  toLocal(Math.floor(new Date(isoString).getTime() / 1000))

type Bar = { time: UTCTimestamp; value: number }

function cleanBars(raw: Bar[]): Bar[] {
  const map = new Map<number, Bar>()
  for (const bar of raw) map.set(bar.time as number, bar)
  return [...map.values()].sort((a, b) => (a.time as number) - (b.time as number))
}

const CandleChart = forwardRef<CandleChartHandle, Props>(function CandleChart(
  { historicalCandles, pairId, candleDuration, onTick, streamUrl = '/api/chart/stream', entryPrice, visibleCandles = 120, loading = false },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef     = useRef<IChartApi | null>(null)
  const seriesRef    = useRef<ISeriesApi<'Area'> | null>(null)
  const esRef        = useRef<EventSource | null>(null)
  const onTickRef    = useRef(onTick)
  const entryLineRef = useRef<IPriceLine | null>(null)

  // Dot canvas
  const dotCanvasRef  = useRef<HTMLCanvasElement | null>(null)
  const dotAnimRef    = useRef<number | null>(null)
  const livePriceRef  = useRef<number | null>(null)
  const liveTimeRef   = useRef<UTCTimestamp | null>(null)  // candle boundary time for chart update
  const liveTickTimeRef = useRef<UTCTimestamp | null>(null) // actual tick epoch for dot X position

  const userScrolledRef      = useRef(false)
  const programmingScrollRef = useRef(false)
  const barSpacingRef        = useRef(20)
  const lastHistBarTimeRef   = useRef<number>(0)

  // Controls the blur overlay — shown until first live tick arrives after load
  const [dataReady, setDataReady] = useState(false)

  useEffect(() => { onTickRef.current = onTick }, [onTick])

  // Reset ready state and scroll position when pair changes
  useEffect(() => {
    setDataReady(false)
    userScrolledRef.current = false
  }, [pairId])

  useImperativeHandle(ref, () => ({
    zoomIn() {
      const chart = chartRef.current; if (!chart) return
      barSpacingRef.current = Math.min(barSpacingRef.current * 1.35, 80)
      chart.timeScale().applyOptions({ barSpacing: barSpacingRef.current })
    },
    zoomOut() {
      const chart = chartRef.current; if (!chart) return
      barSpacingRef.current = Math.max(barSpacingRef.current / 1.35, 2)
      chart.timeScale().applyOptions({ barSpacing: barSpacingRef.current })
    },
    fitContent() {
      const chart = chartRef.current; if (!chart) return
      userScrolledRef.current = false
      programmingScrollRef.current = true
      chart.timeScale().fitContent()
      requestAnimationFrame(() => { programmingScrollRef.current = false })
    },
    scrollToLatest() {
      const chart = chartRef.current; if (!chart) return
      userScrolledRef.current = false
      programmingScrollRef.current = true
      chart.timeScale().scrollToRealTime()
      requestAnimationFrame(() => { programmingScrollRef.current = false })
    },
  }))

  // ── 1. Create chart ────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return
    const el = containerRef.current

    const chart = createChart(el, {
      width: el.clientWidth,
      height: el.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: '#0e1320' },
        textColor: 'rgba(148,163,184,0.7)',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.04)' },
        horzLines: { color: 'rgba(255,255,255,0.04)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: 'rgba(255,255,255,0.2)', width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#1e2d40' },
        horzLine: { color: 'rgba(255,255,255,0.2)', width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#1e2d40' },
      },
      rightPriceScale: {
        borderColor: 'rgba(255,255,255,0.06)',
        scaleMargins: { top: 0.15, bottom: 0.1 },
        minimumWidth: 60,
        textColor: 'rgba(148,163,184,0.7)',
      },
      timeScale: {
        borderColor: 'rgba(255,255,255,0.06)',
        timeVisible: true,
        secondsVisible: true,
        rightOffset: 2,
        barSpacing: barSpacingRef.current,
        minBarSpacing: 1,
      },
      handleScroll: true,
      handleScale: true,
    })

    const series = chart.addSeries(AreaSeries, {
      lineColor: 'rgba(255,255,255,1)',
      lineWidth: 3,
      lineType: LineType.Curved,
      topColor: 'rgba(255,255,255,0.15)',
      bottomColor: 'rgba(255,255,255,0.02)',
      crosshairMarkerVisible: false,
      lastValueVisible: true,
      priceLineVisible: false,
      priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
    })

    chartRef.current  = chart
    seriesRef.current = series

    chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
      if (programmingScrollRef.current) return
      userScrolledRef.current = true
    })

    const observer = new ResizeObserver(() => {
      chart.applyOptions({ width: el.clientWidth, height: el.clientHeight })
      if (dotCanvasRef.current) {
        dotCanvasRef.current.width  = el.clientWidth
        dotCanvasRef.current.height = el.clientHeight
      }
    })
    observer.observe(el)

    return () => {
      observer.disconnect()
      if (dotAnimRef.current) cancelAnimationFrame(dotAnimRef.current)
      chart.remove()
      chartRef.current = seriesRef.current = null
      entryLineRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 2. Pulsing dot rAF loop ────────────────────────────────────────────
  useEffect(() => {
    const canvas = dotCanvasRef.current
    const el     = containerRef.current
    if (!canvas || !el) return
    canvas.width  = el.clientWidth
    canvas.height = el.clientHeight

    let phase = 0

    function loop() {
      const chart  = chartRef.current
      const series = seriesRef.current
      const price  = livePriceRef.current
      // Use the candle boundary time (liveTimeRef) for chart X — that's what series.update() used
      const time   = liveTimeRef.current
      const ctx    = canvas!.getContext('2d')
      if (!ctx) { dotAnimRef.current = requestAnimationFrame(loop); return }

      ctx.clearRect(0, 0, canvas!.width, canvas!.height)

      if (chart && series && price !== null && time !== null) {
        const y = series.priceToCoordinate(price)
        const x = chart.timeScale().timeToCoordinate(time)

        if (y !== null && x !== null) {
          phase += 0.06
          const pulse = (Math.sin(phase) + 1) / 2

          const outerR = 8 + 4 * pulse
          ctx.beginPath()
          ctx.arc(x, y, outerR, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(255,255,255,${0.06 + 0.08 * pulse})`
          ctx.fill()

          ctx.beginPath()
          ctx.arc(x, y, 5.5, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(255,255,255,${0.18 + 0.14 * pulse})`
          ctx.fill()

          ctx.beginPath()
          ctx.arc(x, y, 3, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(255,255,255,0.95)'
          ctx.fill()
        }
      }

      dotAnimRef.current = requestAnimationFrame(loop)
    }

    dotAnimRef.current = requestAnimationFrame(loop)
    return () => { if (dotAnimRef.current) cancelAnimationFrame(dotAnimRef.current) }
  }, [])

  // ── 3. Load historical candles ─────────────────────────────────────────
  useEffect(() => {
    const series = seriesRef.current
    const chart  = chartRef.current
    if (!series || !chart) return
    userScrolledRef.current = false

    if (historicalCandles.length === 0) return  // don't clear — wait for data

    const raw: Bar[] = historicalCandles.map(c => ({
      time:  toLocalISO(c.time_open),
      value: Number(c.close),
    }))
    const data = cleanBars(raw)
    series.setData(data)

    if (data.length > 0) {
      const last = data[data.length - 1]
      lastHistBarTimeRef.current = last.time as number
      livePriceRef.current       = last.value
      liveTimeRef.current        = last.time
      // History loaded — clear the overlay immediately, don't wait for SSE tick
      setDataReady(true)
    }

    programmingScrollRef.current = true
    chart.timeScale().applyOptions({ barSpacing: barSpacingRef.current, rightOffset: 0 })
    chart.timeScale().scrollToRealTime()
    requestAnimationFrame(() => { programmingScrollRef.current = false })
  }, [historicalCandles]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 4. SSE live ticks ─────────────────────────────────────────────────
  useEffect(() => {
    if (!pairId) return
    let retryTimer: ReturnType<typeof setTimeout> | null = null
    let retryDelay = 1000
    let destroyed  = false

    function connect() {
      if (destroyed) return
      esRef.current?.close()
      const es = new EventSource(`${streamUrl}?pair_id=${encodeURIComponent(pairId)}`)
      esRef.current = es

      es.onmessage = (event) => {
        retryDelay = 1000
        const payload: TickPayload = JSON.parse(event.data)
        const series = seriesRef.current
        const chart  = chartRef.current
        if (!series || !payload.candle) return

        const candleTime = payload.candle.time as number

        // Drop ticks strictly older than our history window (compare in UTC)
        if (lastHistBarTimeRef.current > 0) {
          const lastUtc = lastHistBarTimeRef.current - TZ_OFFSET_SEC
          if (candleTime < lastUtc) return
        }

        // Shift to local time for chart display
        const t = toLocal(candleTime)

        // Update the area series
        try { series.update({ time: t, value: payload.price }) } catch { /* stale */ }

        // Update dot refs
        livePriceRef.current    = payload.price
        liveTimeRef.current     = t
        liveTickTimeRef.current = t

        // Mark data as ready on first live tick — removes blur overlay
        setDataReady(true)

        if (!userScrolledRef.current && chart) {
          programmingScrollRef.current = true
          chart.timeScale().scrollToRealTime()
          requestAnimationFrame(() => { programmingScrollRef.current = false })
        }

        onTickRef.current?.(payload)
      }

      es.onerror = () => {
        es.close()
        if (!destroyed) {
          retryTimer = setTimeout(() => {
            retryDelay = Math.min(retryDelay * 2, 15000)
            connect()
          }, retryDelay)
        }
      }
    }

    connect()
    return () => {
      destroyed = true
      if (retryTimer) clearTimeout(retryTimer)
      esRef.current?.close()
      esRef.current = null
    }
  }, [pairId, streamUrl])

  // ── 5. Entry price line ────────────────────────────────────────────────
  useEffect(() => {
    const series = seriesRef.current; if (!series) return
    if (entryLineRef.current) { try { series.removePriceLine(entryLineRef.current) } catch {}; entryLineRef.current = null }
    if (entryPrice && entryPrice > 0) {
      entryLineRef.current = series.createPriceLine({
        price: entryPrice, color: '#f59e0b', lineWidth: 1,
        lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: 'ENTRY',
      })
    }
  }, [entryPrice])

  const showOverlay = loading || !dataReady

  return (
    <div ref={containerRef} className="w-full h-full min-h-0 relative">
      <canvas ref={dotCanvasRef} className="absolute inset-0 pointer-events-none z-10" style={{ width: '100%', height: '100%' }} />

      {/* Blur overlay shown while loading or waiting for first live tick */}
      {showOverlay && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3"
          style={{ backdropFilter: 'blur(6px)', background: 'rgba(14,19,32,0.55)' }}>
          {/* Animated connecting ring */}
          <div className="relative flex items-center justify-center">
            <div className="w-12 h-12 rounded-full border-2 border-[#1e2d40]" />
            <div className="absolute w-12 h-12 rounded-full border-2 border-t-[#22c55e] border-r-transparent border-b-transparent border-l-transparent animate-spin" />
            <div className="absolute w-6 h-6 rounded-full border border-[#22c55e]/40 animate-ping" />
          </div>
          <div className="text-center">
            <p className="text-xs font-semibold text-white/80 tracking-wide">Connecting to live feed</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Fetching price data…</p>
          </div>
        </div>
      )}
    </div>
  )
})

export default CandleChart
