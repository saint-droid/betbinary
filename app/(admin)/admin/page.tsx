'use client'

import { useEffect, useState } from 'react'
import { Users, ArrowDownCircle, ArrowUpCircle, BarChart2, TrendingUp, Clock, Activity, DollarSign } from 'lucide-react'
import StatCard from '@/components/admin/StatCard'
import Badge from '@/components/admin/Badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useSite } from '@/components/admin/SiteContext'

interface Stats {
  total_users: number; active_today: number; deposits_today_kes: number
  withdrawals_today_kes: number; trades_today: number; platform_profit_kes: number
  pending_withdrawals: number; active_trades_now: number
  deposits_alltime_kes: number; withdrawals_alltime_kes: number
  manual_credits_today_kes: number; manual_credits_alltime_kes: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentUsers, setRecentUsers] = useState<any[]>([])
  const [recentDeposits, setRecentDeposits] = useState<any[]>([])
  const [recentWithdrawals, setRecentWithdrawals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { selectedSiteId, selectedSite, switching } = useSite()

  useEffect(() => {
    setLoading(true)
    const url = selectedSiteId
      ? `/api/admin/dashboard?site_id=${selectedSiteId}`
      : '/api/admin/dashboard'
    fetch(url).then(r => r.json()).then(d => {
      setStats(d.stats); setRecentUsers(d.recentUsers || [])
      setRecentDeposits(d.recentDeposits || []); setRecentWithdrawals(d.recentWithdrawals || [])
      setLoading(false)
    })
  }, [selectedSiteId])

  const fmt = (n: number) => n?.toLocaleString('en-KE', { maximumFractionDigits: 0 }) || '0'

  const cards = stats ? [
    { label: 'Total Users',          value: fmt(stats.total_users),                                 icon: Users,           iconBg: 'rgba(96,165,250,0.15)',  iconColor: '#60a5fa' },
    { label: 'Active Today',          value: fmt(stats.active_today),                                icon: Activity,        iconBg: 'rgba(74,222,128,0.15)',  iconColor: '#4ade80' },
    { label: 'All-Time Deposits',     value: `KES ${fmt(stats.deposits_alltime_kes)}`,               icon: ArrowDownCircle, iconBg: 'rgba(52,211,153,0.15)',  iconColor: '#34d399' },
    { label: 'All-Time Withdrawals',  value: `KES ${fmt(stats.withdrawals_alltime_kes)}`,            icon: ArrowUpCircle,   iconBg: 'rgba(248,113,113,0.15)', iconColor: '#f87171' },
    { label: 'Deposits Today',        value: `KES ${fmt(stats.deposits_today_kes)}`,                 icon: ArrowDownCircle, iconBg: 'rgba(74,222,128,0.15)',  iconColor: '#4ade80' },
    { label: 'Withdrawals Today',     value: `KES ${fmt(stats.withdrawals_today_kes)}`,              icon: ArrowUpCircle,   iconBg: 'rgba(248,113,113,0.15)', iconColor: '#f87171' },
    { label: 'Manual Credits Today',  value: `KES ${fmt(stats.manual_credits_today_kes)}`,           icon: DollarSign,      iconBg: 'rgba(251,191,36,0.15)',  iconColor: '#fbbf24' },
    { label: 'Trades Today',          value: fmt(stats.trades_today),                                icon: BarChart2,       iconBg: 'rgba(192,132,252,0.15)', iconColor: '#c084fc' },
    { label: 'Platform Profit',       value: `KES ${fmt(stats.platform_profit_kes)}`,               icon: TrendingUp,      iconBg: 'rgba(34,211,238,0.15)',  iconColor: '#22d3ee' },
    { label: 'Pending Withdrawals',   value: fmt(stats.pending_withdrawals),                         icon: Clock,           iconBg: 'rgba(249,115,22,0.15)',  iconColor: '#f97316' },
  ] : []

  return (
    <div className="p-6 lg:p-8">
      {selectedSite && (
        <p className="text-xs text-muted-foreground mb-4">
          Showing data for <span className="font-semibold text-foreground">{selectedSite.name}</span>
        </p>
      )}
      {(loading || switching) ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {cards.map(c => <StatCard key={c.label} {...c} />)}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <ActivityPanel title="Recent Signups" empty={recentUsers.length === 0}>
          {recentUsers.map(u => (
            <ActivityRow key={u.id} primary={u.username} secondary={u.phone} right={<Badge status={u.account_type} />} />
          ))}
        </ActivityPanel>
        <ActivityPanel title="Recent Deposits" empty={recentDeposits.length === 0}>
          {recentDeposits.map((d: any) => (
            <ActivityRow key={d.id} primary={(d.users as any)?.username || '—'} secondary={`KES ${Number(d.amount_kes).toLocaleString()}`} right={<Badge status={d.status} />} />
          ))}
        </ActivityPanel>
        <ActivityPanel title="Recent Withdrawals" empty={recentWithdrawals.length === 0}>
          {recentWithdrawals.map((w: any) => (
            <ActivityRow key={w.id} primary={(w.users as any)?.username || '—'} secondary={`KES ${Number(w.amount_kes).toLocaleString()}`} right={<Badge status={w.status} />} />
          ))}
        </ActivityPanel>
      </div>
    </div>
  )
}

function ActivityPanel({ title, children, empty }: { title: string; children: React.ReactNode; empty: boolean }) {
  return (
    <Card>
      <CardHeader className="px-5 py-4 border-b border-border">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0 divide-y divide-border">
        {empty
          ? <p className="px-5 py-6 text-sm text-center text-muted-foreground">No records yet.</p>
          : children}
      </CardContent>
    </Card>
  )
}

function ActivityRow({ primary, secondary, right }: { primary: string; secondary: string; right: React.ReactNode }) {
  return (
    <div className="px-5 py-3 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{primary}</p>
        <p className="text-xs text-muted-foreground truncate">{secondary}</p>
      </div>
      <div className="shrink-0">{right}</div>
    </div>
  )
}
