// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserSession } from '@/lib/user-auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const session = await getUserSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tradeId = new URL(req.url).searchParams.get('id')
  if (!tradeId) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { data: trade } = await supabase
    .from('trades')
    .select('id, outcome, payout_usd, exit_price, amount_usd')
    .eq('id', tradeId)
    .eq('user_id', session.id)
    .single()

  if (!trade) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    outcome: trade.outcome,
    payout: trade.payout_usd,
    exitPrice: trade.exit_price,
  })
}
