import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase'
import { broadcastDelete } from '@/lib/chat-bus'

export async function GET(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const siteId = searchParams.get('site_id') || ''
  const limit = 50
  const offset = (page - 1) * limit

  const db = createAdminClient()
  let messagesQ = db
    .from('chat_messages')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (siteId) messagesQ = messagesQ.eq('site_id', siteId)

  const { data: messages } = await messagesQ
  const { data: names } = await db.from('simulation_name_pool').select('*').order('name')

  return NextResponse.json({ messages, names })
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const db = createAdminClient()

  if (body.action === 'delete_message') {
    const { data: msg } = await db.from('chat_messages').update({ is_deleted: true }).eq('id', body.id).select('site_id').single()
    broadcastDelete(body.id, msg?.site_id)
    return NextResponse.json({ success: true })
  }

  if (body.action === 'toggle_name') {
    await db.from('simulation_name_pool').update({ is_active: body.is_active }).eq('id', body.id)
    return NextResponse.json({ success: true })
  }

  if (body.action === 'add_name') {
    await db.from('simulation_name_pool').insert({ name: body.name })
    return NextResponse.json({ success: true })
  }

  if (body.action === 'remove_name') {
    await db.from('simulation_name_pool').delete().eq('id', body.id)
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
