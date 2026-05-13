import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { getUserSession } from '@/lib/user-auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const db = createAdminClient()
  const siteId = process.env.NEXT_PUBLIC_SITE_ID || null

  const session = await getUserSession()

  // Fire all non-user queries in parallel
  const [
    { data: platform },
    { data: site },
    { data: pairs },
    { data: notifications },
    { data: wins },
  ] = await Promise.all([
    db.from('platform_settings')
      .select(
        'default_currency,show_currency_switcher,conversion_rate,demo_starting_balance,site_name,' +
        'min_deposit_kes,max_deposit_kes,min_withdrawal_kes,max_withdrawal_kes,' +
        'referral_enabled,referral_l1_percent,referral_l2_percent,referral_l3_percent,min_referral_withdrawal_kes,' +
        'how_to_trade_steps,payout_multiplier,trade_duration_seconds,' +
        'payout_even_odd,payout_match,payout_differ,payout_over,payout_under,' +
        'withdrawal_processing_message,mpesa_paybill,mpesa_shortcode,' +
        'min_stake_usd,max_stake_usd,min_stake_kes,max_stake_kes,' +
        'candle_duration_seconds,chat_simulation_enabled,chat_simulation_freq_min_secs,chat_simulation_freq_max_secs'
      )
      .eq('id', 1)
      .single(),
    siteId
      ? db.from('site_settings')
          .select(
            'site_name,logo_url,favicon_url,footer_text,show_currency_switcher,maintenance_mode,whatsapp_community_url,' +
            'welcome_bonus_enabled,welcome_bonus_percent,welcome_bonus_min_deposit_kes,' +
            'welcome_bonus_trades_required,welcome_bonus_expiry_hours,' +
            'winning_toast_enabled,winning_toast_interval_min_secs,winning_toast_interval_max_secs,' +
            'winning_toast_real_win_pct,winning_toast_min_amount,winning_toast_max_amount,' +
            'buy_button_label,sell_button_label,default_currency,site_title'
          )
          .eq('site_id', siteId)
          .single()
      : Promise.resolve({ data: null }),
    db.from('binary_pairs').select('*').eq('is_active', true).order('sort_order', { ascending: true }),
    db.from('platform_notifications').select('id,title,body,icon').eq('is_active', true).order('sort_order', { ascending: true }),
    (() => {
      let q = db
        .from('withdrawals')
        .select('amount, users!inner(username)')
        .eq('status', 'completed')
        .neq('phone', 'tournament')
        .order('created_at', { ascending: false })
        .limit(30)
      if (siteId) q = (q as any).eq('site_id', siteId)
      return q
    })(),
  ])

  // User-specific queries — only if logged in
  let user = null
  let stats = null

  if (session) {
    const todayStart = new Date()
    todayStart.setUTCHours(0, 0, 0, 0)

    const [{ data: userData }, { data: trades }] = await Promise.all([
      db.from('users').select('*').eq('id', session.id).single(),
      db.from('trades')
        .select('outcome, amount_usd, payout_usd')
        .eq('user_id', session.id)
        .eq('is_demo', false)
        .neq('outcome', 'pending')
        .gte('resolved_at', todayStart.toISOString()),
    ])

    user = userData

    if (trades) {
      let wins2 = 0, losses = 0, pnlUsd = 0, totalStakeUsd = 0
      for (const t of trades) {
        const stake = Number(t.amount_usd)
        const payout = Number(t.payout_usd ?? 0)
        totalStakeUsd += stake
        if (t.outcome === 'win') { wins2++; pnlUsd += payout - stake }
        else { losses++; pnlUsd -= stake }
      }
      stats = { wins: wins2, losses, pnlUsd, totalStakeUsd }
    }
  }

  const settings = { ...(platform || {}), ...(site || {}) }

  const winsList = ((wins as any[]) || [])
    .map((w: any) => ({ name: w.users?.username || 'User', amount: Math.round(Number(w.amount)) }))
    .filter((w: any) => w.amount >= 100)

  return NextResponse.json({
    settings,
    pairs: pairs || [],
    user,
    stats,
    notifications: notifications || [],
    wins: winsList,
  })
}
