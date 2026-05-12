import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { registerDemoBias } from '@/lib/demo-bias'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { amount, pairId, sessionId, direction, entryPrice } = await request.json()

    const { data: settings } = await supabase
      .from('platform_settings')
      .select('payout_multiplier, trade_duration_seconds, trade_ticks, house_win_rate_demo')
      .eq('id', 1)
      .single()

    if (!settings) return NextResponse.json({ error: 'Settings not found' }, { status: 500 })

    const duration = Number(settings.trade_duration_seconds || 10)
    const tradeTicks = Number(settings.trade_ticks ?? 2)

    // house_win_rate_demo: 0.90 = house wins 90% = user wins 10%
    const houseWinRate = Number(settings.house_win_rate_demo ?? 0.10)
    const userWinRate = 1 - houseWinRate
    const winTarget = Math.random() < userWinRate

    if (sessionId && pairId && direction && entryPrice) {
      registerDemoBias(sessionId, {
        pairId,
        direction,
        entryPrice: Number(entryPrice),
        resolveAt: Date.now() + duration * 1000,
        winTarget,
      })
    }

    return NextResponse.json({
      duration,
      tradeTicks,
      payoutMultiplier: Number(settings.payout_multiplier || 1.8),
      winTarget,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
