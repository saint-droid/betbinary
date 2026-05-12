'use client'

import { useEffect, useState } from 'react'

const PERIODS = [
  { key: 'today',      label: 'Today' },
  { key: 'yesterday',  label: 'Yesterday' },
  { key: 'this_week',  label: 'This Week' },
  { key: 'last_week',  label: 'Last Week' },
  { key: 'this_month', label: 'This Month' },
  { key: 'this_year',  label: 'This Year' },
]

interface MarketingData {
  display_total_kes: number
  your_earnings_kes: number
  commission_display_pct: number
  count: number
  site_name: string
  period: string
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)
}

function AnimatedNumber({ value, loading }: { value: number; loading: boolean }) {
  const [displayed, setDisplayed] = useState(0)

  useEffect(() => {
    if (loading) return
    const start = Date.now()
    const duration = 1200
    const from = 0
    const to = value
    const tick = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 4)
      setDisplayed(Math.floor(from + (to - from) * eased))
      if (progress < 1) requestAnimationFrame(tick)
      else setDisplayed(to)
    }
    requestAnimationFrame(tick)
  }, [value, loading])

  return <>{fmt(displayed)}</>
}

export default function MarketingPage() {
  const [period, setPeriod] = useState('today')
  const [data, setData] = useState<MarketingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [animKey, setAnimKey] = useState(0)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/marketing/deposits?period=${period}`)
      .then(r => r.json())
      .then(d => {
        setData(d)
        setAnimKey(k => k + 1)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [period])

  const periodLabel = PERIODS.find(p => p.key === period)?.label ?? ''

  return (
    <div className="min-h-screen bg-[#030712] text-white flex flex-col">

      {/* Ambient glow background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[20%] w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[10%] w-[400px] h-[400px] bg-emerald-700/8 rounded-full blur-[100px]" />
      </div>

      <div className="relative flex flex-col min-h-screen">

        {/* Header */}
        <header className="flex items-center justify-between px-6 py-5 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <span className="sm:font-extrabold font-bold uppercase sm:text-lg text-white/80">
              {data?.site_name ?? 'Affiliate Portal'}
            </span>
          </div>
          <span className="text-xs text-white/30 font-mono">MARKETER DASHBOARD</span>
        </header>

        {/* Main */}
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-10 gap-10">

          {/* Period selector */}
          <div className="flex flex-wrap gap-2 justify-center">
            {PERIODS.map(p => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                  period === p.key
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                    : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80 border border-white/5'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Cards grid */}
          <div className="w-full max-w-2xl space-y-4">

            {/* Total deposits card */}
            <div className="rounded-2xl border border-white/8 bg-white/3 backdrop-blur-sm p-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="text-xs uppercase tracking-widest text-white/40 font-medium mb-1">Total Platform Deposits</p>
                  <p className="text-white/30 text-xs">{periodLabel}</p>
                </div>
                <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  <span className="text-emerald-400 text-xs font-medium">Live</span>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center gap-3">
                  <div className="h-12 w-64 bg-white/5 rounded-xl animate-pulse" />
                </div>
              ) : (
                <div className="flex items-baseline gap-3">
                  <span className="text-white/40 text-2xl font-light">KES</span>
                  <span className="text-5xl font-bold tracking-tight text-white">
                    <AnimatedNumber key={`total-${animKey}`} value={data?.display_total_kes ?? 0} loading={loading} />
                  </span>
                </div>
              )}

              <p className="mt-4 text-white/25 text-xs">
                {loading ? '—' : `${data?.count ?? 0} successful M-Pesa transactions`}
              </p>
            </div>

            {/* Your earnings card */}
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-8 relative overflow-hidden">
              {/* Subtle shine */}
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/5 to-transparent pointer-events-none" />

              <div className="relative">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-xs uppercase tracking-widest text-emerald-400/70 font-medium">Your Earnings</p>
                  <span className="text-emerald-300 text-sm font-bold bg-emerald-500/15 border border-emerald-500/25 px-2.5 py-0.5 rounded-full">
                    {data?.commission_display_pct ?? 50}% of deposits
                  </span>
                </div>

                <p className="text-white/40 text-xs mb-6">{periodLabel} · paid on verified deposits</p>

                {loading ? (
                  <div className="h-14 w-48 bg-emerald-500/10 rounded-xl animate-pulse" />
                ) : (
                  <div className="flex items-baseline gap-3">
                    <span className="text-emerald-400/60 text-2xl font-light">KES</span>
                    <span className="text-5xl font-bold tracking-tight text-emerald-300">
                      <AnimatedNumber key={`earn-${animKey}`} value={data?.your_earnings_kes ?? 0} loading={loading} />
                    </span>
                  </div>
                )}

                <div className="mt-6 pt-5 border-t border-emerald-500/10">
                  <p className="text-white/35 text-xs leading-relaxed">
                    You earn <span className="text-emerald-400 font-semibold">{data?.commission_display_pct ?? 50}%</span> on every deposit
                    your referred clients make. Earnings are calculated on total verified M-Pesa deposits
                    for the selected period and paid directly to your account.
                  </p>
                </div>
              </div>
            </div>

            {/* How it works strip */}
            <div className="rounded-xl border border-white/5 bg-white/2 px-6 py-4 flex items-center gap-4">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-white/30 text-xs leading-relaxed">
                Earnings is calculated from total deposits made by clients you referred during the selected period.
                Share your referral link, grow your network, and earn every time a client deposits.
              </p>
            </div>

          </div>
        </main>

        {/* Footer */}
        <footer className="px-6 py-4 border-t border-white/5 flex items-center justify-between">
          <span className="text-white/15 text-xs">{data?.site_name ?? ''} · Affiliate Programme</span>
          <span className="text-white/15 text-xs font-mono">
            {new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </footer>
      </div>
    </div>
  )
}
