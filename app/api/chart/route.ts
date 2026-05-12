import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { tickBus } from '@/lib/tick-bus'
import { ensureWorkerRunning, getHistory } from '@/lib/deriv-ws'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const pairId = searchParams.get('pair_id')
  if (!pairId) return NextResponse.json({ error: 'pair_id required' }, { status: 400 })

  const limit = Math.min(parseInt(searchParams.get('limit') || '7200'), 10000)

  const db = createAdminClient()
  const { data: pair } = await db.from('binary_pairs').select('deriv_symbol').eq('id', pairId).single()
  const isLive = !!(pair?.deriv_symbol)

  // All binary pairs are live — always use the Deriv worker
  ensureWorkerRunning().catch(() => {})

  const history = getHistory(pairId)

  if (history.length > 0) {
    const liveBuffer = tickBus.getBuffer(pairId)
    const liveTick = liveBuffer.length > 0 ? liveBuffer[liveBuffer.length - 1] : null

    const map = new Map<number, { time_open: string; open: number; high: number; low: number; close: number }>()
    for (const c of history) {
      map.set(c.time, {
        time_open: new Date(c.time * 1000).toISOString(),
        open: c.open, high: c.high, low: c.low, close: c.close,
      })
    }
    if (liveTick) {
      map.set(liveTick.candle.time, {
        time_open: new Date(liveTick.candle.time * 1000).toISOString(),
        open: liveTick.price, high: liveTick.price, low: liveTick.price, close: liveTick.price,
      })
    }

    const candles = [...map.values()]
      .sort((a, b) => a.time_open.localeCompare(b.time_open))
      .slice(-limit)

    return NextResponse.json({ candles })
  }

  // Worker connecting — return empty, chart will stream live ticks shortly
  return NextResponse.json({ candles: [] })
}
