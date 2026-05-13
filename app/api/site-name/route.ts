import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const siteId = process.env.NEXT_PUBLIC_SITE_ID || null

    const [platformRes, siteRes] = await Promise.all([
      supabase.from('platform_settings').select('site_name, logo_url, favicon_url').eq('id', 1).single(),
      siteId
        ? supabase.from('site_settings').select('site_name, logo_url, favicon_url').eq('site_id', siteId).single()
        : Promise.resolve({ data: null }),
    ])

    const merged = { ...(platformRes.data || {}), ...(siteRes.data || {}) }
    return NextResponse.json({
      site_name: (merged as any).site_name || 'BetaBinary',
      logo_url: (merged as any).logo_url || null,
    })
  } catch {
    return NextResponse.json({ site_name: 'BetaBinary', logo_url: null })
  }
}
