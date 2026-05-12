'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { BarChart2, MessageSquare, Trophy, Medal, ChevronDown, LineChart, BarChart, Tag, Download, Clock } from 'lucide-react'
import PairTicker from './PairTicker'
import Header from './Header'
import NewsTicker from './NewsTicker'
import TradingPanel, { AutoParams } from './TradingPanel'
import LiveChat from './LiveChat'
import CandleChart, { CandleChartHandle } from '../shared/CandleChart'
import { toast } from 'sonner'
import TradeToast from './TradeToast'
import Leaderboard from './Leaderboard'
import Tournaments from './Tournaments'
import { playOrderSound } from '@/lib/trade-sound'

import AuthModals from './AuthModals'
import EntryScanner from './EntryScanner'
import HowToTradeModal from './HowToTradeModal'
import WinningToast from './WinningToast'
import DigitBar from './DigitBar'
import AutoStopModal from './AutoStopModal'
import { supabase } from '@/lib/supabase'

// Tabbed Chat/Leaderboard/Tournaments panel for desktop right column
function DesktopRightTab({ user, conversionRate, activeCurrency, activeTab, onTabChange, onBalanceDeducted, onLoginClick }: {
  user: any; conversionRate: number; activeCurrency: string
  activeTab: 'chat' | 'leaders' | 'tournaments'
  onTabChange: (t: 'chat' | 'leaders' | 'tournaments') => void
  onBalanceDeducted: () => void
  onLoginClick: () => void
}) {
  const tab = activeTab
  const setTab = onTabChange
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex shrink-0 border-b border-[#1f2937]">
        <button
          onClick={() => setTab('chat')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-bold uppercase tracking-widest transition-colors ${tab === 'chat' ? 'text-[#22c55e] border-b-2 border-[#22c55e]' : 'text-gray-500 hover:text-white'}`}
        >
          <MessageSquare className="w-3.5 h-3.5" /> Chat
        </button>
        <button
          onClick={() => setTab('leaders')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-bold uppercase tracking-widest transition-colors ${tab === 'leaders' ? 'text-[#22c55e] border-b-2 border-[#22c55e]' : 'text-gray-500 hover:text-white'}`}
        >
          <Trophy className="w-3.5 h-3.5" /> Top
        </button>
        <button
          onClick={() => setTab('tournaments')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-bold uppercase tracking-widest transition-colors ${tab === 'tournaments' ? 'text-[#22c55e] border-b-2 border-[#22c55e]' : 'text-gray-500 hover:text-white'}`}
        >
          <Medal className="w-3.5 h-3.5" /> Tours
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        {tab === 'chat' && <LiveChat user={user} />}
        {tab === 'leaders' && <Leaderboard conversionRate={conversionRate} currency={activeCurrency} />}
        {tab === 'tournaments' && <Tournaments onBalanceDeducted={onBalanceDeducted} user={user} onLoginClick={onLoginClick} />}
      </div>
    </div>
  )
}


function TradeCard({ trade, symbol, isOpen, isFlash = false }: { trade: any; symbol: string; isOpen: boolean; isFlash?: boolean }) {
  const dirLabel = trade.direction === 'buy'
    ? (trade.tradeType === 'over_under' ? 'Over' : trade.tradeType === 'matches_differs' ? 'Match' : 'Even')
    : (trade.tradeType === 'over_under' ? 'Under' : trade.tradeType === 'matches_differs' ? 'Differ' : 'Odd')
  const isWin = trade.outcome === 'win'
  const isLoss = trade.outcome === 'loss'
  const pnlColor = isWin ? 'text-[#22c55e]' : isLoss ? 'text-[#ef4444]' : 'text-gray-400'

  // Flash closed card — big P&L style matching the screenshot
  if (isFlash) {
    return (
      <div className="border-b border-[#1e2d40] px-3 py-3 space-y-1.5 animate-flash-in">
        {/* Pair + direction + status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-white truncate max-w-[110px]">{trade.pairName || 'Unknown'}</span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${trade.direction === 'buy' ? 'bg-[#22c55e]/20 text-[#22c55e]' : 'bg-[#ef4444]/20 text-[#ef4444]'}`}>{dirLabel}</span>
          </div>
          <span className="text-[9px] text-gray-400 font-semibold flex items-center gap-1">
            🏁 Closed
          </span>
        </div>
        {/* Large P&L */}
        <div className={`text-xl font-black ${pnlColor}`}>
          {(trade.pnl || 0) >= 0 ? '+' : ''}{symbol} {Math.abs(trade.pnl || 0).toFixed(2)}
        </div>
        {/* Small stake row */}
        <div className="text-[10px] text-gray-500">Stake <span className="text-gray-400">{symbol} {(trade.amount || 0).toFixed(2)}</span></div>
      </div>
    )
  }

  return (
    <div className="border-b border-[#1e2d40] px-3 py-3 space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-white truncate max-w-[120px]">{trade.pairName || 'Unknown'}</span>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${trade.direction === 'buy' ? 'bg-[#22c55e]/20 text-[#22c55e]' : 'bg-[#ef4444]/20 text-[#ef4444]'}`}>{dirLabel}</span>
        </div>
        {isOpen ? (
          <span className="text-[9px] text-amber-400 font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block" />
            Processing
          </span>
        ) : (
          <span className={`text-[9px] font-semibold flex items-center gap-1 ${isWin ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
            🏁 {isWin ? 'Won' : 'Closed'}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-2 text-[10px]">
        <span className="text-gray-500">Stake</span>
        <span className="text-gray-300 text-right font-mono">{symbol} {(trade.amount || 0).toFixed(2)}</span>
        <span className="text-gray-500">Pot. payout</span>
        <span className="text-gray-300 text-right font-mono">{symbol} {((trade.amount || 0) * (trade.payoutMult || 1.95)).toFixed(3)}</span>
        {!isOpen && (
          <>
            <span className="text-gray-500">P&L</span>
            <span className={`text-right font-mono font-bold ${pnlColor}`}>{(trade.pnl || 0) >= 0 ? '+' : ''}{symbol} {Math.abs(trade.pnl || 0).toFixed(2)}</span>
          </>
        )}
      </div>
    </div>
  )
}

