import { NextRequest } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { getOrCreateSim, releaseSim, persistCandle } from '@/lib/price-sim'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return new Response('Unauthorized', { status: 401 })

  const pairId = new URL(req.url).searchParams.get('pair_id')
  if (!pairId) return new Response('pair_id required', { status: 400 })

  const sim = await getOrCreateSim(pairId)
  if (!sim) return new Response('Pair not found', { status: 404 })

  if (sim.currentCandle) await persistCandle(sim.pairId, sim.currentCandle)

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      function send(data: object) {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch { /* client gone */ }
      }

      sim.emitter.on('tick', send)

      if (sim.currentCandle) {
        send({ price: sim.lastPrice, candle: { ...sim.currentCandle }, regime: sim.regime })
      }

      req.signal.addEventListener('abort', () => {
        sim.emitter.off('tick', send)
        releaseSim(pairId, sim)
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
      Connection: 'keep-alive',
    },
  })
}
