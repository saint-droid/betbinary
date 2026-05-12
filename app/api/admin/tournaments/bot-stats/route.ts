import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase'

const BOT_BIOS = [
  'Algorithmic trader from Nairobi with 6+ years of scalping forex markets. Known for aggressive but calculated entries.',
  'Binary options specialist. Built a consistent edge trading news events and economic releases.',
  'Former stockbroker turned retail trader. Focuses on momentum and trend-following strategies.',
  'Self-taught trader from Mombasa. Mastered price action after 4 years of disciplined study.',
  'Risk-first approach — never risks more than 1% per trade. Slow and steady compound growth.',
  'High-frequency style trader who thrives on volatility. Loves non-farm payroll days.',
  'Started trading at 19. Now runs a private signals group with over 3,000 members.',
  'Combines technical analysis with sentiment data. Rarely loses more than two days in a row.',
  'Consistently in the top 5% of traders across regional platforms. Specialises in EUR/USD.',
  'University lecturer by day, full-time trader mindset. Patience and discipline define his edge.',
  'Built her trading career from a KSh 5,000 account. Now manages a personal fund.',
  'Relies on support/resistance and psychological price levels. Simple but highly effective.',
  'Trained under a professional prop firm. Brings institutional-grade discipline to retail trading.',
  'Swing trader with a 3–5 day hold strategy. Lets profits run and cuts losses fast.',
  'Options and binary veteran. Adapts quickly to changing market conditions.',
]

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function autoStats(resultBalance: number, idx: number) {
  const ref = Math.max(resultBalance || 5000, 1000)
  return {
    bot_total_trades: rand(3200, 18500),
    bot_win_rate: rand(72, 94),
    bot_total_profit: rand(ref * 8, ref * 40),
    bot_best_trade: rand(Math.round(ref * 0.4), Math.round(ref * 2.5)),
    bot_bio: BOT_BIOS[idx % BOT_BIOS.length],
  }
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const db = createAdminClient()

  // Bulk auto-fill: { bulk: true, tournament_id }
  if (body.bulk && body.tournament_id) {
    const { data: bots } = await db
      .from('tournament_entries')
      .select('id, result_balance')
      .eq('tournament_id', body.tournament_id)
      .eq('is_real', false)

    for (const [i, bot] of (bots || []).entries()) {
      await db.from('tournament_entries').update(autoStats(Number(bot.result_balance), i)).eq('id', bot.id)
    }
    return NextResponse.json({ success: true, updated: bots?.length ?? 0 })
  }

  // Single bot update
  const { entry_id, bot_total_trades, bot_win_rate, bot_total_profit, bot_best_trade, bot_bio } = body
  if (!entry_id) return NextResponse.json({ error: 'entry_id required' }, { status: 400 })

  const { error } = await db
    .from('tournament_entries')
    .update({
      bot_total_trades: Number(bot_total_trades) || 0,
      bot_win_rate: Number(bot_win_rate) || 0,
      bot_total_profit: Number(bot_total_profit) || 0,
      bot_best_trade: Number(bot_best_trade) || 0,
      bot_bio: bot_bio || null,
    })
    .eq('id', entry_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
