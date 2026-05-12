import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const siteId = searchParams.get('site_id') || ''

  const db = createAdminClient()
  let q = db.from('promo_codes').select('*').order('created_at', { ascending: false })
  if (siteId) q = q.eq('site_id', siteId)

  const { data: codes } = await q
  return NextResponse.json({ codes })
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const db = createAdminClient()

  if (body.action === 'delete') {
    await db.from('promo_codes').delete().eq('id', body.id)
    return NextResponse.json({ success: true })
  }

  if (body.action === 'toggle') {
    await db.from('promo_codes').update({ is_active: body.is_active }).eq('id', body.id)
    return NextResponse.json({ success: true })
  }

  // Create new promo code
  const { code, type, value, condition_min_deposit, expiry_date, usage_limit, site_id } = body
  const { error } = await db.from('promo_codes').insert({
    code: code.toUpperCase(), type, value,
    condition_min_deposit: condition_min_deposit || 0,
    expiry_date: expiry_date || null,
    usage_limit: usage_limit || null,
    site_id: site_id || null,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
