import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { getUserSession } from '@/lib/user-auth'

const supabase = createAdminClient()

export async function GET() {
  const session = await getUserSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data: settings }, { data: promoCodes }, { data: redemptions }, { data: completedDeposits }] = await Promise.all([
    supabase
      .from('platform_settings')
      .select('welcome_bonus_enabled,welcome_bonus_percent,welcome_bonus_min_deposit_kes,conversion_rate')
      .eq('id', 1)
      .single(),
    // Only show active promo codes that haven't expired
    supabase
      .from('promo_codes')
      .select('id,code,type,value,condition_min_deposit,expiry_date,usage_limit,times_used')
      .eq('is_active', true)
      .or(`expiry_date.is.null,expiry_date.gt.${new Date().toISOString()}`),
    // Which promo codes has this user already redeemed?
    supabase
      .from('user_promo_redemptions')
      .select('promo_id')
      .eq('user_id', session.id),
    // Has user made any completed deposits (welcome bonus eligibility)?
    supabase
      .from('deposits')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', session.id)
      .eq('status', 'completed')
      .eq('bonus_applied', true),
  ])

  const rate = Number(settings?.conversion_rate ?? 129)
  const redeemedIds = new Set((redemptions || []).map((r: any) => r.promo_id))
  const welcomeClaimed = (completedDeposits as any)?.count > 0 || false

  const offers = []

  // 1. Welcome bonus from settings
  if (settings?.welcome_bonus_enabled) {
    offers.push({
      id: 'welcome',
      title: 'Welcome Deposit Bonus',
      description: `Get ${settings.welcome_bonus_percent}% bonus on your first deposit of KSh ${Number(settings.welcome_bonus_min_deposit_kes).toLocaleString()} or more`,
      type: 'welcome',
      value_percent: Number(settings.welcome_bonus_percent),
      min_deposit_usd: Number(settings.welcome_bonus_min_deposit_kes) / rate,
      claimed: welcomeClaimed,
      expires_at: null,
    })
  }

  // 2. Active promo codes (show as claimable offers users can apply)
  for (const promo of promoCodes || []) {
    const claimed = redeemedIds.has(promo.id)
    const usedUp = promo.usage_limit !== null && promo.times_used >= promo.usage_limit

    // Skip fully used-up codes
    if (usedUp && !claimed) continue

    const valueLabel = promo.type === 'percent'
      ? `${promo.value}% bonus on your balance`
      : `KSh ${(Number(promo.value) * rate).toLocaleString()} free credit`

    const minDepositNote = Number(promo.condition_min_deposit) > 0
      ? `. Requires a minimum deposit of KSh ${Number(promo.condition_min_deposit).toLocaleString()}`
      : ''

    offers.push({
      id: promo.id,
      title: `Promo Code: ${promo.code}`,
      description: `${valueLabel}${minDepositNote}`,
      type: 'promo',
      value_percent: promo.type === 'percent' ? Number(promo.value) : undefined,
      value_usd: promo.type === 'flat' ? Number(promo.value) : undefined,
      claimed,
      expires_at: promo.expiry_date ?? null,
    })
  }

  return NextResponse.json({ offers })
}
