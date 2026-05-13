// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { getUserSession } from '@/lib/user-auth'
import { getSiteId } from '@/lib/site'

const supabase = createAdminClient()

export async function POST(req: NextRequest) {
  const session = await getUserSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { amount_kes, phone } = await req.json()
  if (!amount_kes || !phone) {
    return NextResponse.json({ error: 'Amount and phone are required' }, { status: 400 })
  }

  const [{ data: settings }, { data: user }] = await Promise.all([
    supabase
      .from('platform_settings')
      .select(
        'conversion_rate,min_withdrawal_kes,max_withdrawal_kes,withdrawal_paused,' +
        'allow_multiple_pending_withdrawals,withdrawal_approval_mode,' +
        'auto_approve_withdrawal_threshold,withdrawal_processing_message'
      )
      .eq('id', 1)
      .single(),
    supabase
      .from('users')
      .select('balance_usd,status')
      .eq('id', session.id)
      .single(),
  ])

  if (!settings) return NextResponse.json({ error: 'Settings unavailable' }, { status: 500 })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  if (user.status !== 'active') return NextResponse.json({ error: 'Account suspended' }, { status: 403 })
  if (settings.withdrawal_paused) {
    return NextResponse.json({ error: 'Withdrawals are temporarily paused. Please try again later.' }, { status: 400 })
  }

  const amt = Number(amount_kes)
  if (amt < Number(settings.min_withdrawal_kes)) {
    return NextResponse.json({ error: `Minimum withdrawal is KSh ${settings.min_withdrawal_kes}` }, { status: 400 })
  }
  if (amt > Number(settings.max_withdrawal_kes)) {
    return NextResponse.json({ error: `Maximum withdrawal is KSh ${settings.max_withdrawal_kes}` }, { status: 400 })
  }

  const rate = Number(settings.conversion_rate)
  const amount_usd = amt / rate

  if (Number(user.balance_usd) < amount_usd) {
    return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 })
  }

  // Check for existing pending withdrawal
  if (!settings.allow_multiple_pending_withdrawals) {
    const { count } = await supabase
      .from('withdrawals')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', session.id)
      .in('status', ['pending', 'approved', 'processing'])

    if ((count ?? 0) > 0) {
      return NextResponse.json({
        error: 'You already have a pending withdrawal. Please wait for it to be processed.',
      }, { status: 400 })
    }
  }

  const mode = settings.withdrawal_approval_mode
  const autoApprove =
    mode === 'auto_all' ||
    (mode === 'auto_threshold' && amt <= Number(settings.auto_approve_withdrawal_threshold))
  const status = autoApprove ? 'approved' : 'pending'

  // Deduct balance
  await supabase
    .from('users')
    .update({ balance_usd: Number(user.balance_usd) - amount_usd })
    .eq('id', session.id)

  const { data: withdrawal, error } = await supabase
    .from('withdrawals')
    .insert({
      user_id: session.id,
      amount_kes: amt,
      amount_usd,
      conversion_rate_used: rate,
      phone: String(phone).replace(/\s/g, ''),
      status,
      approval_mode: autoApprove ? 'auto' : 'manual',
      site_id: getSiteId(),
    })
    .select()
    .single()

  if (error || !withdrawal) {
    // Rollback balance
    await supabase.from('users').update({ balance_usd: Number(user.balance_usd) }).eq('id', session.id)
    return NextResponse.json({ error: error?.message || 'Failed to create withdrawal' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    withdrawal,
    message: autoApprove
      ? 'Your withdrawal is being processed. Funds will arrive shortly.'
      : settings.withdrawal_processing_message || 'Withdrawal submitted. Pending admin approval.',
  })
}
