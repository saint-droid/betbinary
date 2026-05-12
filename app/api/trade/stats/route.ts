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

  // Today in UTC
  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)

  const { data: trades, error } = await supabase
    .from('trades')
    .select('outcome, amount_usd, payout_usd')
    .eq('user_id', session.id)
    .eq('is_demo', false)
    .neq('outcome', 'pending')
    .gte('resolved_at', todayStart.toISOString())

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let wins = 0, losses = 0, pnlUsd = 0, totalStakeUsd = 0

  for (const t of trades || []) {
    const stake = Number(t.amount_usd)
    const payout = Number(t.payout_usd ?? 0)
    totalStakeUsd += stake
    if (t.outcome === 'win') {
      wins++
      pnlUsd += payout - stake
    } else {
      losses++
      pnlUsd -= stake
    }
  }

  return NextResponse.json({ wins, losses, pnlUsd, totalStakeUsd })
}
