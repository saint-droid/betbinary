import { EventEmitter } from 'events'

export interface Tick {
  pairId:  string
  price:   number
  time:    number  // unix seconds
  candle:  { time: number; open: number; high: number; low: number; close: number }
}

const BUFFER_SIZE = 300

class TickBus extends EventEmitter {
  private buffers = new Map<string, Tick[]>()

  constructor() {
    super()
    this.setMaxListeners(10000)
  }

  publish(tick: Tick) {
    let buf = this.buffers.get(tick.pairId)
    if (!buf) { buf = []; this.buffers.set(tick.pairId, buf) }
    buf.push(tick)
    if (buf.length > BUFFER_SIZE) buf.shift()
    this.emit(`tick:${tick.pairId}`, tick)
  }

  getBuffer(pairId: string): Tick[] {
    return this.buffers.get(pairId) ?? []
  }

  subscribe(pairId: string, handler: (tick: Tick) => void): () => void {
    const event = `tick:${pairId}`
    this.on(event, handler)
    return () => this.off(event, handler)
  }
}

const globalKey = '__tickBus_v2__'
const g = global as any
if (!g[globalKey]) g[globalKey] = new TickBus()
export const tickBus: TickBus = g[globalKey]
