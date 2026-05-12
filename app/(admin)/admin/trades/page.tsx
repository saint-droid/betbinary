'use client'

import { useEffect, useState, useRef } from 'react'
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import PageHeader from '@/components/admin/PageHeader'
import Badge from '@/components/admin/Badge'
import { TableWrap, TableHeader, TableRow, TableHead, TableBody, TableCell, EmptyRow, SkeletonRows } from '@/components/admin/Table'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useSite } from '@/components/admin/SiteContext'

export default function TradesPage() {
  const [trades, setTrades] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [outcome, setOutcome] = useState('all')
  const [isDemo, setIsDemo] = useState('all')
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pageRef = useRef(page)
  const { selectedSiteId, switching } = useSite()
  pageRef.current = page

  function load(p = pageRef.current, silent = false) {
    if (!silent) setLoading(true)
    const q = new URLSearchParams({
      page: String(p),
      outcome: outcome === 'all' ? '' : outcome,
      is_demo: isDemo === 'all' ? '' : isDemo,
      ...(selectedSiteId ? { site_id: selectedSiteId } : {}),
    }).toString()
    fetch(`/api/admin/trades?${q}`)
      .then(r => r.json())
      .then(d => {
        setTrades(d.trades || [])
        setTotal(d.total || 0)
        setLastRefresh(new Date())
        if (!silent) setLoading(false)
        else setLoading(false)
      })
  }

  useEffect(() => {
    load(1)
    setPage(1)
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(() => load(pageRef.current, true), 5000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [outcome, isDemo, selectedSiteId])

  const totalPages = Math.ceil(total / 20)

  function formatTime(dateStr: string) {
    const d = new Date(dateStr)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString()
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-1">
        <PageHeader title="Trade History" description={`${total.toLocaleString()} total trades`} />
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <RefreshCw className="w-3 h-3 animate-spin opacity-40" />
          {lastRefresh ? `Updated ${lastRefresh.toLocaleTimeString()}` : 'Loading…'}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <Select value={outcome} onValueChange={v => v && setOutcome(v)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Outcomes</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="win">Win</SelectItem>
            <SelectItem value="loss">Loss</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={isDemo} onValueChange={v => v && setIsDemo(v)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Real & Demo</SelectItem>
            <SelectItem value="false">Real Only</SelectItem>
            <SelectItem value="true">Demo Only</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => load(page)} className="ml-auto">
          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
        </Button>
      </div>

      <TableWrap>
        <table className="w-full text-sm">
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Pair</TableHead>
              <TableHead>Dir</TableHead>
              <TableHead>Stake</TableHead>
              <TableHead>Entry</TableHead>
              <TableHead>Exit</TableHead>
              <TableHead>Payout</TableHead>
              <TableHead>Outcome</TableHead>
              <TableHead>Demo</TableHead>
              <TableHead>Forced</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(loading || switching) && <SkeletonRows cols={12} />}
            {!(loading || switching) && trades.map(t => (
              <TableRow key={t.id} className={t.outcome === 'pending' ? 'bg-amber-500/5' : ''}>
                <TableCell className="font-medium">{(t.users as any)?.username || '—'}</TableCell>
                <TableCell className="text-muted-foreground">{(t.binary_pairs as any)?.display_name || (t.binary_pairs as any)?.symbol || '—'}</TableCell>
                <TableCell>
                  <span className={cn('text-xs font-bold uppercase', t.direction === 'buy' ? 'text-emerald-500' : 'text-destructive')}>
                    {t.direction}
                  </span>
                </TableCell>
                <TableCell>KES {Number(t.amount_kes || 0).toLocaleString()}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{Number(t.entry_price).toFixed(5)}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {t.exit_price ? Number(t.exit_price).toFixed(5) : <span className="opacity-40">—</span>}
                </TableCell>
                <TableCell className={cn('font-semibold text-xs', Number(t.payout_usd) > 0 ? 'text-emerald-500' : 'text-muted-foreground')}>
                  {Number(t.payout_usd) > 0 ? `KES ${Math.round(Number(t.payout_usd) * 129).toLocaleString()}` : '—'}
                </TableCell>
                <TableCell><Badge status={t.outcome} /></TableCell>
                <TableCell className="text-muted-foreground text-xs">{t.is_demo ? 'Yes' : 'No'}</TableCell>
                <TableCell className={cn('text-xs', t.house_forced ? 'text-amber-400' : 'text-muted-foreground')}>
                  {t.house_forced ? 'Yes' : 'No'}
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">{formatDate(t.created_at)}</TableCell>
                <TableCell className="text-muted-foreground text-xs font-mono">{formatTime(t.created_at)}</TableCell>
              </TableRow>
            ))}
            {!loading && trades.length === 0 && <EmptyRow cols={12} />}
          </TableBody>
        </table>
      </TableWrap>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button
              variant="outline" size="icon" className="h-8 w-8"
              onClick={() => { const p = page - 1; setPage(p); load(p) }}
              disabled={page === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline" size="icon" className="h-8 w-8"
              onClick={() => { const p = page + 1; setPage(p); load(p) }}
              disabled={page === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
