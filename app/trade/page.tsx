import { createClient } from '@supabase/supabase-js'
import TradingTerminal from '@/components/frontend/TradingTerminal'

export const dynamic = 'force-dynamic'

export default async function TradePage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const siteId = process.env.NEXT_PUBLIC_SITE_ID || null

  const [settingsRes, siteRes, pairsRes, newsRes] = await Promise.all([
    supabase.from('platform_settings').select('*').eq('id', 1).single(),
    siteId
      ? supabase.from('site_settings').select('*').eq('site_id', siteId).single()
      : Promise.resolve({ data: null }),
    supabase.from('binary_pairs').select('*').eq('is_active', true).order('sort_order', { ascending: true }),
    supabase.from('news_items').select('*').eq('is_active', true).order('sort_order', { ascending: true })
  ])

  const pairs = pairsRes.data || []
  const settings = { ...(settingsRes.data || {}), ...(siteRes.data || {}) }

  return (
    <main className="h-[100dvh] w-full bg-[#0a0f1c] text-white overflow-hidden font-sans">
      <TradingTerminal
        settings={settings}
        pairs={pairs}
        news={newsRes.data || []}
      />
    </main>
  )
}
