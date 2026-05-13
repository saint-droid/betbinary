import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { getUserSession } from '@/lib/user-auth'

const supabase = createAdminClient()

export async function POST(req: NextRequest) {
  const session = await getUserSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { amount_kes, phone } = await req.json()
  if (!amount_kes || !phone) {
    return NextResponse.json({ error: 'Amount and phone are required' }, { status: 400 })
  }

  const [{ data: settings }, { data: user }] = await Promise.all([
    supabase.from('platform_settings').select('conversion_rate,min_referral_withdrawal_kes').eq('id', 1).single(),
    supabase.from('users').select('affiliate_balance_usd,status').eq('id', session.id).single(),
  ])

  if (!settings) return NextResponse.json({ error: 'Settings unavailable' }, { status: 500 })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  if (user.status !== 'active') return NextResponse.json({ error: 'Account suspended' }, { status: 403 })

  const amt = Number(amount_kes)
  const minKes = Number(settings.min_referral_withdrawal_kes) || 100
  if (amt < minKes) {
    return NextResponse.json({ error: `Minimum affiliate withdrawal is KSh ${minKes.toLocaleString()}` }, { status: 400 })
  }

  const rate = Number(settings.conversion_rate) || 129
  const amount_usd = amt / rate
  const balance = Number(user.affiliate_balance_usd) || 0

  if (amount_usd > balance) {
    return NextResponse.json({ error: 'Insufficient affiliate balance' }, { status: 400 })
  }

  // Check no existing pending withdrawal
  const { count } = await supabase
    .from('affiliate_withdrawals')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', session.id)
    .eq('status', 'pending')

  if ((count ?? 0) > 0) {
    return NextResponse.json({ error: 'You already have a withdrawal being processed' }, { status: 400 })
  }

  // Deduct affiliate balance
  await supabase
    .from('users')
    .update({ affiliate_balance_usd: balance - amount_usd })
    .eq('id', session.id)

  const { error } = await supabase.from('affiliate_withdrawals').insert({
    user_id: session.id,
    amount_kes: amt,
    amount_usd,
    phone: String(phone).replace(/\s/g, ''),
    status: 'pending',
  })

  if (error) {
    // Rollback
    await supabase.from('users').update({ affiliate_balance_usd: balance }).eq('id', session.id)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: 'Your withdrawal is being processed.',
  })
}
