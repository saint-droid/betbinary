import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { getUserSession } from '@/lib/user-auth'

const supabase = createAdminClient()

export async function POST(req: NextRequest) {
  const session = await getUserSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { code } = await req.json()
  if (!code?.trim()) {
    return NextResponse.json({ error: 'Promo code is required' }, { status: 400 })
  }

  const { data: promo } = await supabase
    .from('promo_codes')
    .select('*')
    .eq('code', code.trim().toUpperCase())
    .eq('is_active', true)
    .single()

  if (!promo) {
    return NextResponse.json({ error: 'Invalid or expired promo code' }, { status: 400 })
  }

  if (promo.expiry_date && new Date(promo.expiry_date) < new Date()) {
    return NextResponse.json({ error: 'This promo code has expired' }, { status: 400 })
  }

  if (promo.usage_limit !== null && promo.times_used >= promo.usage_limit) {
    return NextResponse.json({ error: 'This promo code has reached its usage limit' }, { status: 400 })
  }

  // Check if already redeemed by this user
  const { count } = await supabase
    .from('user_promo_redemptions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', session.id)
    .eq('promo_id', promo.id)

  if ((count ?? 0) > 0) {
    return NextResponse.json({ error: 'You have already redeemed this promo code' }, { status: 400 })
  }

  const { data: settings } = await supabase
    .from('platform_settings')
    .select('conversion_rate')
    .eq('id', 1)
    .single()

  const rate = Number(settings?.conversion_rate ?? 129)

  const { data: user } = await supabase
    .from('users')
    .select('balance_usd')
    .eq('id', session.id)
    .single()

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  let bonusUsd = 0
  if (promo.type === 'flat') {
    // value stored in KES
    bonusUsd = Number(promo.value) / rate
  } else {
    // percent of current balance
    bonusUsd = Number(user.balance_usd) * (Number(promo.value) / 100)
  }

  // Record redemption and credit balance in parallel
  const [redemptionRes] = await Promise.all([
    supabase
      .from('user_promo_redemptions')
      .insert({ user_id: session.id, promo_id: promo.id }),
    supabase
      .from('users')
      .update({ balance_usd: Number(user.balance_usd) + bonusUsd })
      .eq('id', session.id),
    supabase
      .from('promo_codes')
      .update({ times_used: promo.times_used + 1 })
      .eq('id', promo.id),
  ])

  if (redemptionRes.error) {
    return NextResponse.json({ error: 'Failed to redeem code' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: `Promo code applied! Bonus credited to your account.`,
    bonus_usd: bonusUsd,
  })
}
