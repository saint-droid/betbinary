// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { getUserSession } from '@/lib/user-auth'
import { initiateStkPush } from '@/lib/mpesa'
import { getSiteId } from '@/lib/site'

const supabase = createAdminClient()

async function applyBonus(userId: string, bonusUsd: number, tradesRequired: number, expiryHours: number) {
  const expiresAt = new Date(Date.now() + expiryHours * 3600 * 1000).toISOString()
  await supabase.from('users').update({
    bonus_balance_usd: bonusUsd,
    bonus_trades_remaining: tradesRequired,
    bonus_expires_at: expiresAt,
  }).eq('id', userId)
}

export async function POST(req: NextRequest) {
  const session = await getUserSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { amount_kes, phone } = await req.json()
  if (!amount_kes || !phone) {
    return NextResponse.json({ error: 'Amount and phone are required' }, { status: 400 })
  }

  const siteId = getSiteId()
  const [{ data: platformSettings }, { data: siteSettings }] = await Promise.all([
    supabase.from('platform_settings')
      .select('conversion_rate,min_deposit_kes,max_deposit_kes,mpesa_consumer_key,mpesa_consumer_secret,mpesa_shortcode,mpesa_paybill,mpesa_passkey')
      .eq('id', 1).single(),
    supabase.from('site_settings')
      .select('welcome_bonus_enabled,welcome_bonus_percent,welcome_bonus_min_deposit_kes,welcome_bonus_trades_required,welcome_bonus_expiry_hours')
      .eq('site_id', siteId).single(),
  ])
  const settings = { ...platformSettings, ...siteSettings }

  if (!platformSettings) return NextResponse.json({ error: 'Settings unavailable' }, { status: 500 })

  const amt = Number(amount_kes)
  if (amt < Number(settings.min_deposit_kes)) {
    return NextResponse.json({ error: `Minimum deposit is KSh ${settings.min_deposit_kes}` }, { status: 400 })
  }
  if (amt > Number(settings.max_deposit_kes)) {
    return NextResponse.json({ error: `Maximum deposit is KSh ${settings.max_deposit_kes}` }, { status: 400 })
  }

  const rate = Number(settings.conversion_rate)
  const amount_usd = amt / rate

  const { data: userRow } = await supabase
    .from('users')
    .select('balance_usd, account_type')
    .eq('id', session.id)
    .single()

  const isVip = userRow?.account_type === 'vip'

  // Check welcome bonus eligibility (first completed deposit only)
  const { count: prevDeposits } = await supabase
    .from('deposits')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', session.id)
    .eq('status', 'completed')

  const isFirstDeposit = (prevDeposits ?? 0) === 0
  const welcomeBonus =
    settings.welcome_bonus_enabled &&
    isFirstDeposit &&
    amt >= Number(settings.welcome_bonus_min_deposit_kes)
  const bonusAmount = welcomeBonus ? (amount_usd * Number(settings.welcome_bonus_percent) / 100) : 0
  const tradesRequired = Number(settings.welcome_bonus_trades_required || 10)
  const expiryHours = Number(settings.welcome_bonus_expiry_hours || 4)

  // Create deposit record
  const { data: deposit, error: insertErr } = await supabase
    .from('deposits')
    .insert({
      user_id: session.id,
      amount_kes: amt,
      amount_usd,
      conversion_rate_used: rate,
      phone: String(phone).replace(/\s/g, ''),
      status: 'pending',
      bonus_applied: welcomeBonus,
      bonus_amount_usd: bonusAmount,
      site_id: getSiteId(),
    })
    .select()
    .single()

  if (insertErr || !deposit) {
    return NextResponse.json({ error: insertErr?.message || 'Failed to create deposit' }, { status: 500 })
  }

  // VIP users: auto-confirm immediately, no M-Pesa needed
  if (isVip) {
    await supabase.from('users')
      .update({ balance_usd: Number(userRow?.balance_usd ?? 0) + amount_usd })
      .eq('id', session.id)
    if (welcomeBonus) await applyBonus(session.id, bonusAmount, tradesRequired, expiryHours)
    await supabase.from('deposits').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', deposit.id)
    return NextResponse.json({
      success: true,
      depositId: deposit.id,
      bonus_applied: welcomeBonus,
      bonus_amount_usd: bonusAmount,
      message: `Deposit of KSh ${amt.toLocaleString()} confirmed.${welcomeBonus ? ` Welcome bonus of KSh ${(bonusAmount * rate).toLocaleString()} added!` : ''}`,
      requiresCallback: false,
    })
  }

  // Standard users: require M-Pesa STK push
  const mpesaShortcode = settings.mpesa_shortcode || settings.mpesa_paybill
  if (settings.mpesa_consumer_key && settings.mpesa_consumer_secret && mpesaShortcode) {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
      const callbackUrl = `https://${projectRef}.supabase.co/functions/v1/mpesa-deposit-callback`

      const stkResult = await initiateStkPush({
        phone: String(phone),
        amountKes: amt,
        accountRef: deposit.id.slice(0, 12).toUpperCase(),
        description: 'Deposit',
        callbackUrl,
      })

      if (stkResult?.CheckoutRequestID) {
        await supabase
          .from('deposits')
          .update({ mpesa_transaction_id: stkResult.CheckoutRequestID })
          .eq('id', deposit.id)

        return NextResponse.json({
          success: true,
          depositId: deposit.id,
          checkoutRequestId: stkResult.CheckoutRequestID,
          message: 'Check your phone for the M-Pesa payment prompt.',
          requiresCallback: true,
        })
      }
    } catch (mpesaErr: any) {
      await supabase.from('deposits').update({ status: 'failed' }).eq('id', deposit.id)
      return NextResponse.json({ error: `M-Pesa error: ${mpesaErr.message}` }, { status: 502 })
    }
  }

  // M-Pesa not configured — auto-confirm for testing/dev
  await supabase.rpc('fn_credit_balance', { p_user_id: session.id, p_amount: amount_usd, p_is_demo: false })
  if (welcomeBonus) await applyBonus(session.id, bonusAmount, tradesRequired, expiryHours)
  await supabase.from('deposits').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', deposit.id)
  return NextResponse.json({
    success: true,
    depositId: deposit.id,
    bonus_applied: welcomeBonus,
    bonus_amount_usd: bonusAmount,
    message: `Deposit of KSh ${amt.toLocaleString()} confirmed.${welcomeBonus ? ` Welcome bonus of KSh ${Math.round(bonusAmount * rate).toLocaleString()} added!` : ''}`,
    requiresCallback: false,
  })
}
