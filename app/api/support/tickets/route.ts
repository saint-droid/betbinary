import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserSession } from '@/lib/user-auth'
import { getSiteId } from '@/lib/site'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const session = await getUserSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch tickets with their latest admin reply
  const { data: tickets, error } = await supabase
    .from('support_tickets')
    .select('id,subject,status,created_at,updated_at')
    .eq('user_id', session.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Get messages for these tickets
  const ticketIds = (tickets || []).map(t => t.id)
  const { data: messages } = ticketIds.length
    ? await supabase
        .from('ticket_messages')
        .select('ticket_id,message,sender_type,created_at')
        .in('ticket_id', ticketIds)
        .order('created_at', { ascending: true })
    : { data: [] }

  // Attach user message and latest admin reply to each ticket
  const result = (tickets || []).map(ticket => {
    const msgs = (messages || []).filter(m => m.ticket_id === ticket.id)
    const userMsg = msgs.find(m => m.sender_type === 'user')
    const adminReply = [...msgs].reverse().find(m => m.sender_type === 'admin')

    // Map DB status to UI status
    const statusMap: Record<string, string> = {
      open: 'open',
      in_progress: 'in_progress',
      closed: 'resolved',
    }

    return {
      ...ticket,
      status: statusMap[ticket.status] ?? ticket.status,
      message: userMsg?.message ?? '',
      admin_reply: adminReply?.message ?? null,
      category: 'other',
    }
  })

  return NextResponse.json({ tickets: result })
}

export async function POST(req: NextRequest) {
  const session = await getUserSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { category, subject, message } = await req.json()
  if (!subject?.trim() || !message?.trim()) {
    return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 })
  }

  const fullSubject = category ? `[${category.toUpperCase()}] ${subject.trim()}` : subject.trim()

  const { data: ticket, error: ticketErr } = await supabase
    .from('support_tickets')
    .insert({ user_id: session.id, subject: fullSubject, status: 'open', site_id: getSiteId() })
    .select()
    .single()

  if (ticketErr) return NextResponse.json({ error: ticketErr.message }, { status: 500 })

  const { error: msgErr } = await supabase
    .from('ticket_messages')
    .insert({
      ticket_id: ticket.id,
      sender_id: session.id,
      sender_type: 'user',
      is_admin: false,
      message: message.trim(),
    })

  if (msgErr) return NextResponse.json({ error: msgErr.message }, { status: 500 })

  return NextResponse.json({
    ticket: {
      ...ticket,
      status: 'open',
      message: message.trim(),
      admin_reply: null,
      category: category || 'other',
    },
  })
}
