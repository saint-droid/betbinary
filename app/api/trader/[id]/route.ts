import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserSession } from '@/lib/user-auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getUserSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // Fetch the tournament entry (works for both bots and real users)
  const { data: entry } = await supabase
    .from('tournament_entries')
    .select('id, trader_name, avatar_seed, country_code, result_balance, prize_amount, is_real, user_id, bot_total_trades, bot_win_rate, bot_total_profit, bot_best_trade, bot_bio, tournament_id')
    .eq('id', id)
    .single()

  if (!entry) return NextResponse.json({ error: 'Trader not found' }, { status: 404 })

  // Count follows and likes for this entry
  const [{ count: followCount }, { count: likeCount }] = await Promise.all([
    supabase.from('trader_follows').select('id', { count: 'exact', head: true }).eq('entry_id', id),
    supabase.from('trader_likes').select('id', { count: 'exact', head: true }).eq('entry_id', id),
  ])

  // Check if current user already follows/liked
  const [{ data: myFollow }, { data: myLike }] = await Promise.all([
    supabase.from('trader_follows').select('id').eq('entry_id', id).eq('follower_id', session.id).maybeSingle(),
    supabase.from('trader_likes').select('id').eq('entry_id', id).eq('liker_id', session.id).maybeSingle(),
  ])

  // Get tournament name
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('name, status')
    .eq('id', entry.tournament_id)
    .single()

  return NextResponse.json({
    entry: {
      ...entry,
      follow_count: followCount ?? 0,
      like_count: likeCount ?? 0,
      i_follow: !!myFollow,
      i_liked: !!myLike,
      tournament_name: tournament?.name ?? '',
      tournament_status: tournament?.status ?? '',
    }
  })
}
