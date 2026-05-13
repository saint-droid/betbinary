import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { getUserSession } from '@/lib/user-auth'

const supabase = createAdminClient()

export async function GET() {
  const session = await getUserSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: user } = await supabase
    .from('users')
    .select('referral_code,affiliate_balance_usd')
    .eq('id', session.id)
    .single()

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Count direct referrals
  const { count: referralCount } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('referred_by', session.id)

  // Commission totals
  const { data: commissions } = await supabase
    .from('referral_commissions')
    .select('amount_usd,status')
    .eq('beneficiary_id', session.id)

  const totalCommission = (commissions || []).reduce((s: number, c: any) => s + Number(c.amount_usd), 0)
  const pendingCommission = (commissions || [])
    .filter((c: any) => c.status === 'pending')
    .reduce((s: number, c: any) => s + Number(c.amount_usd), 0)
  const paidCommission = (commissions || [])
    .filter((c: any) => c.status === 'paid')
    .reduce((s: number, c: any) => s + Number(c.amount_usd), 0)

  // Recent referrals — mask username for privacy
  const { data: referred } = await supabase
    .from('users')
    .select('id,username,phone,created_at')
    .eq('referred_by', session.id)
    .order('created_at', { ascending: false })
    .limit(50)

  // Map commissions per referred user
  const { data: commissionsByUser } = await supabase
    .from('referral_commissions')
    .select('from_user_id,amount_usd,status')
    .eq('beneficiary_id', session.id)

  const commissionMap: Record<string, { total: number; status: string }> = {}
  for (const c of commissionsByUser || []) {
    if (!commissionMap[c.from_user_id]) {
      commissionMap[c.from_user_id] = { total: 0, status: c.status }
    }
    commissionMap[c.from_user_id].total += Number(c.amount_usd)
  }

  function maskUsername(username: string) {
    if (username.length <= 3) return username[0] + '***'
    return username.slice(0, 2) + '***' + username.slice(-1)
  }

  function maskPhone(phone: string) {
    if (!phone || phone.length < 6) return '***'
    return phone.slice(0, 3) + '****' + phone.slice(-2)
  }

  const referrals = (referred || []).map((u: any) => ({
    id: u.id,
    display_name: maskUsername(u.username),
    display_phone: maskPhone(u.phone || ''),
    created_at: u.created_at,
    commission_usd: commissionMap[u.id]?.total ?? 0,
    status: (commissionMap[u.id]?.total ?? 0) > 0 ? 'active' : 'joined',
  }))

  // Affiliate withdrawal history
  const { data: withdrawals } = await supabase
    .from('affiliate_withdrawals')
    .select('id,amount_kes,status,created_at')
    .eq('user_id', session.id)
    .order('created_at', { ascending: false })
    .limit(10)

  return NextResponse.json({
    stats: {
      referral_code: user.referral_code || '',
      referral_count: referralCount ?? 0,
      total_commission_usd: totalCommission,
      pending_commission_usd: pendingCommission,
      paid_commission_usd: paidCommission,
      affiliate_balance_usd: Number(user.affiliate_balance_usd) || 0,
    },
    referrals,
    withdrawals: withdrawals || [],
  })
}
