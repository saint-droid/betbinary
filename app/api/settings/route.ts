import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function GET() {
  const db = createAdminClient()
  const siteId = process.env.NEXT_PUBLIC_SITE_ID || null

  const [{ data: platform }, { data: site }] = await Promise.all([
    db.from('platform_settings').select('default_currency,show_currency_switcher,conversion_rate,demo_starting_balance,site_name').eq('id', 1).single(),
    siteId
      ? db.from('site_settings').select('site_name,show_currency_switcher,default_currency').eq('site_id', siteId).single()
      : Promise.resolve({ data: null }),
  ])

  return NextResponse.json(
    { settings: { ...(platform || {}), ...(site || {}) } },
    { headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=60' } }
  )
}
