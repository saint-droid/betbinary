import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase'
import { broadcastInsert } from '@/lib/chat-bus'

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { message, site_id } = await req.json()
  if (!message?.trim()) return NextResponse.json({ error: 'Message required' }, { status: 400 })

  const db = createAdminClient()
  const { data, error } = await db
    .from('chat_messages')
    .insert({
      username: session.name || 'Admin',
      message: message.trim(),
      type: 'system_real',
      site_id: site_id || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  broadcastInsert(data)

  return NextResponse.json({ success: true })
}
