import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { getUserSession } from '@/lib/user-auth'

const supabase = createAdminClient()

export async function POST(req: NextRequest) {
  const session = await getUserSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { entry_id } = await req.json()
  if (!entry_id) return NextResponse.json({ error: 'entry_id required' }, { status: 400 })

  const { data: entry } = await supabase
    .from('tournament_entries')
    .select('id, trader_name, is_real')
    .eq('id', entry_id)
    .single()

  if (!entry) return NextResponse.json({ error: 'Trader not found' }, { status: 404 })

  const { data: existing } = await supabase
    .from('trader_likes')
    .select('id')
    .eq('liker_id', session.id)
    .eq('entry_id', entry_id)
    .maybeSingle()

  if (existing) {
    // Unlike
    await supabase.from('trader_likes').delete().eq('id', existing.id)
    return NextResponse.json({ liked: false })
  }

  // Like
  await supabase.from('trader_likes').insert({
    liker_id: session.id,
    entry_id,
    trader_name: entry.trader_name,
    is_bot: !entry.is_real,
  })

  return NextResponse.json({ liked: true })
}
