import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { tickBus } from '@/lib/tick-bus'
import { ensureWorkerRunning, getHistory, waitForHistory } from '@/lib/deriv-ws'

export const dynamic = 'force-dynamic'

async function queryDB(db: ReturnType<typeof createAdminClient>, pairId: string, limit: number) {
  const { data } = await db
    .from('price_feed')
    .select('time_open, open, high, low, close')
    .eq('pair_id', pairId)
    .lte('time_open', new Date().toISOString())
    .order('time_open', { ascending: false })
    .limit(limit)
  return data ?? []
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const pairId = searchParams.get('pair_id')
  if (!pairId) return NextResponse.json({ error: 'pair_id required' }, { status: 400 })

  const limit = Math.min(parseInt(searchParams.get('limit') || '7200'), 10000)

  const db = createAdminClient()

  // Kick off the worker (no-op if already running)
  ensureWorkerRunning().catch(() => {})

  // Query DB first
  let dbRows = await queryDB(db, pairId, limit)

  // If DB is empty this is a cold start — wait for the worker to fetch and persist
  // Deriv history (up to 4s), then retry the DB query once
  if (dbRows.length === 0) {
    await waitForHistory(pairId, 4000)
    dbRows = await queryDB(db, pairId, limit)
  }

  const map = new Map<string, { time_open: string; open: number; high: number; low: number; close: number }>()

  // Seed from DB (ascending after reverse)
  for (const c of [...dbRows].reverse()) {
    map.set(c.time_open, { time_open: c.time_open, open: Number(c.open), high: Number(c.high), low: Number(c.low), close: Number(c.close) })
  }

  // Overlay any in-memory ticks newer than the latest DB row
  const dbLatestSec = dbRows.length > 0
    ? Math.floor(new Date(dbRows[0].time_open).getTime() / 1000)
    : 0

  for (const c of getHistory(pairId)) {
    if (c.time > dbLatestSec) {
      const iso = new Date(c.time * 1000).toISOString()
      map.set(iso, { time_open: iso, open: c.open, high: c.high, low: c.low, close: c.close })
    }
  }

  // Overlay latest buffered tick
  const liveBuffer = tickBus.getBuffer(pairId)
  if (liveBuffer.length > 0) {
    const latest = liveBuffer[liveBuffer.length - 1]
    if (latest.candle.time > dbLatestSec) {
      const iso = new Date(latest.candle.time * 1000).toISOString()
      map.set(iso, { time_open: iso, open: latest.price, high: latest.price, low: latest.price, close: latest.price })
    }
  }

  const candles = [...map.values()]
    .sort((a, b) => a.time_open.localeCompare(b.time_open))
    .slice(-limit)

  return NextResponse.json({ candles })
}
