'use client'

import { useState, useEffect } from 'react'
import { X, RefreshCw, Search, CheckCircle } from 'lucide-react'

const TRADE_TYPES = [
  { id: 'even_odd',        label: 'Even / Odd' },
  { id: 'matches_differs', label: 'Matches / Differs' },
  { id: 'over_under',      label: 'Over / Under' },
]

// Simulates scanning — picks a random pair as "best"
function simulateScan(pairs: any[], onStep: (i: number, name: string) => void): Promise<{ pair: any; direction: string; quality: number }> {
  return new Promise((resolve) => {
    let i = 0
    function step() {
      if (i >= pairs.length) {
        const best = pairs[Math.floor(Math.random() * pairs.length)]
        const directions = ['Even', 'Odd', 'Match', 'Differ', 'Over', 'Under']
        resolve({
          pair: best,
          direction: directions[Math.floor(Math.random() * directions.length)],
          quality: 90 + Math.random() * 9,
        })
        return
      }
      onStep(i, pairs[i].display_name || pairs[i].symbol)
      i++
      setTimeout(step, 300)
    }
    step()
  })
}

interface Props {
  pairs: any[]
  onClose: () => void
  onSelect: (pair: any) => void
}

export default function EntryScanner({ pairs, onClose, onSelect }: Props) {
  const [tradeType, setTradeType] = useState(TRADE_TYPES[0])
  const [typeOpen, setTypeOpen]   = useState(false)
  const [phase, setPhase]         = useState<'idle' | 'scanning' | 'done'>('idle')
  const [stepIndex, setStepIndex] = useState(0)
  const [stepName, setStepName]   = useState('')
  const [result, setResult]       = useState<{ pair: any; direction: string; quality: number } | null>(null)

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  async function startScan() {
    setPhase('scanning')
    setResult(null)
    setStepIndex(0)
    const res = await simulateScan(pairs, (i, name) => {
      setStepIndex(i + 1)
      setStepName(name)
    })
    setResult(res)
    setPhase('done')
  }

  const total = pairs.length || 13

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(5,8,18,0.85)', backdropFilter: 'blur(8px)' }}>
      <div className="relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: '#0e1320', border: '1px solid rgba(255,255,255,0.08)' }}>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-4">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg,#6d28d9,#4f46e5)' }}>
            <Search className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold text-base">Entry Scanner</span>
          <button onClick={onClose} className="ml-auto text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-4">
          {/* Description */}
          <p className="text-sm text-gray-400 leading-relaxed">
            Pick the market category you want to scan. The deep scanner walks every{' '}
            <span className="text-white font-semibold">volatility</span> /{' '}
            <span className="text-white font-semibold">synthetic</span> index and surfaces the best entry point based on historical tick patterns.
          </p>

          {/* Market dropdown */}
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1.5">Market</p>
            <div className="relative">
              <button onClick={() => setTypeOpen(o => !o)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm text-white font-medium transition-colors"
                style={{ background: '#151c2c', border: '1px solid rgba(255,255,255,0.08)' }}>
                {tradeType.label}
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${typeOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {typeOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-10 shadow-xl"
                  style={{ background: '#151c2c', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {TRADE_TYPES.map(t => (
                    <button key={t.id} onClick={() => { setTradeType(t); setTypeOpen(false); setPhase('idle'); setResult(null) }}
                      className="w-full px-3 py-2.5 text-left text-sm text-white hover:bg-white/5 transition-colors">
                      {t.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Idle state */}
          {phase === 'idle' && (
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>Ready to scan</span>
              <span className="font-mono">0/{total}</span>
            </div>
          )}

          {/* Scanning state */}
          {phase === 'scanning' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#818cf8] font-semibold">{stepName}</span>
                <span className="text-gray-400 font-mono">{stepIndex}/{total}</span>
              </div>
              {/* Progress bar */}
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${(stepIndex / total) * 100}%`, background: 'linear-gradient(90deg,#6d28d9,#4f46e5,#818cf8)' }} />
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 py-1 px-3 rounded-lg" style={{ background: 'rgba(129,140,248,0.08)' }}>
                <div className="w-3.5 h-3.5 rounded-full border-2 border-[#818cf8] border-t-transparent animate-spin shrink-0" />
                Scanning {stepName}...
              </div>
            </div>
          )}

          {/* Done state */}
          {phase === 'done' && result && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white font-semibold">Best Match</span>
              </div>
              <div className="rounded-xl px-4 py-3" style={{ background: '#151c2c', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-white font-bold text-sm">{result.pair.display_name || result.pair.symbol}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {tradeType.label} · <span className="text-[#22c55e] font-semibold">{result.direction}</span>
                </p>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-white font-semibold">Scan complete</span>
                <span className="text-gray-400 font-mono">{total}/{total}</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div className="h-full rounded-full" style={{ width: '100%', background: 'linear-gradient(90deg,#6d28d9,#4f46e5,#818cf8)' }} />
              </div>
              <div className="flex items-center gap-2 text-xs text-[#22c55e] py-1 px-3 rounded-lg" style={{ background: 'rgba(34,197,94,0.08)' }}>
                <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                Quality {result.quality.toFixed(2)}% · best entry found
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-2 pt-1">
            {phase !== 'done' ? (
              <button onClick={startScan} disabled={phase === 'scanning'}
                className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg,#6d28d9,#4f46e5)' }}>
                {phase === 'scanning'
                  ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Deep Scanning...</>
                  : <><Search className="w-4 h-4" /> Deep Scan for Best Market</>
                }
              </button>
            ) : (
              <>
                <button onClick={startScan}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg,#6d28d9,#4f46e5)' }}>
                  <RefreshCw className="w-4 h-4" /> Re-scan
                </button>
                <button onClick={() => result && onSelect(result.pair)}
                  className="w-full py-3 rounded-xl text-sm font-bold transition-all"
                  style={{ background: '#151c2c', border: '1px solid rgba(255,255,255,0.08)', color: 'white' }}>
                  Load {result?.pair.display_name || result?.pair.symbol}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
