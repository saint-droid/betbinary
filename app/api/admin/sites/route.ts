import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase'

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()
  const { data, error } = await db.from('sites').select('*').order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ sites: data })
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, slug, domain } = await req.json()
  if (!name?.trim() || !slug?.trim()) return NextResponse.json({ error: 'name and slug required' }, { status: 400 })

  const db = createAdminClient()
  const { data, error } = await db
    .from('sites')
    .insert({ name: name.trim(), slug: slug.trim(), domain: domain?.trim() || null })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Create a site_settings row for the new site with defaults
  await db.from('site_settings').insert({ site_id: data.id })

  return NextResponse.json({ site: data })
}

export async function PATCH(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, name, slug, domain } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const db = createAdminClient()
  const { error } = await db.from('sites').update({ name, slug, domain: domain || null }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
