'use client'

import { useEffect, useState } from 'react'
import { PlusCircle, Pencil, Trash2, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react'
import PageHeader from '@/components/admin/PageHeader'
import { useSite } from '@/components/admin/SiteContext'
import Badge from '@/components/admin/Badge'
import { TableWrap, TableHeader, TableRow, TableHead, TableBody, TableCell, SkeletonRows } from '@/components/admin/Table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'

const COUNTRIES = [
  { code: 'KE', name: 'Kenya' }, { code: 'UG', name: 'Uganda' }, { code: 'TZ', name: 'Tanzania' },
  { code: 'NG', name: 'Nigeria' }, { code: 'GH', name: 'Ghana' }, { code: 'ZA', name: 'South Africa' },
  { code: 'US', name: 'United States' }, { code: 'GB', name: 'United Kingdom' }, { code: 'IN', name: 'India' },
  { code: 'PH', name: 'Philippines' }, { code: 'BD', name: 'Bangladesh' }, { code: 'ET', name: 'Ethiopia' },
]

const empty = {
  name: '', avatar_seed: '', country_code: 'KE',
  profit_today: 0, profit_yesterday: 0, profit_this_week: 0, profit_last_week: 0, profit_this_month: 0,
  trades_today: 0, trades_yesterday: 0, trades_this_week: 0, trades_last_week: 0, trades_this_month: 0,
  is_active: true, sort_order: 0,
}

const profitFields = [
  { k: 'profit_today', label: 'Profit Today ($)' },
  { k: 'profit_yesterday', label: 'Profit Yesterday ($)' },
  { k: 'profit_this_week', label: 'Profit This Week ($)' },
  { k: 'profit_last_week', label: 'Profit Last Week ($)' },
  { k: 'profit_this_month', label: 'Profit This Month ($)' },
]

const tradeFields = [
  { k: 'trades_today', label: 'Trades Today' },
  { k: 'trades_yesterday', label: 'Trades Yesterday' },
  { k: 'trades_this_week', label: 'Trades This Week' },
  { k: 'trades_last_week', label: 'Trades Last Week' },
  { k: 'trades_this_month', label: 'Trades This Month' },
]

export default function FakeTradersPage() {
  const { selectedSiteId, switching } = useSite()
  const [traders, setTraders] = useState<any[]>([])
  const [editing, setEditing] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [generating, setGenerating] = useState(false)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20

  function load() {
    setLoading(true)
    const url = selectedSiteId ? `/api/admin/fake-traders?site_id=${selectedSiteId}` : '/api/admin/fake-traders'
    fetch(url)
      .then(r => r.json())
      .then(d => { setTraders(d.traders || []); setLoading(false); setSelected(new Set()) })
  }

  useEffect(() => { load() }, [selectedSiteId])

  async function save() {
    const payload = editing?.id ? editing : { ...editing, site_id: selectedSiteId || null }
    const res = await fetch('/api/admin/fake-traders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const result = await res.json()
    if (result.error) { toast.error(result.error); return }
    setEditing(null)
    load()
    toast.success('Trader saved')
  }

  async function del(id: string) {
    if (!confirm('Delete this trader?')) return
    await fetch('/api/admin/fake-traders', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    load()
    toast.success('Trader deleted')
  }

  async function bulkDelete() {
    if (!confirm(`Delete ${selected.size} trader${selected.size > 1 ? 's' : ''}?`)) return
    await fetch('/api/admin/fake-traders', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: Array.from(selected) }),
    })
    load()
    toast.success(`${selected.size} trader${selected.size > 1 ? 's' : ''} deleted`)
  }

  const totalPages = Math.max(1, Math.ceil(traders.length / PAGE_SIZE))
  const paginated = traders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const allChecked = traders.length > 0 && selected.size === traders.length
  const someChecked = selected.size > 0 && selected.size < traders.length

  function toggleAll() {
    if (allChecked) setSelected(new Set())
    else setSelected(new Set(traders.map(t => t.id)))
  }

  function toggleOne(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function generate(count: number) {
    setGenerating(true)
    const res = await fetch('/api/admin/fake-traders/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count, site_id: selectedSiteId || null }),
    })
    const result = await res.json()
    setGenerating(false)
    if (result.error) { toast.error(result.error); return }
    toast.success(`Generated ${result.generated} new traders`)
    load()
  }

  const f = (k: string, v: any) => setEditing((e: any) => ({ ...e, [k]: v }))

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Fake Traders"
        description="Manage the leaderboard of simulated top traders shown on the frontend"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => generate(50)} disabled={generating}>
              <Sparkles className="w-4 h-4 mr-2" />
              {generating ? 'Generating…' : 'Generate 50'}
            </Button>
            <Button onClick={() => setEditing({ ...empty })}>
              <PlusCircle className="w-4 h-4 mr-2" /> Add Trader
            </Button>
          </div>
        }
      />

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="mb-4 flex items-center gap-3 px-4 py-2.5 rounded-lg bg-muted/50 border border-border">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <Button size="sm" variant="destructive" onClick={bulkDelete}>
            <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete Selected
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={open => !open && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Edit Trader' : 'New Trader'}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Display Name</Label>
                  <Input value={editing.name} onChange={e => f('name', e.target.value)} placeholder="e.g. James K." />
                </div>
                <div className="space-y-1.5">
                  <Label>Country</Label>
                  <select
                    value={editing.country_code}
                    onChange={e => f('country_code', e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {COUNTRIES.map(c => (
                      <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Avatar Seed <span className="text-xs text-muted-foreground">(initials or any text)</span></Label>
                  <Input value={editing.avatar_seed} onChange={e => f('avatar_seed', e.target.value)} placeholder="JK" />
                </div>
                <div className="space-y-1.5">
                  <Label>Sort Order</Label>
                  <Input type="number" value={editing.sort_order} onChange={e => f('sort_order', parseInt(e.target.value))} />
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Profit (USD)</p>
                <div className="grid grid-cols-2 gap-3">
                  {profitFields.map(({ k, label }) => (
                    <div key={k} className="space-y-1.5">
                      <Label>{label}</Label>
                      <Input type="number" value={editing[k]} onChange={e => f(k, parseFloat(e.target.value) || 0)} />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Trade Counts</p>
                <div className="grid grid-cols-2 gap-3">
                  {tradeFields.map(({ k, label }) => (
                    <div key={k} className="space-y-1.5">
                      <Label>{label}</Label>
                      <Input type="number" value={editing[k]} onChange={e => f(k, parseInt(e.target.value) || 0)} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch checked={editing.is_active} onCheckedChange={v => f('is_active', v)} id="trader-active" />
                <Label htmlFor="trader-active">Active (show on frontend)</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save}>Save Trader</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TableWrap>
        <table className="w-full text-sm">
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allChecked}
                  onCheckedChange={toggleAll}
                  aria-label="Select all"
                  {...(someChecked ? { 'data-state': 'indeterminate' } : {})}
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Profit Today</TableHead>
              <TableHead>Profit This Week</TableHead>
              <TableHead>Trades Today</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sort</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(loading || switching) && <SkeletonRows cols={9} />}
            {!(loading || switching) && paginated.map(t => (
              <TableRow key={t.id} className={selected.has(t.id) ? 'bg-muted/30' : ''}>
                <TableCell>
                  <Checkbox
                    checked={selected.has(t.id)}
                    onCheckedChange={() => toggleOne(t.id)}
                    aria-label={`Select ${t.name}`}
                  />
                </TableCell>
                <TableCell className="font-medium">{t.name}</TableCell>
                <TableCell className="text-muted-foreground">{t.country_code}</TableCell>
                <TableCell className="text-[#22c55e] font-mono">+${Number(t.profit_today).toFixed(2)}</TableCell>
                <TableCell className="text-[#22c55e] font-mono">+${Number(t.profit_this_week).toFixed(2)}</TableCell>
                <TableCell className="text-muted-foreground">{t.trades_today}</TableCell>
                <TableCell><Badge status={t.is_active ? 'active' : 'suspended'} /></TableCell>
                <TableCell className="text-muted-foreground">{t.sort_order}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing({ ...t })}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => del(t.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </table>
      </TableWrap>

      {/* Pagination */}
      {!loading && traders.length > PAGE_SIZE && (
        <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
          <span>
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, traders.length)} of {traders.length} traders
          </span>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <Button
                key={p}
                size="sm"
                variant={p === page ? 'default' : 'ghost'}
                className="h-7 w-7 text-xs"
                onClick={() => setPage(p)}
              >
                {p}
              </Button>
            ))}
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
