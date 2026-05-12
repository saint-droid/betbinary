'use client'

interface AutoStopResult {
  type: 'profit' | 'loss'
  pnlUsd: number
  trades: number
  wins: number
  losses: number
}

interface Props {
  result: AutoStopResult
  onClose: () => void
}

export default function AutoStopModal({ result, onClose }: Props) {
  const isProfit = result.type === 'profit'
  const winRate = result.trades > 0 ? ((result.wins / result.trades) * 100).toFixed(1) : '0.0'

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-sm rounded-2xl bg-[#151c2c] border border-[#1e2d40] shadow-2xl overflow-hidden">

        {/* Icon */}
        <div className="flex justify-center pt-8 pb-4">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isProfit ? 'bg-[#22c55e]/20' : 'bg-[#ef4444]/20'}`}>
            {isProfit ? (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#22c55e" strokeWidth="2" />
                <path d="M7.5 12l3 3 6-6" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="2" />
                <path d="M12 8v4m0 4h.01" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            )}
          </div>
        </div>

        {/* Title */}
        <div className="text-center px-6 pb-2">
          <p className={`text-lg font-black ${isProfit ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
            {isProfit ? 'Target Profit Reached!' : 'Target Loss Reached!'}
          </p>
        </div>

        {/* P&L amount */}
        <div className="text-center pb-5">
          <span className={`text-4xl font-black ${isProfit ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
            {isProfit ? '+' : ''}{result.pnlUsd.toFixed(2)}
          </span>
          <span className="text-gray-400 text-sm font-semibold ml-1.5">USD</span>
        </div>

        {/* Stats */}
        <div className="mx-6 mb-6 rounded-xl bg-[#0e1320] border border-[#1e2d40] divide-y divide-[#1e2d40]">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-gray-400">Trades</span>
            <span className="text-sm font-bold text-white">{result.trades}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-gray-400">W / L</span>
            <span className="text-sm font-bold">
              <span className="text-[#22c55e]">{result.wins}</span>
              <span className="text-gray-500"> / </span>
              <span className="text-[#ef4444]">{result.losses}</span>
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-gray-400">Win Rate</span>
            <span className={`text-sm font-bold ${Number(winRate) >= 50 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>{winRate}%</span>
          </div>
        </div>

        {/* Button */}
        <div className="px-6 pb-7">
          <button
            onClick={onClose}
            className="w-full py-4 rounded-xl font-black text-base bg-[#22c55e] hover:bg-[#16a34a] text-black transition-colors"
          >
            Continue Trading
          </button>
        </div>
      </div>
    </div>
  )
}
