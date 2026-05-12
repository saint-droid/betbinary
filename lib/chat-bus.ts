import { EventEmitter } from 'events'

// Module-level singleton — shared across all API routes in the same process.
// All chat inserts emit here; SSE clients listen here. No Supabase Realtime needed.
export const chatBus = new EventEmitter()
chatBus.setMaxListeners(1000)

export interface ChatBusEvent {
  type: 'insert' | 'delete'
  message?: Record<string, any>
  id?: string
  site_id?: string | null
}

export function broadcastInsert(message: Record<string, any>) {
  chatBus.emit('chat', { type: 'insert', message, site_id: message.site_id ?? null } satisfies ChatBusEvent)
}

export function broadcastDelete(id: string, site_id?: string | null) {
  chatBus.emit('chat', { type: 'delete', id, site_id: site_id ?? null } satisfies ChatBusEvent)
}
