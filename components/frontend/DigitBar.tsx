'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  livePrice: number | null
  static?: boolean
}

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
const HISTORY = 500 // rolling window for frequency %

const STROKE = 2

function DigitCircle({ digit, pctNum, isActive, bgColor, arcColor, textColor, glow, scale, size }: {
  digit: number; pctNum: number; isActive: boolean
  bgColor: string; arcColor: string; textColor: string; glow: string; scale: number; size: number
}) {
  const r = (size - STROKE) / 2
  const circ = 2 * Math.PI * r
  const dashOffset = circ - (pctNum / 100) * circ

  return (
    <div style={{ width: size, height: size, position: 'relative', transform: `scale(${scale})`, transition: 'transform 0.15s', filter: glow !== 'none' ? `drop-shadow(${glow})` : 'none' }}>
      <svg width={size} height={size} style={{ position: 'absolute', inset: 0 }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill={bgColor} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="#2A3548" strokeWidth={STROKE} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={arcColor} strokeWidth={STROKE}
          strokeDasharray={circ}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.3s ease' }}
        />
      </svg>
      <span style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size <= 36 ? 9 : 11, fontWeight: 900, color: textColor, lineHeight: 1,
      }}>
        {digit}
      </span>
    </div>
  )
}

export default function DigitBar({ livePrice, static: isStatic }: Props) {
  const SIZE = isStatic ? 30 : 42
  const [counts, setCounts] = useState<number[]>(Array(10).fill(0))
  const [total, setTotal] = useState(0)
  const [activeDigit, setActiveDigit] = useState<number | null>(null)
  const [prevDigit, setPrevDigit] = useState<number | null>(null)
  const historyRef = useRef<number[]>([])
  const arrowRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (livePrice === null) return
    // Extract last digit from price string to avoid floating point issues
    const priceStr = livePrice.toFixed(2)
    const digit = parseInt(priceStr[priceStr.length - 1])

    setPrevDigit(activeDigit)
    setActiveDigit(digit)

    // Rolling history
    const hist = historyRef.current
    hist.push(digit)
    if (hist.length > HISTORY) hist.shift()

    // Recount
    const c = Array(10).fill(0)
    for (const d of hist) c[d]++
    setCounts([...c])
    setTotal(hist.length)
  }, [livePrice]) // eslint-disable-line react-hooks/exhaustive-deps

  // Animate arrow to the active digit cell
  useEffect(() => {
    if (activeDigit === null || !containerRef.current) return
    const cells = containerRef.current.querySelectorAll<HTMLElement>('[data-digit]')
    const cell = cells[activeDigit]
    const arrow = arrowRef.current
    if (!cell || !arrow) return

    const containerRect = containerRef.current.getBoundingClientRect()
    const cellRect = cell.getBoundingClientRect()
    const targetX = cellRect.left - containerRect.left + cellRect.width / 2 - 6 // 6 = half arrow width
    arrow.style.transform = `translateX(${targetX}px)`
  }, [activeDigit])

  return (
    <div className={`${isStatic ? 'w-full' : 'absolute bottom-7 left-0 right-0 z-20'} pointer-events-none select-none flex flex-col items-center py-2`}>
      <div className="w-full max-w-[550px] px-2">
      {/* Arrow indicator — points upward, sits above the digit circles */}
      <div className="relative h-3 mb-2">
        <div
          ref={arrowRef}
          className="absolute top-0 w-3 h-3 transition-transform duration-150 ease-out"
          style={{ transform: 'translateX(0px)' }}
        >
          {/* Upward triangle */}
          <svg width="12" height="10" viewBox="0 0 12 10">
            <polygon points="6,0 0,10 12,10" fill={activeDigit !== null ? getDigitColor(activeDigit, counts, total) : '#6b7280'} />
          </svg>
        </div>
      </div>

      {/* Digit cells */}
      <div ref={containerRef} className="flex gap-1">
        {DIGITS.map(d => {
          const pct = total > 0 ? ((counts[d] / total) * 100).toFixed(1) : '0.0'
          const isActive = d === activeDigit
          const color = getDigitColor(d, counts, total)
          const maxCount = Math.max(...counts)
          const minCount = Math.min(...counts)
          const isHighest = total > 0 && counts[d] === maxCount
          const isLowest  = total > 0 && counts[d] === minCount && minCount !== maxCount

          const bgColor = isActive
            ? color
            : isHighest
              ? 'rgba(34,197,94,0.18)'
              : isLowest
                ? 'rgba(239,68,68,0.18)'
                : '#1E2535'

          const arcColor = isActive
            ? color
            : isHighest
              ? '#22c55e'
              : isLowest
                ? '#ef4444'
                : '#445166'

          return (
            <div
              key={d}
              data-digit={d}
              className="flex-1 flex flex-col items-center gap-0.5"
            >
              {/* Circle with arc progress */}
              <DigitCircle
                digit={d}
                pctNum={total > 0 ? (counts[d] / total) * 100 : 0}
                isActive={isActive}
                bgColor={bgColor}
                arcColor={arcColor}
                textColor={isActive ? '#000' : 'rgba(156,163,175,0.8)'}
                glow={isActive ? `0 0 10px ${color}80` : 'none'}
                scale={isActive ? 1.15 : 1}
                size={SIZE}
              />

              {/* Frequency % */}
              <span
                className="text-[9px] font-bold leading-none transition-colors duration-200"
                style={{ color: isActive ? color : 'rgba(156,163,175,0.7)' }}
              >
                {pct}%
              </span>
            </div>
          )
        })}
      </div>
      </div>
    </div>
  )
}

// Color: green for digits appearing more than avg, red for less, neutral otherwise
function getDigitColor(digit: number, counts: number[], total: number): string {
  if (total < 10) return '#6b7280'
  const avg = total / 10
  const count = counts[digit]
  const ratio = count / avg
  if (ratio >= 1.15) return '#22c55e'
  if (ratio <= 0.85) return '#ef4444'
  return '#f59e0b'
}
