'use client'

import { useEffect, useState } from 'react'
import { Check, X, AlertTriangle, ChevronLeft, ChevronRight, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
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

export default function WithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<any[]>([])
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

  const [rejectModal, setRejectModal] = useState<{ id: string } | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const [showEdit, setShowEdit] = useState(false)
  const [editForm, setEditForm] = useState<any>({})

  function load(p = page) {
    setLoading(true)
    const qs = new URLSearchParams({ page: String(p), status: status === 'all' ? '' : status, dateRange, search, ...(selectedSiteId ? { site_id: selectedSiteId } : {}) })
    fetch(`/api/admin/withdrawals?${qs}`)
      .then(r => r.json())
      .then(d => { setWithdrawals(d.withdrawals || []); setTotal(d.total || 0); setStats(d.stats); setLoading(false) })
  }

  useEffect(() => { const t = setTimeout(() => { load(1); setPage(1) }, 300); return () => clearTimeout(t) }, [status, dateRange, search, selectedSiteId])

  async function approve(id: string) {
    setActing(id)
    const res = await fetch('/api/admin/withdrawals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'approve', withdrawal_id: id }) })
    const data = await res.json()
    setActing(null); load()
    if (res.ok) toast.success(data.message || 'Withdrawal approved & B2C payment initiated')
    else toast.error(data.error || 'Approval failed')
  }

  async function reject() {
    if (!rejectModal) return
    await fetch('/api/admin/withdrawals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reject', withdrawal_id: rejectModal.id, reason: rejectReason }) })
    setRejectModal(null); setRejectReason(''); load(); toast.success('Withdrawal rejected')
  }

  async function handleEditSubmit() {
    await fetch('/api/admin/withdrawals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'edit', ...editForm }) })
    setShowEdit(false); load()
    toast.success('Withdrawal updated')
  }

  async function deleteWithdrawal(id: string) {
    if (!confirm('Are you sure you want to delete this withdrawal?')) return
    setActing(id)
    await fetch('/api/admin/withdrawals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', withdrawal_id: id }) })
    setActing(null); load()
    toast.success('Withdrawal deleted')
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Withdrawals" description={`${total.toLocaleString()} total withdrawals`} />

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-card/50"><CardContent className="p-4 flex gap-2 flex-col">
            <p className="text-sm text-muted-foreground">Total Withdrawals</p>
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

      <Dialog open={!!rejectModal} onOpenChange={open => !open && setRejectModal(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Reject Withdrawal</DialogTitle></DialogHeader>
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Select value={rejectReason} onValueChange={v => v && setRejectReason(v)}>
              <SelectTrigger><SelectValue placeholder="Select reason…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Insufficient trading activity">Insufficient trading activity</SelectItem>
                <SelectItem value="Verification required">Verification required</SelectItem>
                <SelectItem value="Suspicious activity">Suspicious activity</SelectItem>
                <SelectItem value="Account under review">Account under review</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectModal(null)}>Cancel</Button>
            <Button variant="destructive" onClick={reject}>Confirm Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Edit Withdrawal</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Amount (KES)</Label><Input type="number" value={editForm.amount_kes || ''} onChange={e => setEditForm((f: any) => ({ ...f, amount_kes: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>M-Pesa Ref</Label><Input value={editForm.mpesa_transaction_id || ''} onChange={e => setEditForm((f: any) => ({ ...f, mpesa_transaction_id: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Phone</Label><Input value={editForm.phone || ''} onChange={e => setEditForm((f: any) => ({ ...f, phone: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Status</Label>
              <Select value={editForm.status} onValueChange={v => setEditForm((f: any) => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
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
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
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
              <TableHead>User</TableHead><TableHead>Amount (KES)</TableHead><TableHead>Total Deposited</TableHead>
              <TableHead>Phone</TableHead><TableHead>Site</TableHead><TableHead>M-Pesa Ref</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(loading || switching) && <SkeletonRows cols={9} />}
            {!(loading || switching) && withdrawals.map(w => (
              <TableRow key={w.id}>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium">{(w.users as any)?.username || '—'}</span>
                    {w.is_profit_withdrawal && <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
                  </div>
                </TableCell>
                <TableCell>KES {Number(w.amount_kes).toLocaleString()}</TableCell>
                <TableCell className="text-muted-foreground">KES {Number(w.user_total_deposited).toLocaleString()}</TableCell>
                <TableCell className="text-muted-foreground">{w.phone}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{siteName(w.site_id)}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{w.mpesa_transaction_id || '—'}</TableCell>
                <TableCell><Badge status={w.status} /></TableCell>
                <TableCell className="text-muted-foreground">{new Date(w.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    {w.status === 'pending' && (
                      <>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10" onClick={() => approve(w.id)} disabled={acting === w.id}><Check className="w-3.5 h-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setRejectModal({ id: w.id })}><X className="w-3.5 h-3.5" /></Button>
                      </>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"><MoreHorizontal className="w-4 h-4" /></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditForm({ withdrawal_id: w.id, amount_kes: w.amount_kes, mpesa_transaction_id: w.mpesa_transaction_id, phone: w.phone, status: w.status, created_at: w.created_at }); setShowEdit(true) }}><Pencil className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => deleteWithdrawal(w.id)} className="text-destructive"><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!loading && withdrawals.length === 0 && <EmptyRow cols={9} />}
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
