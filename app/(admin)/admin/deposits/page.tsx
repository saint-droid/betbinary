'use client'

import { useEffect, useState, useCallback } from 'react'
import { Check, X, PlusCircle, ChevronLeft, ChevronRight, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/components/admin/PageHeader'
import Badge from '@/components/admin/Badge'
import { TableWrap, TableHeader, TableRow, TableHead, TableBody, TableCell, EmptyRow, SkeletonRows } from '@/components/admin/Table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { useSite } from '@/components/admin/SiteContext'

export default function DepositsPage() {
  const [deposits, setDeposits] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState<any>(null)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('all')
  const [dateRange, setDateRange] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)
  const { selectedSiteId, sites, switching } = useSite()
  const siteName = (id: string | null) => sites.find(s => s.id === id)?.name ?? '—'

  const [showCredit, setShowCredit] = useState(false)
  const [creditForm, setCreditForm] = useState({ user_id: '', amount_kes: '' })

  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [users, setUsers] = useState<any[]>([])
  const [searchingUsers, setSearchingUsers] = useState(false)

  const [showEdit, setShowEdit] = useState(false)
  const [editForm, setEditForm] = useState<any>({})

  const load = useCallback((p = page) => {
    setLoading(true)
    const qs = new URLSearchParams({ page: String(p), status: status === 'all' ? '' : status, dateRange, search, ...(selectedSiteId ? { site_id: selectedSiteId } : {}) })
    fetch(`/api/admin/deposits?${qs}`)
      .then(r => r.json())
      .then(d => { setDeposits(d.deposits || []); setTotal(d.total || 0); setStats(d.stats); setLoading(false) })
  }, [page, status, dateRange, search, selectedSiteId])

  useEffect(() => { const t = setTimeout(() => { load(1); setPage(1) }, 300); return () => clearTimeout(t) }, [status, dateRange, search, selectedSiteId])

  // Realtime — refresh when any deposit is inserted or updated (e.g. admin credits balance)
  useEffect(() => {
    const ts = Date.now()
    const ch = supabase.channel(`deposits_realtime_${ts}`)
    ch.on('postgres_changes', { event: '*', schema: 'public', table: 'deposits' }, () => load()).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [load])

  useEffect(() => {
    if (!userSearchQuery || userSearchQuery.length < 2) { setUsers([]); return }
    const t = setTimeout(() => {
      setSearchingUsers(true)
      fetch(`/api/admin/users?search=${encodeURIComponent(userSearchQuery)}&limit=5`)
        .then(r => r.json())
        .then(d => { setUsers(d.users || []); setSearchingUsers(false) })
    }, 400)
    return () => clearTimeout(t)
  }, [userSearchQuery])

  async function action(deposit_id: string, act: 'approve' | 'reject' | 'delete') {
    if (act === 'delete' && !confirm('Are you sure you want to delete this deposit?')) return
    setActing(deposit_id)
    await fetch('/api/admin/deposits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: act, deposit_id }) })
    setActing(null); load()
    toast.success(act === 'approve' ? 'Approved' : act === 'reject' ? 'Rejected' : 'Deleted')
  }

  async function handleEditSubmit() {
    await fetch('/api/admin/deposits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'edit', ...editForm }) })
    setShowEdit(false); load()
    toast.success('Deposit updated')
  }

  async function manualCredit() {
    await fetch('/api/admin/deposits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'manual_credit', ...creditForm, amount_kes: parseFloat(creditForm.amount_kes) }) })
    setShowCredit(false); setCreditForm({ user_id: '', amount_kes: '' }); setUserSearchQuery(''); load()
    toast.success('Balance credited successfully')
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Deposits" description={`${total.toLocaleString()} total deposits`}
        action={
          <Button onClick={() => setShowCredit(true)}>
            <PlusCircle className="w-4 h-4 mr-2" /> Manual Credit
          </Button>
        }
      />

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-card/50"><CardContent className="p-4 flex gap-2 flex-col">
            <p className="text-sm text-muted-foreground">Total Deposits</p>
            <p className="text-2xl font-bold">KES {stats.total.amount.toLocaleString()}</p>
          </CardContent></Card>
          <Card className="bg-emerald-500/10 border-emerald-500/20"><CardContent className="p-4 flex gap-2 flex-col">
            <p className="text-sm text-emerald-600 dark:text-emerald-400">Completed</p>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">KES {stats.completed.amount.toLocaleString()}</p>
          </CardContent></Card>
          <Card className="bg-amber-500/10 border-amber-500/20"><CardContent className="p-4 flex gap-2 flex-col">
            <p className="text-sm text-amber-600 dark:text-amber-400">Pending</p>
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">KES {stats.pending.amount.toLocaleString()}</p>
          </CardContent></Card>
          <Card className="bg-rose-500/10 border-rose-500/20"><CardContent className="p-4 flex gap-2 flex-col">
            <p className="text-sm text-rose-600 dark:text-rose-400">Failed/Rejected</p>
            <p className="text-2xl font-bold text-rose-700 dark:text-rose-300">KES {stats.failed.amount.toLocaleString()}</p>

          </CardContent></Card>
        </div>
      )}

      <Dialog open={showCredit} onOpenChange={setShowCredit}>
        <DialogContent className="max-w-sm overflow-visible">
          <DialogHeader><DialogTitle>Manual Balance Credit</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5 relative">
              <Label>Search User</Label>
              <Input value={userSearchQuery} onChange={e => { setUserSearchQuery(e.target.value); setCreditForm(f => ({ ...f, user_id: '' })) }} placeholder="Search username, phone..." />
              {userSearchQuery && !creditForm.user_id && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-md z-50 max-h-48 overflow-y-auto">
                  {searchingUsers ? <div className="p-2 text-sm text-muted-foreground text-center">Searching...</div> :
                    users.length === 0 ? <div className="p-2 text-sm text-muted-foreground text-center">No users found</div> :
                      users.map(u => (
                        <div key={u.id} className="p-2 text-sm hover:bg-muted cursor-pointer" onClick={() => { setCreditForm(f => ({ ...f, user_id: u.id })); setUserSearchQuery(`${u.username} (${u.phone})`) }}>
                          <div className="font-medium">{u.username}</div>
                          <div className="text-xs text-muted-foreground">{u.phone}</div>
                        </div>
                      ))}
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Selected User ID</Label>
              <Input value={creditForm.user_id} disabled className="bg-muted/50" />
            </div>
            <div className="space-y-1.5">
              <Label>Amount (KES)</Label>
              <Input type="number" value={creditForm.amount_kes} onChange={e => setCreditForm(f => ({ ...f, amount_kes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCredit(false)}>Cancel</Button>
            <Button onClick={manualCredit} disabled={!creditForm.user_id || !creditForm.amount_kes}>Credit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Edit Deposit</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Amount (KES)</Label><Input type="number" value={editForm.amount_kes || ''} onChange={e => setEditForm((f: any) => ({ ...f, amount_kes: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>M-Pesa Ref</Label><Input value={editForm.mpesa_transaction_id || ''} onChange={e => setEditForm((f: any) => ({ ...f, mpesa_transaction_id: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Phone</Label><Input value={editForm.phone || ''} onChange={e => setEditForm((f: any) => ({ ...f, phone: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Status</Label>
              <Select value={editForm.status} onValueChange={v => setEditForm((f: any) => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="failed">Failed</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button><Button onClick={handleEditSubmit}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <Input placeholder="Search M-Pesa ref, user..." value={search} onChange={e => setSearch(e.target.value)} className="w-full sm:max-w-[250px]" />
        <Select value={status} onValueChange={v => v && setStatus(v)}>
          <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="failed">Failed</SelectItem></SelectContent>
        </Select>
        <Select value={dateRange} onValueChange={v => v && setDateRange(v)}>
          <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="Date" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Time</SelectItem><SelectItem value="today">Today</SelectItem><SelectItem value="yesterday">Yesterday</SelectItem><SelectItem value="this_week">This Week</SelectItem><SelectItem value="last_week">Last Week</SelectItem></SelectContent>
        </Select>
      </div>

      <TableWrap>
        <table className="w-full text-sm">
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead><TableHead>Amount (KES)</TableHead>
              <TableHead>Phone</TableHead><TableHead>Site</TableHead><TableHead>M-Pesa Ref</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(loading || switching) && <SkeletonRows cols={8} />}
            {!(loading || switching) && deposits.map(d => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">{(d.users as any)?.username || '—'}</TableCell>
                <TableCell>KES {Number(d.amount_kes).toLocaleString()}</TableCell>
                <TableCell className="text-muted-foreground">{d.phone}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{siteName(d.site_id)}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{d.mpesa_transaction_id || '—'}</TableCell>
                <TableCell><Badge status={d.status} /></TableCell>
                <TableCell className="text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    {d.status === 'pending' && (
                      <>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10" onClick={() => action(d.id, 'approve')} disabled={acting === d.id}><Check className="w-3.5 h-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => action(d.id, 'reject')} disabled={acting === d.id}><X className="w-3.5 h-3.5" /></Button>
                      </>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"><MoreHorizontal className="w-4 h-4" /></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditForm({ deposit_id: d.id, amount_kes: d.amount_kes, mpesa_transaction_id: d.mpesa_transaction_id, phone: d.phone, status: d.status, created_at: d.created_at }); setShowEdit(true) }}><Pencil className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => action(d.id, 'delete')} className="text-destructive"><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!loading && deposits.length === 0 && <EmptyRow cols={8} />}
          </TableBody>
        </table>
      </TableWrap>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => { setPage(p => p - 1); load(page - 1) }} disabled={page === 1}><ChevronLeft className="w-4 h-4" /></Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => { setPage(p => p + 1); load(page + 1) }} disabled={page === totalPages}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
      )}
    </div>
  )
}
