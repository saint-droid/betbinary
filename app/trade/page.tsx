import TradingTerminal from '@/components/frontend/TradingTerminal'

// No server-side data fetching — all data is loaded client-side in TradingTerminal
// This makes the page render instantly instead of waiting 5-30s for DB queries
export default function TradePage() {
  return (
    <main className="h-[100dvh] w-full bg-[#0a0f1c] text-white overflow-hidden font-sans">
      <TradingTerminal settings={null} pairs={[]} news={[]} />
    </main>
  )
}
