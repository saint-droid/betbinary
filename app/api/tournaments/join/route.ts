import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserSession } from '@/lib/user-auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const session = await getUserSession()
  if (!session) return NextResponse.json({ error: 'Login required to join a tournament' }, { status: 401 })

  const { tournament_id } = await req.json()
  if (!tournament_id) return NextResponse.json({ error: 'tournament_id required' }, { status: 400 })

  // Fetch tournament
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name, participation_fee, status, is_active, starting_balance, bot_highest_win')
    .eq('id', tournament_id)
    .single()

  if (!tournament || !tournament.is_active) {
    return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
  }
  if (tournament.status === 'ended') {
    return NextResponse.json({ error: 'This tournament has already ended' }, { status: 400 })
  }

  // Check already joined
  const { data: existing } = await supabase
    .from('tournament_participants')
    .select('id')
    .eq('tournament_id', tournament_id)
    .eq('user_id', session.id)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'You have already joined this tournament' }, { status: 409 })
  }

  // participation_fee is stored in KES
  const feeKes = Number(tournament.participation_fee) || 0

  // Fetch settings for conversion rate (to convert user balance from USD to KES)
  const { data: settings } = await supabase
    .from('platform_settings')
    .select('conversion_rate')
    .eq('id', 1)
    .single()

  const rate = Number(settings?.conversion_rate) || 129
  const feeUsd = feeKes / rate

  // Fetch user
  const { data: user } = await supabase
    .from('users')
    .select('balance_usd, status, username')
    .eq('id', session.id)
    .single()

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  if (user.status !== 'active') return NextResponse.json({ error: 'Account suspended' }, { status: 403 })

  const userBalanceKes = Number(user.balance_usd) * rate

  if (feeKes > 0 && userBalanceKes < feeKes) {
    return NextResponse.json({
      error: `Insufficient balance. Entry fee is KSh ${feeKes.toLocaleString()}`,
    }, { status: 400 })
  }

  // Deduct balance if fee applies
  if (feeKes > 0) {
    const { error: deductError } = await supabase
      .from('users')
      .update({ balance_usd: Number(user.balance_usd) - feeUsd })
      .eq('id', session.id)

    if (deductError) return NextResponse.json({ error: 'Failed to deduct fee' }, { status: 500 })

    // Record as a withdrawal transaction so it shows in history
    await supabase.from('withdrawals').insert({
      user_id: session.id,
      amount_kes: feeKes,
      amount_usd: feeUsd,
      conversion_rate_used: rate,
      phone: 'tournament',
      status: 'completed',
      approval_mode: 'auto',
      admin_notes: `Tournament entry fee: ${tournament.name}`,
    })
  }

  // Record participation
  const { error: joinError } = await supabase.from('tournament_participants').insert({
    tournament_id,
    user_id: session.id,
    fee_paid_usd: feeUsd,
    fee_paid_kes: feeKes,
    profit_kes: 0,
  })

  if (joinError) {
    if (feeKes > 0) {
      await supabase.from('users')
        .update({ balance_usd: Number(user.balance_usd) })
        .eq('id', session.id)
    }
    return NextResponse.json({ error: joinError.message }, { status: 500 })
  }

  // Insert permanent visible entry into tournament_entries for all users to see
  // Start at 0 profit — updates as trades are placed
  const username = user.username || 'Trader'
  const initials = username.slice(0, 2).toUpperCase()

  // Count existing entries to determine rank (will be recomputed on each GET)
  const { count: existingCount } = await supabase
    .from('tournament_entries')
    .select('id', { count: 'exact', head: true })
    .eq('tournament_id', tournament_id)

  await supabase.from('tournament_entries').insert({
    tournament_id,
    user_id: session.id,
    trader_name: username,
    avatar_seed: initials,
    country_code: 'KE',
    result_balance: 0,
    prize_amount: 0,
    rank: (existingCount || 0) + 1,
    is_real: true,
  })

  return NextResponse.json({ success: true, fee_paid_usd: feeUsd, fee_paid_kes: feeKes })
}
