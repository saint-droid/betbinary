import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const siteId = searchParams.get('site_id')

  const db = createAdminClient()

  // Always return universal platform_settings
  const { data: platformData, error: platformError } = await db
    .from('platform_settings').select('*').eq('id', 1).single()
  if (platformError) return NextResponse.json({ error: platformError.message }, { status: 500 })

  // If site_id provided, also return that site's settings merged on top
  if (siteId) {
    const { data: siteData } = await db
      .from('site_settings').select('*').eq('site_id', siteId).single()
    return NextResponse.json({ settings: { ...platformData, ...siteData } })
  }

  return NextResponse.json({ settings: platformData })
}

export async function PATCH(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const siteId = searchParams.get('site_id')

  const body = await req.json()
  const db = createAdminClient()

  if (siteId) {
    // Site-specific fields go to site_settings
    const { error } = await db
      .from('site_settings').update(body).eq('site_id', siteId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  // Universal fields go to platform_settings
  const { error } = await db.from('platform_settings').update(body).eq('id', 1)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
