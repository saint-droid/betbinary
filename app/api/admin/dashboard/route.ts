import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const siteId = searchParams.get('site_id') || ''

  const db = createAdminClient()
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const todayISO = todayStart.toISOString()

  // Build site-scoped queries
  let usersQ = db.from('users').select('id, last_login, created_at', { count: 'exact', head: false })
  let depositsQ = db.from('deposits').select('amount_kes, status, phone, mpesa_transaction_id, created_at', { count: 'exact', head: false })
  let withdrawalsQ = db.from('withdrawals').select('amount_kes, amount_usd, status, phone, created_at', { count: 'exact', head: false })
  let tradesQ = db.from('trades').select('created_at, outcome, amount_usd, payout_usd', { count: 'exact', head: false })

  if (siteId) {
    usersQ = usersQ.eq('site_id', siteId)
    depositsQ = depositsQ.eq('site_id', siteId)
    withdrawalsQ = withdrawalsQ.eq('site_id', siteId)
    tradesQ = tradesQ.eq('site_id', siteId)
  }

  const [
    { data: allUsers },
    { data: allDeposits },
    { data: allWithdrawals },
    { data: allTrades },
  ] = await Promise.all([
    usersQ,
    depositsQ,
    withdrawalsQ,
    tradesQ.neq('outcome', 'pending').eq('is_demo', false),
  ])

  // Compute stats
  const total_users = allUsers?.length ?? 0
  const active_today = (allUsers || []).filter((u: any) => u.last_login && u.last_login >= todayISO).length

  const completedDeposits = (allDeposits || []).filter((d: any) => d.status === 'completed')
  const realDeposits = completedDeposits.filter((d: any) => d.mpesa_transaction_id && d.phone !== 'MANUAL')
  const manualDeposits = completedDeposits.filter((d: any) => d.phone === 'MANUAL')
  const deposits_alltime_kes = realDeposits.reduce((s: number, d: any) => s + Number(d.amount_kes), 0)
  const deposits_today_kes = realDeposits.filter((d: any) => d.created_at >= todayISO).reduce((s: number, d: any) => s + Number(d.amount_kes), 0)
  const manual_credits_today_kes = manualDeposits.filter((d: any) => d.created_at >= todayISO).reduce((s: number, d: any) => s + Number(d.amount_kes), 0)
  const manual_credits_alltime_kes = manualDeposits.reduce((s: number, d: any) => s + Number(d.amount_kes), 0)

  const realWithdrawals = (allWithdrawals || []).filter((w: any) => w.phone !== 'tournament')
  const completedWithdrawals = realWithdrawals.filter((w: any) => w.status === 'completed')
  const withdrawals_alltime_kes = completedWithdrawals.reduce((s: number, w: any) => s + Number(w.amount_kes), 0)
  const withdrawals_today_kes = completedWithdrawals.filter((w: any) => w.created_at >= todayISO).reduce((s: number, w: any) => s + Number(w.amount_kes), 0)
  const pending_withdrawals = realWithdrawals.filter((w: any) => ['pending', 'approved', 'processing'].includes(w.status)).length

  const trades_today = (allTrades || []).filter((t: any) => t.created_at >= todayISO).length

  // Platform profit = completed M-Pesa deposits minus completed M-Pesa withdrawals
  const platform_profit_kes = deposits_alltime_kes - withdrawals_alltime_kes

  const stats = {
    total_users, active_today,
    deposits_alltime_kes, deposits_today_kes,
    withdrawals_alltime_kes, withdrawals_today_kes,
    manual_credits_today_kes, manual_credits_alltime_kes,
    trades_today, platform_profit_kes, pending_withdrawals,
    active_trades_now: 0,
  }

  // Recent lists — also site-scoped
  let recentUsersQ = db.from('users').select('id, username, phone, account_type, created_at').order('created_at', { ascending: false }).limit(5)
  let recentDepositsQ = db.from('deposits').select('id, amount_kes, status, created_at, users(username)').not('mpesa_transaction_id', 'is', null).neq('phone', 'MANUAL').order('created_at', { ascending: false }).limit(5)
  let recentWithdrawalsQ = db.from('withdrawals').select('id, amount_kes, status, created_at, users(username)').neq('phone', 'tournament').in('status', ['pending', 'approved', 'processing', 'completed', 'cancelled', 'rejected']).order('created_at', { ascending: false }).limit(5)

  if (siteId) {
    recentUsersQ = recentUsersQ.eq('site_id', siteId)
    recentDepositsQ = recentDepositsQ.eq('site_id', siteId)
    recentWithdrawalsQ = recentWithdrawalsQ.eq('site_id', siteId)
  }

  const [{ data: recentUsers }, { data: recentDeposits }, { data: recentWithdrawals }] = await Promise.all([
    recentUsersQ, recentDepositsQ, recentWithdrawalsQ,
  ])

  return NextResponse.json({ stats, recentUsers, recentDeposits, recentWithdrawals })
}
