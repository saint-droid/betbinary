// Plays a short order-fill beep using Web Audio API — no audio file needed
export function playOrderSound(type: 'open' | 'win' | 'loss') {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()

    const configs: Record<string, { freq: number; freq2: number; duration: number; type: OscillatorType }> = {
      open: { freq: 880, freq2: 1100, duration: 0.12, type: 'sine' },
      win:  { freq: 660, freq2: 880,  duration: 0.18, type: 'sine' },
      loss: { freq: 330, freq2: 220,  duration: 0.22, type: 'sine' },
    }
    const c = configs[type]

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.type = c.type
    osc.frequency.setValueAtTime(c.freq, ctx.currentTime)
    osc.frequency.linearRampToValueAtTime(c.freq2, ctx.currentTime + c.duration * 0.6)

    gain.gain.setValueAtTime(0.18, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + c.duration)

    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + c.duration)
    osc.onended = () => ctx.close()
  } catch {}
}
