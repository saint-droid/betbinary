'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronDown, Info, Target, AlertTriangle, TrendingDown, Minus, Plus, Cpu } from 'lucide-react'

interface SessionStats {
  wins: number
  losses: number
  pnlUsd: number
  totalStakeUsd: number
}

interface TradingPanelProps {
  balance: number
  pair: any
  onTrade: (amount: number, direction: 'buy' | 'sell', tradeType: string) => void
  onStartAuto: (params: AutoParams) => void
  onStopTrade?: () => void
  activeTrade: any | null
  autoRunning?: boolean
  autoDirection?: 'buy' | 'sell' | null
  sessionStats?: SessionStats | null
  buyLabel?: string
  sellLabel?: string
  settings?: any
  activeCurrency?: string
  livePrice?: number | null
  onScannerOpen?: () => void
}

export interface AutoParams {
  amount: number        // original base stake (used to reset after a win)
  currentAmount?: number // current stake, adjusted by loss multiple
  direction: 'buy' | 'sell'
  tradeType: string
  targetProfit: number
  targetLoss: number
  lossMult: number
}

const TRADE_TYPES = [
  { id: 'even_odd',        label: 'Even/Odd',        iconGreen: '⊞', iconRed: '△' },
  { id: 'matches_differs', label: 'Matches/Differs',  iconGreen: '◎', iconRed: '✕' },
  { id: 'over_under',      label: 'Over/Under',       iconGreen: '↑', iconRed: '↓' },
]

