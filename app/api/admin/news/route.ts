import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase'

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()
  const { data, error } = await db.from('news_items').select('*').order('sort_order')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data })
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const db = createAdminClient()

  if (body.action === 'delete') {
    await db.from('news_items').delete().eq('id', body.id)
    return NextResponse.json({ success: true })
  }

  if (body.id) {
    const { id, action, ...fields } = body
    await db.from('news_items').update(fields).eq('id', id)
  } else {
    await db.from('news_items').insert({ headline: body.headline, sort_order: body.sort_order || 0 })
  }

  return NextResponse.json({ success: true })
}
