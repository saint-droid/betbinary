// Module-level singleton — shared between /api/trade/demo and /api/chart/stream
// within the same Node.js process. Tracks active demo trades so the stream
// can steer the price path toward a win for that session.

export interface DemoBias {
  pairId: string
  direction: 'buy' | 'sell'
  entryPrice: number
  resolveAt: number   // Date.now() ms when the trade timer fires
  winTarget: boolean  // true = steer toward win, false = let it run naturally
}

// Keyed by a sessionId the client generates and sends with the trade request
const biasMap = new Map<string, DemoBias>()

export function registerDemoBias(sessionId: string, bias: DemoBias) {
  biasMap.set(sessionId, bias)
  // Auto-clean 30s after resolve time to avoid memory leaks
  setTimeout(() => biasMap.delete(sessionId), bias.resolveAt - Date.now() + 30_000)
}

export function getDemoBias(pairId: string): DemoBias | null {
  for (const bias of biasMap.values()) {
    if (bias.pairId === pairId && bias.winTarget) return bias
  }
  return null
}

export function clearDemoBias(sessionId: string) {
  biasMap.delete(sessionId)
}