export default function TradingPanel({
  balance, pair, onTrade, onStartAuto, onStopTrade, activeTrade,
  autoRunning = false, autoDirection = null,
  sessionStats = null,
  settings, activeCurrency = 'USD', livePrice, onScannerOpen,
}: TradingPanelProps) {
  const [tradeTypeOpen, setTradeTypeOpen]   = useState(false)
  const [selectedType, setSelectedType]     = useState(TRADE_TYPES[0])
  const [tradeMode, setTradeMode]           = useState<'auto' | 'manual'>('auto')
  const [stakeTab, setStakeTab]             = useState<'stake' | 'payout'>('stake')
  const [amount, setAmount]                 = useState<string>('5')
  const [targetProfit, setTargetProfit]     = useState<string>('50')
  const [targetLoss, setTargetLoss]         = useState<string>('99')
  const [lossMult, setLossMult]             = useState<string>('2')
  const [selectedDigit, setSelectedDigit]   = useState<number>(5)

  const numAmount = parseFloat(amount) || 0

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (activeTrade?.status === 'processing' && activeTrade.startTime) {
      const duration = settings?.trade_duration_seconds || 10
      const tick = () => {
        const elapsed = (Date.now() - activeTrade.startTime) / 1000
        setSecondsLeft(Math.max(0, Math.ceil(duration - elapsed)))
      }
      tick()
      timerRef.current = setInterval(tick, 250)
    } else {
      setSecondsLeft(null)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [activeTrade?.status, activeTrade?.startTime, settings?.trade_duration_seconds])

  const isInPosition = activeTrade?.status === 'processing'
  const symbol = activeCurrency === 'USD' ? '$' : 'KSh'
  const conversionRate = settings?.conversion_rate || 129

  // Per-trade-type payout multipliers
  const payoutByType: Record<string, { buy: number; sell: number }> = {
    even_odd:        { buy: settings?.payout_even_odd ?? 1.9522, sell: settings?.payout_even_odd ?? 1.9522 },
    matches_differs: { buy: settings?.payout_match   ?? 9.50,   sell: settings?.payout_differ  ?? 1.0556 },
    over_under:      { buy: settings?.payout_over    ?? 2.375,  sell: settings?.payout_under   ?? 1.90   },
  }
  const currentPayout = payoutByType[selectedType.id] ?? { buy: 1.8, sell: 1.8 }
  const payoutPct = (dir: 'buy' | 'sell') => Math.round((currentPayout[dir] - 1) * 10000) / 100

  const minStakeDisplay = activeCurrency === 'USD'
    ? (settings?.min_stake_usd ?? 1)
    : (settings?.min_stake_kes ?? 50)
  const maxStakeDisplay = activeCurrency === 'USD'
    ? (settings?.max_stake_usd ?? 5000)
    : (settings?.max_stake_kes ?? 100000)

  const hasInsufficientBalance = numAmount > balance
  const belowMin = numAmount < minStakeDisplay && numAmount > 0
  const aboveMax = numAmount > maxStakeDisplay
  const canTrade = !belowMin && !aboveMax && !hasInsufficientBalance && numAmount > 0

  const needsDigit = selectedType.id === 'matches_differs' || selectedType.id === 'over_under'

  // Derived payout amounts for display
  const payoutAmountBuy  = (numAmount * currentPayout.buy).toFixed(2)
  const payoutAmountSell = (numAmount * currentPayout.sell).toFixed(2)

  const adjustAmount = (delta: number) => {
    const step = activeCurrency === 'USD' ? 1 : 50
    setAmount(v => String(Math.max(minStakeDisplay, (parseFloat(v) || 0) + delta * step)))
  }

  const handleBuy = () => {
    if (tradeMode === 'auto') {
      onStartAuto({
        amount: numAmount,
        direction: 'buy',
        tradeType: selectedType.id,
        targetProfit: parseFloat(targetProfit) || 200,
        targetLoss: parseFloat(targetLoss) || 999,
        lossMult: parseFloat(lossMult) || 2,
      })
    } else {
      onTrade(numAmount, 'buy', selectedType.id)
    }
  }

  const handleSell = () => {
    if (tradeMode === 'auto') {
      onStartAuto({
        amount: numAmount,
        direction: 'sell',
        tradeType: selectedType.id,
        targetProfit: parseFloat(targetProfit) || 200,
        targetLoss: parseFloat(targetLoss) || 999,
        lossMult: parseFloat(lossMult) || 2,
      })
    } else {
      onTrade(numAmount, 'sell', selectedType.id)
    }
  }

  // Label helpers for the two directions
  const buyLabel  = selectedType.id === 'over_under' ? 'Over'  : selectedType.id === 'matches_differs' ? 'Match'  : 'Even'
  const sellLabel = selectedType.id === 'over_under' ? 'Under' : selectedType.id === 'matches_differs' ? 'Differ' : 'Odd'
  const buyIcon   = selectedType.iconGreen
  const sellIcon  = selectedType.iconRed
  const buyExtra  = needsDigit ? (selectedType.id === 'over_under' ? `> ${selectedDigit}` : ``) : undefined
  const sellExtra = needsDigit ? (selectedType.id === 'over_under' ? `< ${selectedDigit}` : ``)   : undefined

  // Derive button states
  // isInPosition = a trade is processing right now
  // autoRunning  = auto loop is active (may or may not have a trade in-flight)
  const buyActive  = isInPosition && (autoDirection === 'buy'  || (autoDirection == null && activeTrade?.direction === 'buy'))
  const sellActive = isInPosition && (autoDirection === 'sell' || (autoDirection == null && activeTrade?.direction === 'sell'))
  const anyActive  = isInPosition || autoRunning

  return (
    <div className="flex flex-col h-full bg-[#0e1320] min-h-0">

      {/* ── Scrollable top section ── */}
      <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">

        {/* Learn */}
        <div className="px-4 sm:py-2.5 py-1.5 border-b border-[#1e2d40] sm:flex hidden items-center gap-2 text-xs text-gray-400 shrink-0">
          <Info className="w-3.5 h-3.5 text-[#22c55e] shrink-0" />
          <span>Learn about this trade type</span>
        </div>

        {/* Trade type selector */}
        <div className="sm:px-0 px-0 sm:py-0 py-0 sm:border-b border-[#1e2d40] shrink-0">
          <div className="relative">
            <button
              disabled={anyActive}
              onClick={() => setTradeTypeOpen(v => !v)}
              className="w-full flex items-center justify-between px-3 py-2.5 sm:rounded-none rounded-none bg-[#151c2c] border-none  border-[#1e2d40] hover:border-[#2a3a50] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-[#22c55e] text-sm">{selectedType.iconGreen}</span>
                <span className="text-[#ef4444] text-sm">{selectedType.iconRed}</span>
                <span className="text-white text-sm font-medium">{selectedType.label}</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${tradeTypeOpen ? 'rotate-180' : ''}`} />
            </button>
            {tradeTypeOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#151c2c] border border-[#1e2d40] rounded-lg overflow-hidden z-30 shadow-xl">
                {TRADE_TYPES.map(type => (
                  <button key={type.id}
                    onClick={() => { setSelectedType(type); setTradeTypeOpen(false) }}
                    className={`w-full flex items-center gap-3 px-3 py-3 hover:bg-[#1e2d40] transition-colors text-left ${selectedType.id === type.id ? 'bg-[#1e2d40]' : ''}`}
                  >
                    <span className="text-[#22c55e] text-sm">{type.iconGreen}</span>
                    <span className="text-[#ef4444] text-sm">{type.iconRed}</span>
                    <span className="text-sm text-white">{type.label}</span>
                    {selectedType.id === type.id && <div className="ml-auto w-2 h-2 rounded-full bg-[#22c55e]" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Trade Mode */}
        <div className="sm:px-4 px-1.5 sm:py-3 py-1.5 sm:border-b border-[#1e2d40] shrink-0">
          <div className="sm:flex hidden items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Trade Mode</span>
            <span className="text-[10px] text-gray-500">{tradeMode === 'auto' ? 'Runs until target hit' : 'One trade per click'}</span>
          </div>
          <div className="grid grid-cols-2 bg-[#151c2c] sm:rounded-md rounded-md p-1 border border-[#1e2d40]">
            {(['auto', 'manual'] as const).map(m => (
              <button key={m}
                disabled={anyActive}
                onClick={() => setTradeMode(m)}
                className={`sm:py-1 py-1  sm:rounded-md rounded-md text-sm font-semibold transition-all disabled:cursor-not-allowed ${tradeMode === m ? 'bg-[#252D3D] text-white shadow-md' : 'text-gray-400 hover:text-white'}`}>
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Auto mode fields */}
        {tradeMode === 'auto' && (
          <div className="sm:px-4 px-1.5 sm:py-3 py-1.5 border-b border-[#1e2d40] shrink-0">
            {/* Mobile: horizontal */}
            <div className="flex gap-2 sm:hidden">
              {[
                { icon: <Target className="w-3 h-3 text-[#22c55e]" />, label: 'Profit', value: targetProfit, set: setTargetProfit, prefix: '$' },
                { icon: <AlertTriangle className="w-3 h-3 text-[#ef4444]" />, label: 'Loss', value: targetLoss, set: setTargetLoss, prefix: '$' },
                { icon: <TrendingDown className="w-3 h-3 text-amber-400" />, label: 'Loss Multiplier', value: lossMult, set: setLossMult, prefix: '×' },
              ].map(({ icon, label, value, set, prefix }) => (
                <div key={label} className="flex-1 flex flex-col gap-1">
                  <div className="flex items-center gap-1">
                    {icon}
                    <span className="text-[10px] text-gray-400 font-medium">{prefix} {label}</span>
                  </div>
                  <input type="number" value={value} onChange={e => set(e.target.value)}
                    disabled={anyActive}
                    className="w-full bg-[#151c2c] border border-[#1e2d40] rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-[#22c55e]/50 transition-colors disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                </div>
              ))}
            </div>
            {/* Desktop: horizontal row */}
            <div className="hidden sm:flex gap-2">
              {[
                { icon: <Target className="w-3 h-3 text-[#22c55e]" />, label: 'Profit', value: targetProfit, set: setTargetProfit, prefix: '$' },
                { icon: <AlertTriangle className="w-3 h-3 text-[#ef4444]" />, label: 'Loss', value: targetLoss, set: setTargetLoss, prefix: '$' },
                { icon: <TrendingDown className="w-3 h-3 text-amber-400" />, label: 'Loss Mult', value: lossMult, set: setLossMult, prefix: '×' },
              ].map(({ icon, label, value, set, prefix }) => (
                <div key={label} className="flex-1 flex flex-col gap-1">
                  <div className="flex items-center gap-1">
                    {icon}
                    <span className="text-[10px] text-gray-400 font-medium">{prefix} {label}</span>
                  </div>
                  <input type="number" value={value} onChange={e => set(e.target.value)}
                    disabled={anyActive}
                    className="w-full bg-[#151c2c] border border-[#1e2d40] rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-[#22c55e]/50 transition-colors disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stake / Payout tabs + amount row */}
        <div className="sm:px-4 px-1.5 sm:py-3 py-1.5 sm:border-b border-[#1e2d40] shrink-0">
          <div className="hidden sm:grid grid-cols-2 gap-1 mb-3 bg-[#151c2c] rounded-md p-1">
            {(['stake', 'payout'] as const).map(t => (
              <button key={t} onClick={() => setStakeTab(t)}
                className={`py-1 rounded-md text-sm font-semibold transition-colors ${stakeTab === t ? 'bg-[#1e2d40] text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* − amount + currency | AI Scanner */}
          <div className="flex items-center gap-2">
            <div className="flex items-center flex-1 bg-[#151c2c] border border-[#1e2d40] rounded-lg overflow-hidden">
              <button onClick={() => adjustAmount(-1)} disabled={anyActive}
                className="px-3 py-3 text-gray-400 hover:text-white hover:bg-[#1e2d40] transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed">
                <Minus className="w-3.5 h-3.5" />
              </button>
              <div className="flex items-center flex-1 px-1">
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                  disabled={anyActive}
                  className={`flex-1 bg-transparent text-white text-base font-bold focus:outline-none text-center w-0 disabled:opacity-70 ${!canTrade && numAmount > 0 ? 'text-[#ef4444]' : ''}`} />
                <span className="text-gray-400 text-xs font-semibold shrink-0 mr-1">{activeCurrency}</span>
              </div>
              <button onClick={() => adjustAmount(1)} disabled={anyActive}
                className="px-3 py-3 text-gray-400 hover:text-white hover:bg-[#1e2d40] transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* AI Scanner */}
            <button onClick={onScannerOpen} className="flex flex-col items-center justify-center px-3 sm:py-1.5 py-1 rounded-lg bg-[#1e1040] border border-[#4f46e5]/40 hover:border-[#4f46e5] transition-colors shrink-0 gap-0.5">
              <div className="flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5 text-[#818cf8]" />
                <span className="text-xs font-bold text-[#818cf8]">AI</span>
              </div>
              <span className="text-[9px] text-[#818cf8]/70 leading-none">Scanner</span>
            </button>
          </div>

          {/* Validation hint */}
          <div className="mt-1.5 text-[11px]">
            {belowMin ? <span className="text-[#ef4444]">Min: {symbol} {minStakeDisplay.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              : aboveMax ? <span className="text-[#ef4444]">Max: {symbol} {maxStakeDisplay.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              : hasInsufficientBalance ? <span className="text-[#ef4444]">Insufficient balance</span>
              : <span className="text-gray-500">Min: {symbol} {minStakeDisplay.toLocaleString(undefined, { maximumFractionDigits: 2 })} — Max: {symbol} {maxStakeDisplay.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>}
          </div>
        </div>

        {/* Last Digit Prediction — Matches/Differs & Over/Under only */}
        {needsDigit && (
          <div className="sm:px-4 px-1.5 sm:py-3 py-1.5 border-none border-[#1e2d40] shrink-0">
            <p className="sm:flex hidden text-xs text-gray-400 font-semibold mb-2.5 uppercase tracking-wider">Last Digit Prediction</p>
            <div className="grid grid-cols-10 gap-1">
              {[0,1,2,3,4,5,6,7,8,9].map(d => (
                <button key={d} onClick={() => setSelectedDigit(d)} disabled={anyActive}
                  className={`py-1.5 rounded-md text-xs font-bold transition-colors disabled:cursor-not-allowed ${selectedDigit === d ? 'bg-[#22c55e] text-black' : 'bg-[#151c2c] text-gray-300 hover:bg-[#1e2d40] border border-[#1e2d40]'}`}>
                  {d}
                </button>
              ))}
            </div>
          </div>
        )}

      </div>{/* end scrollable */}

      {/* ── Trade buttons — pinned at bottom ── */}
      <div className="sm:px-4 px-1.5 pb-4 pt-3 space-y-2 border-t border-[#1e2d40] shrink-0 bg-[#0e1320]">

        {/* Payout display */}
        <div className="py-1 text-xs text-gray-400 sm:flex hidden justify-between">
          <span>Payout</span>
          <span className="text-white font-semibold">{symbol} {payoutAmountBuy}</span>
        </div>

        {/* LIVE session stats */}
        {sessionStats && (sessionStats.wins > 0 || sessionStats.losses > 0) && (
          <div className="rounded-md bg-[#151c2c] border border-[#1e2d40] px-2 py-1">
            <div className="flex items-center justify-between mb-0">
              <span className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-300">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse inline-block" />
                TODAY · {sessionStats.wins}W · {sessionStats.losses}L
              </span>
              <span className={`text-xs font-bold ${sessionStats.pnlUsd >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                {sessionStats.pnlUsd >= 0 ? '+' : ''}${sessionStats.pnlUsd.toFixed(2)}
              </span>
            </div>
            {/* <div className="text-[10px] text-gray-500">Stake <span className="text-gray-400">${sessionStats.totalStakeUsd.toFixed(2)}</span></div> */}
          </div>
        )}

        {/* Trade buttons */}
        <div className="flex sm:flex-col flex-row gap-2">
          <BuyButton
            label={buyLabel} icon={buyIcon} pct={payoutPct('buy')} payoutAmt={payoutAmountBuy} symbol={symbol}
            showPayout={stakeTab === 'payout'} extra={buyExtra}
            disabled={!canTrade || (anyActive && !buyActive)}
            processing={buyActive}
            isStop={tradeMode === 'auto' && autoRunning && autoDirection === 'buy'}
            onStop={onStopTrade}
            onClick={handleBuy}
          />
          <SellButton
            label={sellLabel} icon={sellIcon} pct={payoutPct('sell')} payoutAmt={payoutAmountSell} symbol={symbol}
            showPayout={stakeTab === 'payout'} extra={sellExtra}
            disabled={!canTrade || (anyActive && !sellActive)}
            processing={sellActive}
            isStop={tradeMode === 'auto' && autoRunning && autoDirection === 'sell'}
            onStop={onStopTrade}
            onClick={handleSell}
          />
        </div>
      </div>
    </div>
  )
}

// ── Green (Buy) button ─────────────────────────────────────────────────────────
function BuyButton({ label, icon, pct, payoutAmt, symbol, showPayout, extra, disabled, processing, isStop, onStop, onClick }: {
  label: string; icon: string; pct: number; payoutAmt: string; symbol: string
  showPayout: boolean; extra?: string
  disabled: boolean; processing: boolean; isStop: boolean
  onStop?: () => void; onClick: () => void
}) {
  if (isStop) {
    return (
      <button onClick={onStop}
        className="w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest bg-amber-500 hover:bg-amber-400 text-black transition-colors flex items-center justify-center gap-2">
        <span className="w-3 h-3 rounded-sm bg-black/30 inline-block" />
        STOP
      </button>
    )
  }
  if (processing) {
    return (
      <button disabled
        className="w-full rounded-xl overflow-hidden opacity-80 cursor-not-allowed">
        <div className="rounded-xl p-3 bg-[#0a1f14] border border-[#22c55e]/60">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#22c55e]">{icon}</span>
              <span className="text-sm font-bold text-white">Processing…</span>
            </div>
            <div className="w-4 h-4 border-2 border-[#22c55e]/40 border-t-[#22c55e] rounded-full animate-spin" />
          </div>
          <div className="w-full h-1.5 rounded-full overflow-hidden bg-[#0d2a1a]">
            <div className="h-full rounded-full bg-[#22c55e] animate-pulse" style={{ width: '60%' }} />
          </div>
        </div>
      </button>
    )
  }
  return (
    <button disabled={disabled} onClick={onClick}
      className="w-full rounded-xl overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-[1.01] active:scale-[0.99] group">
      <div className="rounded-xl p-3 transition-colors bg-[#0a1f14] border border-[#22c55e]/30 group-hover:border-[#22c55e]/60">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#22c55e]">{icon}</span>
            <span className="text-sm font-bold text-white">{label}</span>
            {extra && <span className="text-[10px] text-gray-500 font-mono bg-[#1e2d40] px-1.5 py-0.5 rounded">{extra}</span>}
          </div>
          <div className="text-right">
            {showPayout && <div className="text-[10px] text-gray-400 leading-none">Payout {symbol} {payoutAmt}</div>}
            <span className="text-sm font-black text-[#22c55e]">{pct}%</span>
          </div>
        </div>
        <div className="w-full h-1.5 rounded-full overflow-hidden bg-[#0d2a1a]">
          <div className="h-full rounded-full bg-[#22c55e]" style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
      </div>
    </button>
  )
}

// ── Red (Sell) button ──────────────────────────────────────────────────────────
function SellButton({ label, icon, pct, payoutAmt, symbol, showPayout, extra, disabled, processing, isStop, onStop, onClick }: {
  label: string; icon: string; pct: number; payoutAmt: string; symbol: string
  showPayout: boolean; extra?: string
  disabled: boolean; processing: boolean; isStop: boolean
  onStop?: () => void; onClick: () => void
}) {
  if (isStop) {
    return (
      <button onClick={onStop}
        className="w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest bg-amber-500 hover:bg-amber-400 text-black transition-colors flex items-center justify-center gap-2">
        <span className="w-3 h-3 rounded-sm bg-black/30 inline-block" />
        STOP
      </button>
    )
  }
  if (processing) {
    return (
      <button disabled
        className="w-full rounded-xl overflow-hidden opacity-80 cursor-not-allowed">
        <div className="rounded-xl p-3 bg-[#1f0a0a] border border-[#ef4444]/60">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#ef4444]">{icon}</span>
              <span className="text-sm font-bold text-white">Processing…</span>
            </div>
            <div className="w-4 h-4 border-2 border-[#ef4444]/40 border-t-[#ef4444] rounded-full animate-spin" />
          </div>
          <div className="w-full h-1.5 rounded-full overflow-hidden bg-[#2a0d0d]">
            <div className="h-full rounded-full bg-[#ef4444] animate-pulse" style={{ width: '60%' }} />
          </div>
        </div>
      </button>
    )
  }
  return (
    <button disabled={disabled} onClick={onClick}
      className="w-full rounded-xl overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-[1.01] active:scale-[0.99] group">
      <div className="rounded-xl p-3 transition-colors bg-[#1f0a0a] border border-[#ef4444]/30 group-hover:border-[#ef4444]/60">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#ef4444]">{icon}</span>
            <span className="text-sm font-bold text-white">{label}</span>
            {extra && <span className="text-[10px] text-gray-500 font-mono bg-[#1e2d40] px-1.5 py-0.5 rounded">{extra}</span>}
          </div>
          <div className="text-right">
            {showPayout && <div className="text-[10px] text-gray-400 leading-none">Payout {symbol} {payoutAmt}</div>}
            <span className="text-sm font-black text-[#ef4444]">{pct}%</span>
          </div>
        </div>
        <div className="w-full h-1.5 rounded-full overflow-hidden bg-[#2a0d0d]">
          <div className="h-full rounded-full bg-[#ef4444]" style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
      </div>
    </button>
  )
}
