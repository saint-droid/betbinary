import { NextRequest } from 'next/server'
import { chatBus, type ChatBusEvent } from '@/lib/chat-bus'
import { ReadableStream } from 'stream/web'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const siteId = process.env.NEXT_PUBLIC_SITE_ID || null
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      function send(data: ChatBusEvent) {
        // Only forward events that belong to this site (or global if no site filter)
        if (siteId && data.site_id && data.site_id !== siteId) return
        try {
          // Strip internal site_id before sending to client
          const { site_id: _, ...payload } = data
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
        } catch { /* client gone */ }
      }

      try {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`))
      } catch { return }

      chatBus.on('chat', send)

      const ping = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`))
        } catch {
          clearInterval(ping)
        }
      }, 20_000)

      req.signal.addEventListener('abort', () => {
        chatBus.off('chat', send)
        clearInterval(ping)
        try { controller.close() } catch {}
      })
    },
  })

  return new Response(stream as unknown as globalThis.ReadableStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
      Connection: 'keep-alive',
    },
  })
}
