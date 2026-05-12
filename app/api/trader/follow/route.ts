import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserSession } from '@/lib/user-auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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

  // Check if already following
  const { data: existing } = await supabase
    .from('trader_follows')
    .select('id')
    .eq('follower_id', session.id)
    .eq('entry_id', entry_id)
    .maybeSingle()

  if (existing) {
    // Unfollow
    await supabase.from('trader_follows').delete().eq('id', existing.id)
    return NextResponse.json({ following: false })
  }

  // Follow
  await supabase.from('trader_follows').insert({
    follower_id: session.id,
    entry_id,
    trader_name: entry.trader_name,
    is_bot: !entry.is_real,
  })

  return NextResponse.json({ following: true })
}
