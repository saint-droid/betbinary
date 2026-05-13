import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { getSiteId } from '@/lib/site'

const supabase = createAdminClient()

export async function GET() {
  const siteId = getSiteId()

  const [{ data: platform }, { data: site }] = await Promise.all([
    supabase
      .from('platform_settings')
      .select(
        'conversion_rate,default_currency,' +
        'min_deposit_kes,max_deposit_kes,min_withdrawal_kes,max_withdrawal_kes,' +
        'referral_enabled,referral_l1_percent,referral_l2_percent,referral_l3_percent,min_referral_withdrawal_kes,' +
        'how_to_trade_steps,payout_multiplier,trade_duration_seconds,' +
        'payout_even_odd,payout_match,payout_differ,payout_over,payout_under,' +
        'withdrawal_processing_message,mpesa_paybill,mpesa_shortcode,' +
        'min_stake_usd,max_stake_usd,min_stake_kes,max_stake_kes'
      )
      .eq('id', 1)
      .single(),
    supabase
      .from('site_settings')
      .select(
        'site_name,logo_url,favicon_url,footer_text,show_currency_switcher,maintenance_mode,whatsapp_community_url,' +
        'welcome_bonus_enabled,welcome_bonus_percent,welcome_bonus_min_deposit_kes,' +
        'welcome_bonus_trades_required,welcome_bonus_expiry_hours,' +
        'winning_toast_enabled,winning_toast_interval_min_secs,winning_toast_interval_max_secs,' +
        'winning_toast_real_win_pct,winning_toast_min_amount,winning_toast_max_amount,' +
        'buy_button_label,sell_button_label'
      )
      .eq('site_id', siteId)
      .single(),
  ])

  return NextResponse.json(
    { ...(platform as object || {}), ...(site as object || {}) },
    { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' } }
  )
}
