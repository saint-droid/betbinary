export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { createAdminClient } = await import('./lib/supabase')
    // Warm the singleton connection so first API requests don't pay the TLS handshake cost
    try {
      const db = createAdminClient()
      await db.from('platform_settings').select('id').eq('id', 1).single()
    } catch {
      // Non-fatal — just a warmup ping
    }
  }
}
