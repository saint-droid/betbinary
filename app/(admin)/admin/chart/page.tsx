'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef, useState, useCallback } from 'react'
import { TrendingUp, TrendingDown, Minus, ZoomIn, ZoomOut, Maximize2, Clock } from 'lucide-react'
import PageHeader from '@/components/admin/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { TickPayload, CandleChartHandle } from '@/components/shared/CandleChart'

const CandleChart = dynamic(() => import('@/components/shared/CandleChart'), { ssr: false })

interface Pair { id: string; symbol: string; display_name: string; is_active: boolean }
interface HistoricalCandle { time_open: string; open: number; high: number; low: number; close: number }

type Regime = 'uptrend' | 'downtrend' | 'ranging'

function formatDuration(s: number) {
  if (s < 60) return `${s}s`
  if (s < 3600) return `${s / 60}m`
  return `${s / 3600}h`
}

export default function ChartPage() {
  const [pairs, setPairs] = useState<Pair[]>([])
  const [selectedPair, setSelectedPair] = useState<string>('')
  const [historicalCandles, setHistoricalCandles] = useState<HistoricalCandle[]>([])
  const [candleDuration, setCandleDuration] = useState(60)
  const [loading, setLoading] = useState(true)
  const [loadingCandles, setLoadingCandles] = useState(false)

  const [livePrice, setLivePrice] = useState<number | null>(null)
  const [prevPrice, setPrevPrice] = useState<number | null>(null)
  const [regime, setRegime] = useState<Regime>('ranging')
  const [ohlc, setOhlc] = useState<{ open: number; high: number; low: number } | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const connCheckRef = useRef<NodeJS.Timeout | null>(null)
  const lastTickRef  = useRef<number>(0)

  const [clockTime, setClockTime] = useState('')

  // Ref to CandleChart imperative handle for zoom/scroll controls
  const chartHandleRef = useRef<CandleChartHandle>(null)

  const currentPair = pairs.find(p => p.id === selectedPair)

  useEffect(() => {
    fetch('/api/admin/chart')
      .then(r => r.json())
      .then(d => {
        const list: Pair[] = d.pairs || []
        setPairs(list)
        setCandleDuration(d.candle_duration_seconds ?? 60)
        const first = list.find(p => p.is_active) ?? list[0]
        if (first) setSelectedPair(first.id)
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (!selectedPair) return
    setLoadingCandles(true)
    setLivePrice(null)
    setOhlc(null)
    setIsConnected(false)
    fetch(`/api/admin/chart?pair_id=${selectedPair}&limit=200`)
      .then(r => r.json())
      .then(d => {
        setHistoricalCandles(d.candles || [])
        setCandleDuration(d.candle_duration_seconds ?? 60)
        setLoadingCandles(false)
      })
  }, [selectedPair])

  useEffect(() => {
    if (connCheckRef.current) clearInterval(connCheckRef.current)
    connCheckRef.current = setInterval(() => {
      setIsConnected(Date.now() - lastTickRef.current < 2000)
      const now = new Date()
      const hh = String(now.getHours()).padStart(2, '0')
      const mm = String(now.getMinutes()).padStart(2, '0')
      const ss = String(now.getSeconds()).padStart(2, '0')
      setClockTime(`${hh}:${mm}:${ss}`)
    }, 1000)
    return () => { if (connCheckRef.current) clearInterval(connCheckRef.current) }
  }, [])

  const handleTick = useCallback((payload: TickPayload) => {
    lastTickRef.current = Date.now()
    setIsConnected(true)
    setLivePrice(prev => {
      setPrevPrice(prev)
      return payload.price
    })
    setRegime(payload.regime)
    setOhlc({ open: payload.candle.open, high: payload.candle.high, low: payload.candle.low })
  }, [])

  const priceChange = livePrice !== null && prevPrice !== null && prevPrice !== 0
    ? ((livePrice - prevPrice) / prevPrice) * 100
    : null

  const RegimeIcon = regime === 'uptrend' ? TrendingUp : regime === 'downtrend' ? TrendingDown : Minus
  const regimeColor = regime === 'uptrend' ? 'text-emerald-500' : regime === 'downtrend' ? 'text-red-400' : 'text-muted-foreground'

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">

      {/* ── Top bar ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-border shrink-0">

        {/* Left: pair selector + live badge + duration */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <Select value={selectedPair} onValueChange={v => v && setSelectedPair(v)}>
            <SelectTrigger className="w-40 sm:w-48 font-semibold">
              {currentPair
                ? <span>{currentPair.display_name || currentPair.symbol}</span>
                : <span className="text-muted-foreground">Select pair…</span>}
            </SelectTrigger>
            <SelectContent>
              {pairs.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.display_name || p.symbol}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className={cn(
            'flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold',
            isConnected ? 'bg-emerald-500/15 text-emerald-500' : 'bg-muted text-muted-foreground'
          )}>
            <span className={cn(
              'w-1.5 h-1.5 rounded-full',
              isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'
            )} />
            {isConnected ? 'LIVE' : 'CONNECTING'}
          </div>

          <span className="text-xs text-muted-foreground hidden sm:block">
            {formatDuration(candleDuration)} · 500ms
          </span>
        </div>

        {/* Right: price stats + chart controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {livePrice !== null && (
            <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
              <span className="font-mono text-lg sm:text-2xl font-bold tracking-tight">
                {livePrice.toFixed(5)}
              </span>

              {priceChange !== null && (
                <span className={cn(
                  'text-sm font-semibold font-mono',
                  priceChange > 0 ? 'text-emerald-500' : priceChange < 0 ? 'text-red-400' : 'text-muted-foreground'
                )}>
                  {priceChange > 0 ? '+' : ''}{priceChange.toFixed(4)}%
                </span>
              )}

              {ohlc && (
                <div className="hidden lg:flex items-center gap-3 text-xs text-muted-foreground">
                  <span>O <span className="font-mono text-foreground">{Number(ohlc.open).toFixed(5)}</span></span>
                  <span>H <span className="font-mono text-emerald-500">{Number(ohlc.high).toFixed(5)}</span></span>
                  <span>L <span className="font-mono text-red-400">{Number(ohlc.low).toFixed(5)}</span></span>
                  <span>C <span className="font-mono text-foreground">{livePrice.toFixed(5)}</span></span>
                </div>
              )}

              <div className={cn('flex items-center gap-1 text-xs font-semibold', regimeColor)}>
                <RegimeIcon className="w-3.5 h-3.5" />
                <span className="uppercase hidden sm:block">{regime}</span>
              </div>
            </div>
          )}

          {/* Chart controls */}
          <div className="flex items-center gap-1 border-l border-border pl-3">
            <Button
              size="icon" variant="ghost" className="h-7 w-7"
              title="Zoom in"
              onClick={() => chartHandleRef.current?.zoomIn()}
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="icon" variant="ghost" className="h-7 w-7"
              title="Zoom out"
              onClick={() => chartHandleRef.current?.zoomOut()}
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="sm" variant="ghost" className="h-7 px-2 text-xs font-semibold gap-1"
              title="Fit all data"
              onClick={() => chartHandleRef.current?.fitContent()}
            >
              <Maximize2 className="w-3 h-3" />
              <span className="hidden sm:block">Auto</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ── Chart area ───────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 relative p-2 sm:p-4">
        {clockTime && (
          <div className="absolute bottom-[18px] right-[18px] z-10 flex items-center gap-1 text-[11px] font-mono text-muted-foreground/70 select-none pointer-events-none">
            <Clock className="w-3 h-3 opacity-60" />
            <span>{clockTime}</span>
            <span className="opacity-50">UTC+3</span>
          </div>
        )}
        <Card className="h-full rounded-md overflow-hidden">
          <CardContent className="p-0 h-full">
            {loading || loadingCandles ? (
              <Skeleton className="w-full h-full rounded-xl" />
            ) : !selectedPair ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Select a trading pair to view the chart.
              </div>
            ) : (
              <CandleChart
                ref={chartHandleRef}
                key={selectedPair}
                historicalCandles={historicalCandles}
                pairId={selectedPair}
                candleDuration={candleDuration}
                onTick={handleTick}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
