'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Search, ChevronLeft, ChevronRight, UserPlus, Eye, EyeOff } from 'lucide-react'
import PageHeader from '@/components/admin/PageHeader'
import Badge from '@/components/admin/Badge'
import { TableWrap, TableHeader, TableRow, TableHead, TableBody, TableCell, EmptyRow, SkeletonRows } from '@/components/admin/Table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useSite } from '@/components/admin/SiteContext'

const emptyForm = { username: '', phone: '', password: '', account_type: 'standard', balance_usd: '0' }

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [type, setType] = useState('all')
  const [status, setStatus] = useState('all')
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ ...emptyForm })
  const [showPass, setShowPass] = useState(false)
  const [creating, setCreating] = useState(false)
  const { selectedSiteId, sites, switching } = useSite()
  const siteName = (id: string | null) => sites.find(s => s.id === id)?.name ?? '—'

  function load(p = page) {
    setLoading(true)
    const q = new URLSearchParams({ page: String(p), search, type: type === 'all' ? '' : type, status: status === 'all' ? '' : status, ...(selectedSiteId ? { site_id: selectedSiteId } : {}) }).toString()
    fetch(`/api/admin/users?${q}`)
      .then(r => r.json())
      .then(d => { setUsers(d.users || []); setTotal(d.total || 0); setLoading(false) })
  }

  useEffect(() => { load(1); setPage(1) }, [search, type, status, selectedSiteId])

  async function createUser() {
    if (!form.username || !form.phone || !form.password) {
      toast.error('Username, phone and password are required')
      return
    }
    setCreating(true)
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, balance_usd: parseFloat(form.balance_usd) || 0, site_id: selectedSiteId || undefined }),
    })
    const data = await res.json()
    setCreating(false)
    if (!res.ok) { toast.error(data.error || 'Failed to create user'); return }
    toast.success(`User @${data.user.username} created`)
    setShowAdd(false)
    setForm({ ...emptyForm })
    load(1); setPage(1)
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Users"
        description={`${total.toLocaleString()} total users`}
        action={
          <Button onClick={() => setShowAdd(true)}>
            <UserPlus className="w-4 h-4 mr-2" /> Add User
          </Button>
        }
      />

      <Dialog open={showAdd} onOpenChange={open => { setShowAdd(open); if (!open) setForm({ ...emptyForm }) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add New User</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Username</Label>
              <Input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="john_doe" />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+254700000000" />
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <div className="relative">
                <Input
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                  className="pr-9"
                />
                <Button type="button" variant="ghost" size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
                  onClick={() => setShowPass(v => !v)}>
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Account Type</Label>
                <Select value={form.account_type} onValueChange={v => v && setForm(f => ({ ...f, account_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="vip">VIP</SelectItem>
                    <SelectItem value="demo">Demo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Starting Balance (KES)</Label>
                <Input type="number" min="0" step="1" value={form.balance_usd}
                  onChange={e => setForm(f => ({ ...f, balance_usd: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={createUser} disabled={creating}>{creating ? 'Creating…' : 'Create User'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search username or phone…" className="pl-9" />
        </div>
        <Select value={type} onValueChange={v => v && setType(v)}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="standard">Standard</SelectItem>
            <SelectItem value="vip">VIP</SelectItem>
            <SelectItem value="demo">Demo</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={v => v && setStatus(v)}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <TableWrap>
        <table className="w-full text-sm">
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead><TableHead>Phone</TableHead><TableHead>Balance</TableHead>
              <TableHead>Site</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Joined</TableHead><TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(loading || switching) && <SkeletonRows cols={8} />}
            {!(loading || switching) && users.map(u => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.username}</TableCell>
                <TableCell className="text-muted-foreground">{u.phone}</TableCell>
                <TableCell className="font-medium">KES {Math.round(Number(u.balance_usd) * 129).toLocaleString()}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{siteName(u.site_id)}</TableCell>
                <TableCell><Badge status={u.account_type} /></TableCell>
                <TableCell><Badge status={u.status} /></TableCell>
                <TableCell className="text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Link href={`/admin/users/${u.id}`}>
                    <Button variant="ghost" size="sm" className="text-primary hover:text-primary">View →</Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
            {!loading && users.length === 0 && <EmptyRow cols={8} />}
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
