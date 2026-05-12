import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || ''
  const ticket_id = searchParams.get('ticket_id') || ''
  const siteId = searchParams.get('site_id') || ''

  const db = createAdminClient()

  if (ticket_id) {
    const [{ data: ticket }, { data: messages }] = await Promise.all([
      db.from('support_tickets').select('*, users(username, phone)').eq('id', ticket_id).single(),
      db.from('ticket_messages').select('*').eq('ticket_id', ticket_id).order('created_at'),
    ])
    return NextResponse.json({ ticket, messages })
  }

  let query = db
    .from('support_tickets')
    .select('*, users(username)')
    .order('updated_at', { ascending: false })

  if (status) query = query.eq('status', status)
  if (siteId) query = query.eq('site_id', siteId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tickets: data })
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const db = createAdminClient()

  if (body.action === 'reply') {
    await db.from('ticket_messages').insert({
      ticket_id: body.ticket_id,
      sender_id: session.id,
      sender_type: 'admin',
      is_admin: true,
      message: body.message,
    })
    await db.from('support_tickets').update({ status: 'in_progress', updated_at: new Date().toISOString() }).eq('id', body.ticket_id)
    return NextResponse.json({ success: true })
  }

  if (body.action === 'set_status') {
    await db.from('support_tickets').update({ status: body.status }).eq('id', body.ticket_id)
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
