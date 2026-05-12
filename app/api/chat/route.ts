import { NextRequest, NextResponse } from 'next/server'
import { getUserSession } from '@/lib/user-auth'
import { createClient } from '@supabase/supabase-js'
import { broadcastInsert } from '@/lib/chat-bus'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const siteId = process.env.NEXT_PUBLIC_SITE_ID || null

  let q = supabase
    .from('chat_messages')
    .select('*')
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(60)

  if (siteId) q = q.eq('site_id', siteId)

  const { data } = await q
  return NextResponse.json({ messages: (data || []).reverse() })
}

export async function POST(req: NextRequest) {
  try {
    const session = await getUserSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { message } = await req.json()
    if (!message?.trim()) return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 })

    const { data: override } = await supabase
      .from('user_overrides')
      .select('is_blocked_from_chat')
      .eq('user_id', session.id)
      .single()

    if (override?.is_blocked_from_chat) {
      return NextResponse.json({ error: 'You are blocked from chat' }, { status: 403 })
    }

    const siteId = process.env.NEXT_PUBLIC_SITE_ID || null

    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        user_id: session.id,
        username: session.username,
        message: message.trim(),
        type: 'user',
        site_id: siteId,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Broadcast to all SSE clients immediately
    broadcastInsert(data)

    return NextResponse.json({ success: true, message: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