export default function TradingTerminal({ settings: initialSettings, pairs = [], news }: any) {
  const [liveSettings, setLiveSettings] = useState<any>(null)
  const settings = liveSettings ?? initialSettings

  const [user, setUser] = useState<any>(null)
  const [userLoading, setUserLoading] = useState(true)
  const [demoOverride, setDemoOverride] = useState(false)
  const isDemoMode = !user || demoOverride
  const [demoBalanceUsd, setDemoBalanceUsd] = useState<number>(() => Number(initialSettings?.demo_starting_balance) || 1000)
  const [localCurrency, setLocalCurrency] = useState(initialSettings?.default_currency || 'USD')

  // Fetch fresh settings on mount so currency/switcher changes apply without page reload
  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => {
      if (d.settings) {
        setLiveSettings((prev: any) => ({ ...(prev ?? initialSettings), ...d.settings }))
        setLocalCurrency(d.settings.default_currency || 'USD')
        if (d.settings.demo_starting_balance) setDemoBalanceUsd(Number(d.settings.demo_starting_balance))
      }
    }).catch(() => {})
  }, [])

  // Active pair — default to first pair
  const [selectedPairId, setSelectedPairId] = useState<string>(pairs[0]?.id || '')
  const [switching, setSwitching] = useState(false)
  const pair = pairs.find((p: any) => p.id === selectedPairId) || pairs[0] || null

  const [historicalCandles, setHistoricalCandles] = useState<any[]>([])

  const fetchCandles = useCallback(async (showOverlay = false) => {
    if (showOverlay) {
      setSwitching(true)
      setLivePrice(null)
      openPriceRef.current = null
      setPriceChange(null)
    }
    if (!pair?.id) { setSwitching(false); return }
    try {
      const res = await fetch(`/api/chart?pair_id=${pair.id}&limit=7200`)
      const data = await res.json()
      setHistoricalCandles(data.candles || [])
    } catch {}
    setSwitching(false)
  }, [pair?.id])

  useEffect(() => { fetchCandles(true) }, [fetchCandles])

  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') fetchCandles() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [fetchCandles])

  const canSwitchCurrency = !!settings?.show_currency_switcher
  const activeCurrency = canSwitchCurrency
    ? (user?.currency_preference || localCurrency)
    : (settings?.default_currency || 'USD')
  const conversionRate = settings?.conversion_rate || 129
  const symbol = activeCurrency === 'USD' ? '$' : 'KSh'
  // Use pair-level multiplier if set, fall back to global settings
  const payoutMultiplier = pair?.payout_multiplier || settings?.payout_multiplier || 1.8

  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [howToTradeOpen, setHowToTradeOpen] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)

  // Active tournament mini-state for the stats bar pill
  const [activeTournament, setActiveTournament] = useState<{ name: string; participant_count: number; joined: boolean } | null>(null)
  useEffect(() => {
    fetch('/api/tournaments')
      .then(r => r.json())
      .then(d => {
        const active = (d.tournaments || []).find((t: any) => t.status === 'active')
        if (active) setActiveTournament({ name: active.name, participant_count: active.participant_count, joined: active.joined })
      })
      .catch(() => {})
  }, [user])

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => { if (data.user) setUser(data.user) })
      .catch(console.error)
      .finally(() => setUserLoading(false))
  }, [])

  const refreshUser = useCallback(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => { if (d.user) setUser(d.user) }).catch(() => {})
  }, [])

  // Realtime — refresh balance when admin credits (deposit insert) or updates user row
  useEffect(() => {
    const ts = Date.now()
    const ch = supabase.channel(`user_balance_${ts}`)
    ch
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'deposits' }, () => {
        fetch('/api/auth/me').then(r => r.json()).then(d => { if (d.user) setUser(d.user) }).catch(() => {})
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users' }, () => {
        // Re-fetch via server route (service-role key) so RLS doesn't strip balance columns
        fetch('/api/auth/me').then(r => r.json()).then(d => { if (d.user) setUser(d.user) }).catch(() => {})
      })
      .subscribe((status) => {
        console.log('[Realtime] user_balance channel status:', status)
      })
    return () => { supabase.removeChannel(ch) }
  }, [])

  // Fallback: poll balance every 10s in case realtime tables aren't in the publication yet
  useEffect(() => {
    const id = setInterval(() => {
      fetch('/api/auth/me').then(r => r.json()).then(d => { if (d.user) setUser(d.user) }).catch(() => {})
    }, 10000)
    return () => clearInterval(id)
  }, [])

  // Fetch today's real trade stats when user is loaded
  useEffect(() => {
    if (!user) { setRealStats(null); return }
    fetch('/api/trade/stats')
      .then(r => r.json())
      .then(d => { if (!d.error) setRealStats(d) })
      .catch(() => {})
  }, [user?.id])

  // Chat simulation
  useEffect(() => {
    if (!settings?.chat_simulation_enabled) return
    const minMs = (settings.chat_simulation_freq_min_secs ?? 20) * 1000
    const maxMs = (settings.chat_simulation_freq_max_secs ?? 60) * 1000
    let timer: ReturnType<typeof setTimeout>
    function schedule() {
      const delay = minMs + Math.random() * (maxMs - minMs)
      timer = setTimeout(async () => {
        await fetch('/api/chat/simulate', { method: 'POST' }).catch(() => {})
        schedule()
      }, delay)
    }
    schedule()
    return () => clearTimeout(timer)
  }, [settings?.chat_simulation_enabled, settings?.chat_simulation_freq_min_secs, settings?.chat_simulation_freq_max_secs])

  // activeTrade: { id, amount, direction, status:'processing', startTime, entryPrice, outcome?, payout? }
  const [mobileTab, setMobileTab] = useState<'trade' | 'chat' | 'leaders' | 'tournaments'>('trade')
  const [desktopTab, setDesktopTab] = useState<'chat' | 'leaders' | 'tournaments'>('chat')
  const [activeTrade, setActiveTrade] = useState<any>(null)
  const [closedTrades, setClosedTrades] = useState<any[]>([])
  const activeTradeRef = useRef<any>(null)

  // Today's stats — real mode fetched from DB, demo persisted in localStorage
  const DEMO_STATS_KEY = 'betabinary_demo_stats_today'
  const todayKey = new Date().toISOString().slice(0, 10)
  const [realStats, setRealStats] = useState<{ wins: number; losses: number; pnlUsd: number; totalStakeUsd: number } | null>(null)
  const emptyStats = { wins: 0, losses: 0, pnlUsd: 0, totalStakeUsd: 0 }
  const [demoStats, setDemoStats] = useState(emptyStats)
  // Hydrate demo stats from localStorage after mount (avoids SSR/client mismatch)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DEMO_STATS_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.date === todayKey) setDemoStats(parsed.stats)
      }
    } catch {}
  }, [])
  // Auto-loop state
  const [autoRunning, setAutoRunning] = useState(false)
  const [autoDirection, setAutoDirection] = useState<'buy' | 'sell' | null>(null)
  const autoParamsRef = useRef<AutoParams | null>(null)
  const autoSessionPnlRef = useRef<number>(0)
  const autoSessionTradesRef = useRef<{ wins: number; losses: number }>({ wins: 0, losses: 0 })
  const [autoStopResult, setAutoStopResult] = useState<{ type: 'profit' | 'loss'; pnlUsd: number; trades: number; wins: number; losses: number } | null>(null)
  const [flashTrade, setFlashTrade] = useState<any>(null)
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [livePrice, setLivePrice] = useState<number | null>(null)
  const livePriceRef = useRef<number | null>(null)
  const openPriceRef = useRef<number | null>(null) // first price of the session, for % change
  const ticksSinceTradeRef = useRef<number>(0)
  const [priceChange, setPriceChange] = useState<{ diff: number; pct: number } | null>(null)
  const [, setPnlTick] = useState(0)

  // Re-render P&L every 100ms while a trade is active so convergence animates smoothly
  useEffect(() => {
    if (!activeTrade) return
    const t = setInterval(() => setPnlTick(n => n + 1), 250)
    return () => clearInterval(t)
  }, [!!activeTrade])
  const chartRef = useRef<CandleChartHandle>(null)
  const mobileChartRef = useRef<CandleChartHandle>(null)

  // Track which chart is visible so only one SSE stream drives livePrice
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // P&L animation: shoots to a fake peak in first 4s, then falls to a small positive for remainder
  const displayPnL = (() => {
    if (!activeTrade || !activeTrade.startTime) return 0
    const stake = activeTrade.amount || 0
    const duration = settings?.trade_duration_seconds || 10
    const elapsed = (Date.now() - activeTrade.startTime) / 1000
    const peakTime = Math.min(4, duration * 0.4)

    const seed = activeTrade.startTime % 1000
    const peakMultiplier = 5 + (seed / 1000) * 5
    const peak = stake * peakMultiplier
    const landing = stake * (0.15 + (seed / 1000) * 0.20)

    if (elapsed <= peakTime) {
      return peak * Math.min(1, elapsed / peakTime)
    } else {
      const fallProgress = Math.min(1, (elapsed - peakTime) / (duration - peakTime))
      return peak - (peak - landing) * fallProgress
    }
  })()

  const toggleCurrency = canSwitchCurrency ? () => {
    setLocalCurrency((prev: string) => prev === 'USD' ? 'KES' : 'USD')
    if (user) setUser({ ...user, currency_preference: activeCurrency === 'USD' ? 'KES' : 'USD' })
  } : undefined

  const openAuth = (mode: 'login' | 'register') => {
    setAuthMode(mode)
    setAuthModalOpen(true)
  }

  const resolveTradeRef = useRef<((trade: any, outcome: string, payout: number) => void) | null>(null)
  const handleTradeRef = useRef<((amount: number, direction: 'buy' | 'sell', tradeType: string) => void) | null>(null)

  const handleTick = useCallback(({ price }: { price: number }) => {
    setLivePrice(price)
    livePriceRef.current = price
    if (openPriceRef.current === null) {
      openPriceRef.current = price
    } else {
      const diff = price - openPriceRef.current
      const pct = (diff / openPriceRef.current) * 100
      setPriceChange({ diff, pct })
    }

    // Tick-based trade resolution
    const trade = activeTradeRef.current
    if (!trade || trade.status !== 'processing' || trade.tradeTicks == null) return
    ticksSinceTradeRef.current += 1
    if (ticksSinceTradeRef.current < trade.tradeTicks) return

    // We've received enough ticks — resolve now
    const { winTarget, stakeUsd, payoutMult, activeCurrency: tradeCurrency, conversionRate: tradeRate } = trade
    const outcome = winTarget ? 'win' : 'loss'
    const payoutUsd = winTarget ? stakeUsd * payoutMult : 0
    const payout = tradeCurrency === 'USD' ? payoutUsd : payoutUsd * tradeRate
    resolveTradeRef.current?.(trade, outcome, payout)
  }, [])

  // Auto-resolve a trade: credit balance/demo, show result, clear trade
  // payout is in display currency (same units as trade.amount)
  const resolveTrade = useCallback((trade: any, outcome: string, payout: number) => {
    // Guard against double-resolve
    if (activeTradeRef.current?.id !== trade.id) return
    if (activeTradeRef.current?.fallbackTimer) clearTimeout(activeTradeRef.current.fallbackTimer)
    activeTradeRef.current = null
    ticksSinceTradeRef.current = 0

    const pairName = pair?.display_name || pair?.symbol || 'GLOBAL/USD OTC'
    const payoutUsd = activeCurrency === 'USD' ? payout : payout / conversionRate

    if (outcome === 'win') {
      playOrderSound('win')
      const profit = payout - trade.amount
      const profitDisplay = `+${symbol} ${Math.abs(profit).toFixed(2)}`
      if (!trade.isReal) {
        setDemoBalanceUsd((prev: number) => prev + payoutUsd)
      } else {
        fetch('/api/auth/me').then(r => r.json()).then(d => { if (d.user) setUser(d.user) })
      }
    } else if (outcome === 'tie') {
      playOrderSound('loss')
      const amountDisplay = `${symbol} ${(trade.amount || 0).toFixed(2)}`
      if (!trade.isReal) setDemoBalanceUsd((prev: number) => prev + payoutUsd)
      else fetch('/api/auth/me').then(r => r.json()).then(d => { if (d.user) setUser(d.user) })
    } else {
      // Loss: stake already debited, payout = 0
      playOrderSound('loss')
      const lossDisplay = `-${symbol} ${(trade.amount || 0).toFixed(2)}`
      if (!trade.isReal) {
        // Demo: balance was pre-debited, nothing to add back
      } else {
        fetch('/api/auth/me').then(r => r.json()).then(d => { if (d.user) setUser(d.user) })
      }
    }

    const pnl = outcome === 'win' ? payout - trade.amount : outcome === 'tie' ? 0 : -trade.amount
    const pnlUsdForStats = activeCurrency === 'USD' ? pnl : pnl / conversionRate
    const stakeUsdForStats = trade.stakeUsd || 0

    if (trade.isReal) {
      // Re-fetch from DB so stats are accurate (server already settled the trade)
      fetch('/api/trade/stats').then(r => r.json()).then(d => { if (!d.error) setRealStats(d) }).catch(() => {})
    } else {
      // Demo: update local state and persist to localStorage
      setDemoStats(prev => {
        const next = {
          wins:           prev.wins   + (outcome === 'win' ? 1 : 0),
          losses:         prev.losses + (outcome === 'loss' ? 1 : 0),
          pnlUsd:         prev.pnlUsd + pnlUsdForStats,
          totalStakeUsd:  prev.totalStakeUsd + stakeUsdForStats,
        }
        try {
          localStorage.setItem(DEMO_STATS_KEY, JSON.stringify({ date: todayKey, stats: next }))
        } catch {}
        return next
      })
    }

    const resolvedTrade = { ...trade, outcome, payout, pnl, pairName, resolvedAt: Date.now() }
    setClosedTrades(prev => [resolvedTrade, ...prev].slice(0, 50))
    setActiveTrade(null)

    // Flash the closed card in the Open tab for 3 seconds
    setPositionsTab('open')
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
    setFlashTrade(resolvedTrade)
    flashTimerRef.current = setTimeout(() => setFlashTrade(null), 3000)

    // Auto-loop: check if we should fire the next trade
    const params = autoParamsRef.current
    if (params) {
      const pnlUsd = activeCurrency === 'USD' ? pnl : pnl / conversionRate
      autoSessionPnlRef.current += pnlUsd
      if (outcome === 'win') autoSessionTradesRef.current.wins++
      else if (outcome === 'loss') autoSessionTradesRef.current.losses++
      const sessionPnl = autoSessionPnlRef.current
      const { wins: sWins, losses: sLosses } = autoSessionTradesRef.current
      const hitProfit = sessionPnl >= params.targetProfit
      const hitLoss   = sessionPnl <= -params.targetLoss
      if (hitProfit || hitLoss) {
        // Target reached — stop loop and show modal
        const resultSnapshot = {
          type: hitProfit ? 'profit' as const : 'loss' as const,
          pnlUsd: sessionPnl,
          trades: sWins + sLosses,
          wins: sWins,
          losses: sLosses,
        }
        autoParamsRef.current = null
        setAutoRunning(false)
        setAutoDirection(null)
        autoSessionPnlRef.current = 0
        autoSessionTradesRef.current = { wins: 0, losses: 0 }
        setAutoStopResult(resultSnapshot)
      } else {
        // Apply Loss Multiple (martingale): multiply stake on loss, reset to base on win
        let nextAmount = params.currentAmount ?? params.amount
        if (outcome === 'loss' && params.lossMult > 1) {
          const maxStake = activeCurrency === 'USD'
            ? (settings?.max_stake_usd ?? 5000)
            : (settings?.max_stake_kes ?? 100000)
          nextAmount = Math.min(nextAmount * params.lossMult, maxStake)
        } else if (outcome === 'win') {
          nextAmount = params.amount // reset to original base stake
        }
        autoParamsRef.current = { ...params, currentAmount: nextAmount }

        // Fire next trade after a brief pause (let state settle)
        setTimeout(() => {
          if (autoParamsRef.current) {
            handleTradeRef.current?.(autoParamsRef.current.currentAmount ?? autoParamsRef.current.amount, autoParamsRef.current.direction, autoParamsRef.current.tradeType)
          }
        }, 500)
      }
    }
  }, [activeCurrency, conversionRate, symbol, pair])

  // Keep resolveTradeRef in sync so handleTick can call it
  useEffect(() => { resolveTradeRef.current = resolveTrade }, [resolveTrade])

  const getPayoutMultForType = (tradeType: string, direction: 'buy' | 'sell'): number => {
    if (tradeType === 'matches_differs') {
      return direction === 'buy' ? (settings?.payout_match ?? payoutMultiplier) : (settings?.payout_differ ?? payoutMultiplier)
    }
    if (tradeType === 'over_under') {
      return direction === 'buy' ? (settings?.payout_over ?? payoutMultiplier) : (settings?.payout_under ?? payoutMultiplier)
    }
    // even_odd (default)
    return settings?.payout_even_odd ?? payoutMultiplier
  }

  const handleStartAuto = (params: AutoParams) => {
    const initParams = { ...params, currentAmount: params.amount }
    autoParamsRef.current = initParams
    autoSessionPnlRef.current = 0
    autoSessionTradesRef.current = { wins: 0, losses: 0 }
    setAutoRunning(true)
    setAutoDirection(params.direction)
    handleTrade(params.amount, params.direction, params.tradeType)
  }

  const handleTrade = async (amount: number, direction: 'buy' | 'sell', tradeType = 'even_odd') => {
    // If trade is already active (use ref for accuracy inside auto-loop)
    if (activeTradeRef.current?.status === 'processing') {
      if (!autoParamsRef.current) toast.info('Wait till the trade completes processing')
      return
    }

    // Stake limit validation (client-side, mirrored from settings)
    const minStake = activeCurrency === 'USD' ? (settings?.min_stake_usd ?? 1) : (settings?.min_stake_kes ?? 50)
    const maxStake = activeCurrency === 'USD' ? (settings?.max_stake_usd ?? 5000) : (settings?.max_stake_kes ?? 100000)
    if (amount < minStake) return toast.error(`Minimum stake is ${symbol} ${minStake.toLocaleString()}`)
    if (amount > maxStake) return toast.error(`Maximum stake is ${symbol} ${maxStake.toLocaleString()}`)

    if (isDemoMode) {
      // ── Demo trade ────────────────────────────────────────────────
      const entrySnapshot = livePriceRef.current
      if (!entrySnapshot) return toast.error('Waiting for live price — try again in a moment')

      const balanceCurrent = demoBalanceUsd * (activeCurrency === 'USD' ? 1 : conversionRate)
      if (amount > balanceCurrent) return toast.error('Insufficient Demo Balance')

      const stakeUsd = activeCurrency === 'USD' ? amount : amount / conversionRate
      const payoutMult = getPayoutMultForType(tradeType, direction)
      setDemoBalanceUsd((prev: number) => prev - stakeUsd)
      const tradeId = Math.random().toString(36).substring(7)
      const tradeObj: any = { id: tradeId, amount, direction, tradeType, status: 'processing', startTime: Date.now(), entryPrice: entrySnapshot, pairId: pair?.id, pairName: pair?.display_name || pair?.symbol, payoutMult, stakeUsd, activeCurrency, conversionRate, isReal: false }
      ticksSinceTradeRef.current = 0
      activeTradeRef.current = tradeObj
      setActiveTrade(tradeObj)
      playOrderSound('open')

      try {
        const res = await fetch('/api/trade/demo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: stakeUsd, pairId: pair?.id, sessionId: tradeId, direction, entryPrice: entrySnapshot }),
        })
        const data = await res.json()
        const tradeTicks: number = data.tradeTicks ?? 2
        const duration = (data.duration || 10) * 1000
        const winTarget: boolean = data.winTarget ?? true
        const updatedTrade = { ...tradeObj, winTarget, tradeTicks }
        activeTradeRef.current = updatedTrade
        setActiveTrade(updatedTrade)

        // Fallback timer: resolve after duration if ticks don't fire (offline/slow stream)
        const fallbackTimer = setTimeout(() => {
          const outcome = winTarget ? 'win' : 'loss'
          const payoutUsd = winTarget ? stakeUsd * payoutMult : 0
          const payout = activeCurrency === 'USD' ? payoutUsd : payoutUsd * conversionRate
          resolveTrade(updatedTrade, outcome, payout)
        }, duration + 3000)
        // Store so resolve can clear it
        activeTradeRef.current = { ...updatedTrade, fallbackTimer }
      } catch {
        toast.error('Failed to process trade')
        activeTradeRef.current = null
        setActiveTrade(null)
        setDemoBalanceUsd((prev: number) => prev + stakeUsd)
      }

    } else {
      if (direction !== 'buy') {
        toast.info('YOU NEED TO BUY FIRST BEFORE YOU CAN SELL!')
        return
      }
      // ── Real trade ────────────────────────────────────────────────
      if (!user) return openAuth('login')

      const stakeUsd = activeCurrency === 'USD' ? amount : amount / conversionRate
      if (stakeUsd > (user?.balance_usd || 0)) return toast.error('Insufficient balance')

      const tempId = Math.random().toString(36).substring(7)
      const tradeObj: any = { id: tempId, amount, direction, tradeType, status: 'processing', startTime: Date.now(), entryPrice: livePrice, pairId: pair?.id, pairName: pair?.display_name || pair?.symbol, stakeUsd, activeCurrency, conversionRate, isReal: true }
      ticksSinceTradeRef.current = 0
      activeTradeRef.current = tradeObj
      setActiveTrade(tradeObj)
      playOrderSound('open')

      // Optimistically deduct balance
      setUser((prev: any) => ({ ...prev, balance_usd: (prev.balance_usd || 0) - stakeUsd }))

      try {
        const res = await fetch('/api/trade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: stakeUsd, direction: 'buy', pairId: pair.id }),
        })
        const data = await res.json()

        if (!res.ok) {
          toast.error(data.error || 'Trade failed')
          activeTradeRef.current = null
          setActiveTrade(null)
          setUser((prev: any) => ({ ...prev, balance_usd: (prev.balance_usd || 0) + stakeUsd }))
          return
        }

        const duration = (data.duration || 10) * 1000
        const tradeTicks: number = data.tradeTicks ?? 2
        const tradeId = data.tradeId
        const winTarget: boolean = data.isWin ?? true
        const serverPayoutMult = data.payoutMultiplier || getPayoutMultForType(tradeType, direction)
        const updatedTrade = { ...tradeObj, id: tradeId, winTarget, tradeTicks, payoutMult: serverPayoutMult }
        activeTradeRef.current = updatedTrade
        setActiveTrade(updatedTrade)

        // Fallback: poll DB after duration + buffer in case ticks don't fire
        const fallbackTimer = setTimeout(async () => {
          const pollResult = async (): Promise<{ outcome: string; payout: number } | null> => {
            const r = await fetch(`/api/trade/result?id=${tradeId}`).catch(() => null)
            if (!r?.ok) return null
            return r.json().catch(() => null)
          }
          let result = await pollResult()
          if (!result || result.outcome === 'pending') {
            await new Promise(r => setTimeout(r, 1500))
            result = await pollResult()
          }
          if (!result || result.outcome === 'pending') {
            await new Promise(r => setTimeout(r, 2000))
            result = await pollResult()
          }
          const outcome = result?.outcome || 'loss'
          const payoutDisplay = Number(result?.payout || 0) * (activeCurrency === 'USD' ? 1 : conversionRate)
          resolveTrade(updatedTrade, outcome, payoutDisplay)
        }, duration + 3000)
        activeTradeRef.current = { ...updatedTrade, fallbackTimer }
      } catch {
        toast.error('Network error placing trade')
        activeTradeRef.current = null
        setActiveTrade(null)
        setUser((prev: any) => ({ ...prev, balance_usd: (prev.balance_usd || 0) + stakeUsd }))
      }
    }
  }

  // Keep handleTradeRef in sync so resolveTrade's auto-loop can call it
  useEffect(() => { handleTradeRef.current = handleTrade }, [handleTrade])

  const realBalanceUsd = (user?.balance_usd || 0) - Number(user?.bonus_balance_usd || 0)
  const currentBalance = isDemoMode
    ? demoBalanceUsd * (activeCurrency === 'USD' ? 1 : conversionRate)
    : realBalanceUsd * (activeCurrency === 'USD' ? 1 : conversionRate)

  // Stats shown in the LIVE panel — real fetched from DB, demo from localStorage
  const sessionStats = isDemoMode ? demoStats : realStats

  const [positionsTab, setPositionsTab] = useState<'open' | 'closed' | 'transactions'>('open')
  const [pairDropdownOpen, setPairDropdownOpen] = useState(false)

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-[#0e1320]">
      <Header
        user={user}
        userLoading={userLoading}
        settings={settings}
        isDemoMode={isDemoMode}
        demoBalanceUsd={demoBalanceUsd}
        onToggleDemo={() => setDemoOverride(v => !v)}
        activeCurrency={activeCurrency}
        toggleCurrency={toggleCurrency}
        onLoginClick={() => openAuth('login')}
        onRegisterClick={() => openAuth('register')}
        onHowToTradeClick={() => setHowToTradeOpen(true)}
        onTopTradersClick={() => setDesktopTab('leaders')}
        onTournamentsClick={() => setDesktopTab('tournaments')}
        onLogout={async () => {
          await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
          setUser(null)
        }}
      />

      {/* ── MOBILE layout (hidden on md+) ── */}
      <div className="flex md:hidden flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 min-h-0 overflow-hidden relative">
          <div className={`absolute inset-0 overflow-y-auto ${mobileTab === 'trade' ? 'block' : 'hidden'}`}>
            <PairTicker pairs={pairs} selectedPairId={pair?.id} onSelect={setSelectedPairId} settings={settings} />
            <div className="h-[340px] w-full bg-[#0e1320] shrink-0 relative">
              <CandleChart key={pair?.id} ref={mobileChartRef} historicalCandles={historicalCandles}
                pairId={pair?.id} candleDuration={1}
                onTick={isMobile ? handleTick : undefined} streamUrl="/api/chart/stream"
                entryPrice={null} visibleCandles={25} loading={switching} />
              <DigitBar livePrice={livePrice} />
            </div>
            <div className="border-t border-[#1e2d40]">
              <TradingPanel balance={currentBalance} pair={pair} onTrade={handleTrade} onStartAuto={handleStartAuto}
                onStopTrade={() => { autoParamsRef.current = null; setAutoRunning(false); setAutoDirection(null); autoSessionPnlRef.current = 0; autoSessionTradesRef.current = { wins: 0, losses: 0 }; activeTradeRef.current = null; setActiveTrade(null) }}
                activeTrade={activeTrade} sessionStats={sessionStats}
                autoRunning={autoRunning} autoDirection={autoDirection}
                buyLabel={settings?.buy_button_label} sellLabel={settings?.sell_button_label}
                settings={{ ...settings, payout_multiplier: payoutMultiplier }}
                activeCurrency={activeCurrency} livePrice={livePrice}
                onScannerOpen={() => setScannerOpen(true)} />
            </div>
          </div>
          <div className={`absolute inset-0 ${mobileTab === 'chat' ? 'block' : 'hidden'}`}><LiveChat user={user} /></div>
          <div className={`absolute inset-0 ${mobileTab === 'leaders' ? 'block' : 'hidden'}`}><Leaderboard conversionRate={conversionRate} currency={activeCurrency} /></div>
          <div className={`absolute inset-0 ${mobileTab === 'tournaments' ? 'block' : 'hidden'}`}><Tournaments onBalanceDeducted={refreshUser} user={user} onLoginClick={() => openAuth('login')} /></div>
        </div>
        <div className="h-12 shrink-0 flex border-t border-[#1e2d40] bg-[#0e1320]">
          {[
            { id: 'trade', icon: BarChart2, label: 'Trade' },
            { id: 'chat', icon: MessageSquare, label: 'Chat' },
            { id: 'leaders', icon: Trophy, label: 'Top' },
            { id: 'tournaments', icon: Medal, label: 'Tours' },
          ].map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setMobileTab(id as any)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold uppercase tracking-wider transition-colors ${mobileTab === id ? 'text-[#22c55e] border-t-2 border-[#22c55e]' : 'text-gray-500'}`}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>
      </div>

      {/* ── DESKTOP layout ── */}
      <div className="hidden md:flex flex-1 flex-row min-h-0 overflow-hidden">

        {/* ── Narrow left sidebar: positions tabs + chart tools ── */}
        <div className="w-[280px] shrink-0 border-r border-[#1e2d40] flex flex-col bg-[#0b1019]">
          {/* Open / Closed / Transactions tabs */}
          <div className="flex border-b border-[#1e2d40]">
            {(['open', 'closed', 'transactions'] as const).map(t => (
              <button key={t} onClick={() => setPositionsTab(t)}
                className={`flex-1 py-2.5 text-[10px] font-semibold uppercase tracking-wider transition-colors capitalize ${positionsTab === t ? 'text-[#22c55e] border-b-2 border-[#22c55e]' : 'text-gray-500 hover:text-gray-300'}`}>
                {t === 'open' ? `Open (${activeTrade ? 1 : 0})` : t === 'closed' ? `Closed (${closedTrades.length})` : 'Txns'}
              </button>
            ))}
          </div>

          {/* Positions list area */}
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
            {positionsTab === 'open' && (
              <>
                {activeTrade
                  ? <TradeCard trade={activeTrade} symbol={symbol} isOpen />
                  : !flashTrade && (
                    <div className="flex-1 flex flex-col items-center justify-center gap-2 p-4 text-center">
                      <div className="w-10 h-10 rounded-full border-2 border-[#1e2d40] flex items-center justify-center">
                        <div className="w-3 h-3 rounded-full border-2 border-gray-600" />
                      </div>
                      <p className="text-xs text-gray-500 font-medium">No open positions</p>
                      <p className="text-[10px] text-gray-600">Your active trades will appear here</p>
                    </div>
                  )
                }
                {flashTrade && <TradeCard trade={flashTrade} symbol={symbol} isOpen={false} isFlash />}
              </>
            )}
            {positionsTab === 'closed' && (
              closedTrades.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 p-4 text-center">
                  <p className="text-xs text-gray-500 font-medium">No closed trades yet</p>
                </div>
              ) : (
                closedTrades.map((t, i) => <TradeCard key={i} trade={t} symbol={symbol} isOpen={false} />)
              )
            )}
            {positionsTab === 'transactions' && (
              closedTrades.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 p-4 text-center">
                  <p className="text-xs text-gray-500 font-medium">No transactions yet</p>
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-[#1e2d40]">
                  {closedTrades.map((t, i) => {
                    const isWin = t.outcome === 'win'
                    const isLoss = t.outcome === 'loss'
                    const pnl = isWin ? t.payout - t.amount : isLoss ? -t.amount : 0
                    const pnlStr = (pnl >= 0 ? '+' : '') + symbol + ' ' + Math.abs(pnl).toFixed(2)
                    return (
                      <div key={i} className="flex items-center justify-between px-3 py-2.5 hover:bg-[#1e2d40]/40 transition-colors">
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="text-[11px] font-semibold text-white truncate">{t.pairName || 'Unknown'}</span>
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${t.direction === 'buy' ? 'bg-[#22c55e]/15 text-[#22c55e]' : 'bg-[#ef4444]/15 text-[#ef4444]'}`}>
                              {t.tradeType || t.direction}
                            </span>
                            <span className="text-[10px] text-gray-500">{symbol} {(t.amount || 0).toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-0.5 shrink-0">
                          <span className={`text-[11px] font-bold ${isWin ? 'text-[#22c55e]' : isLoss ? 'text-[#ef4444]' : 'text-gray-400'}`}>
                            {pnlStr}
                          </span>
                          <span className={`text-[9px] font-semibold capitalize px-1.5 py-0.5 rounded ${isWin ? 'bg-[#22c55e]/10 text-[#22c55e]' : isLoss ? 'bg-[#ef4444]/10 text-[#ef4444]' : 'bg-gray-700 text-gray-400'}`}>
                            {t.outcome}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            )}
          </div>
        </div>

        {/* ── Centre: chart fills full column, overlays on top ── */}
        <div className="flex flex-col flex-1 min-w-0 min-h-0 bg-[#0e1320] relative overflow-hidden">
          {/* Chart — always mounted; blur overlay handled inside CandleChart */}
          <CandleChart key={pair?.id} ref={chartRef} historicalCandles={historicalCandles}
            pairId={pair?.id} candleDuration={1}
            onTick={isMobile ? undefined : handleTick} streamUrl="/api/chart/stream"
            entryPrice={null} visibleCandles={30} loading={switching} />
          <DigitBar livePrice={livePrice} />

          {/* Floating row: tools column + pair selector side by side */}
          <div className="absolute top-3 left-3 z-20" style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: '8px' }}>
            {/* Chart tool icons — vertical column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', position: 'relative', zIndex: 1 }}
              className="rounded-lg bg-[#0e1320]/90 border border-[#1e2d40] shadow-lg p-1">
              {[
                { icon: LineChart, title: 'Line' },
                { icon: BarChart2, title: 'Bar' },
                { icon: Tag, title: 'Labels' },
                { icon: Download, title: 'Download' },
              ].map(({ icon: Icon, title }) => (
                <button key={title} title={title}
                  className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-200 hover:bg-white/10 rounded-md transition-colors">
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>

            {/* Pair selector */}
            <div style={{ position: 'relative', zIndex: 1, flexShrink: 0 }}>
              <button
                onClick={() => setPairDropdownOpen(o => !o)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0e1320]/90 border border-[#1e2d40] hover:border-[#2a3a50] transition-colors shadow-lg"
              >
                <BarChart2 className="w-4 h-4 text-gray-400 shrink-0" />
                <div className="text-left">
                  <div className="text-sm font-bold text-white leading-none">{pair?.display_name || pair?.symbol || 'Select Pair'}</div>
                  <div className="text-[11px] leading-none mt-0.5 font-mono flex items-center gap-1.5">
                    {livePrice ? (
                      <span className="text-gray-300">{livePrice.toFixed(2)}</span>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                    {priceChange && (
                      <span className={priceChange.diff >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}>
                        {priceChange.diff >= 0 ? '+' : ''}{priceChange.diff.toFixed(2)} ({priceChange.diff >= 0 ? '+' : ''}{priceChange.pct.toFixed(2)}%)
                      </span>
                    )}
                  </div>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-500 ml-1 shrink-0 transition-transform ${pairDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {pairDropdownOpen && (
                <>
                  {/* Click-away backdrop */}
                  <div className="fixed inset-0 z-10" onClick={() => setPairDropdownOpen(false)} />
                  {/* Dropdown list */}
                  <div className="absolute top-full left-0 mt-1 z-20 min-w-[200px] rounded-lg bg-[#0b1019] border border-[#1e2d40] shadow-2xl overflow-hidden">
                    {pairs.map((p: any) => {
                      const isSelected = p.id === selectedPairId
                      return (
                        <button
                          key={p.id}
                          onClick={() => { setSelectedPairId(p.id); setPairDropdownOpen(false) }}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[#1e2d40] ${isSelected ? 'bg-[#1e2d40]' : ''}`}
                        >
                          <BarChart2 className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                          <span className={`text-sm font-semibold ${isSelected ? 'text-[#22c55e]' : 'text-white'}`}>
                            {p.display_name || p.symbol}
                          </span>
                          {isSelected && livePrice && (
                            <span className="ml-auto text-xs font-mono text-gray-400">{livePrice.toFixed(2)}</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Right panel: trading panel only ── */}
        <div className="w-[320px] shrink-0 border-l border-[#1e2d40] flex flex-col min-h-0 overflow-hidden">
          <TradingPanel
            balance={currentBalance}
            pair={pair}
            onTrade={handleTrade}
            onStartAuto={handleStartAuto}
            onStopTrade={() => { autoParamsRef.current = null; setAutoRunning(false); setAutoDirection(null); autoSessionPnlRef.current = 0; autoSessionTradesRef.current = { wins: 0, losses: 0 }; activeTradeRef.current = null; setActiveTrade(null) }}
            activeTrade={activeTrade}
            sessionStats={sessionStats}
            autoRunning={autoRunning}
            autoDirection={autoDirection}
            buyLabel={settings?.buy_button_label}
            sellLabel={settings?.sell_button_label}
            settings={{ ...settings, payout_multiplier: payoutMultiplier }}
            activeCurrency={activeCurrency}
            livePrice={livePrice}
            onScannerOpen={() => setScannerOpen(true)}
          />
        </div>
      </div>

      {scannerOpen && <EntryScanner pairs={pairs} onClose={() => setScannerOpen(false)} onSelect={(p: any) => { setSelectedPairId(p.id); setScannerOpen(false) }} />}

      <AuthModals isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)}
        initialMode={authMode} settings={settings}
        onSuccess={(u) => { setUser(u); setAuthModalOpen(false) }} />
      <HowToTradeModal isOpen={howToTradeOpen} onClose={() => setHowToTradeOpen(false)}
        steps={settings?.how_to_trade_steps || []} settings={settings} />
      <WinningToast siteName={settings?.site_name || 'BetaBinary'} />
      {autoStopResult && (
        <AutoStopModal
          result={autoStopResult}
          onClose={() => setAutoStopResult(null)}
        />
      )}

      {settings?.whatsapp_community_url && (
        <a href={settings.whatsapp_community_url} target="_blank" rel="noopener noreferrer"
          className="fixed bottom-20 md:bottom-6 right-4 z-50 flex items-center gap-2.5 bg-[#25D366] hover:bg-[#20b858] text-white font-bold text-xs rounded-full shadow-lg transition-all hover:scale-110 active:scale-95 pl-3.5 pr-4 py-2.5"
          style={{ animation: 'whatsapp-bounce 3s ease-in-out infinite' }}>
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white shrink-0">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          <span className="hidden sm:inline whitespace-nowrap">Join Community</span>
        </a>
      )}
    </div>
  )
}
