import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import WebSocket from 'ws'

export const dynamic = 'force-dynamic'

const DERIV_WS = 'wss://ws.binaryws.com/websockets/v3?app_id=1089'

function fetchDerivSymbols(): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(DERIV_WS)
    const timer = setTimeout(() => { ws.close(); reject(new Error('Timeout')) }, 15000)

    ws.on('open', () => {
      ws.send(JSON.stringify({ active_symbols: 'brief', product_type: 'basic' }))
    })

    ws.on('message', (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString())
        clearTimeout(timer)
        ws.close()
        if (msg.error) return reject(new Error(msg.error.message))
        resolve(msg.active_symbols ?? [])
      } catch (e) {
        clearTimeout(timer)
        ws.close()
        reject(e)
      }
    })

    ws.on('error', (err: Error) => { clearTimeout(timer); reject(err) })
  })
}

let cache: { symbols: any[]; fetchedAt: number } | null = null
const CACHE_TTL = 10 * 60 * 1000

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    if (cache && Date.now() - cache.fetchedAt < CACHE_TTL) {
      return NextResponse.json({ symbols: cache.symbols })
    }

    const raw = await fetchDerivSymbols()
    const symbols = raw.map((s: any) => ({
      symbol:        s.symbol,
      displayName:   s.display_name,
      market:        s.market,
      marketName:    s.market_display_name,
      submarket:     s.submarket,
      submarketName: s.submarket_display_name,
      pip:           s.pip,
    }))

    cache = { symbols, fetchedAt: Date.now() }
    return NextResponse.json({ symbols })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
