import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserSession } from '@/lib/user-auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const session = await getUserSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data: follows }, { data: likes }] = await Promise.all([
    supabase
      .from('trader_follows')
      .select('entry_id, trader_name, is_bot, created_at')
      .eq('follower_id', session.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('trader_likes')
      .select('entry_id, trader_name, is_bot, created_at')
      .eq('liker_id', session.id)
      .order('created_at', { ascending: false }),
  ])

  return NextResponse.json({ follows: follows ?? [], likes: likes ?? [] })
}
