'use client'

import { useEffect, useState } from 'react'
import { PlusCircle, Pencil, Trash2 } from 'lucide-react'
import PageHeader from '@/components/admin/PageHeader'
import Badge from '@/components/admin/Badge'
import { TableWrap, TableHeader, TableRow, TableHead, TableBody, TableCell, SkeletonRows } from '@/components/admin/Table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'

const ICONS = [
  { value: 'info',    label: '💬 Info' },
  { value: 'success', label: '✅ Success' },
  { value: 'warning', label: '⚠️ Warning' },
  { value: 'promo',   label: '🎁 Promo' },
]

const empty = { title: '', body: '', icon: 'info', is_active: true, sort_order: 0 }

export default function NotificationsPage() {
  const [items, setItems]     = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<any | null>(null)
  const [saving, setSaving]   = useState(false)

  function load() {
    setLoading(true)
    fetch('/api/admin/notifications').then(r => r.json()).then(d => { setItems(d.notifications || []); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  async function save() {
    if (!editing.title.trim()) { toast.error('Title is required'); return }
    setSaving(true)
    const res = await fetch('/api/admin/notifications', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editing),
    })
    const result = await res.json()
    setSaving(false)
    if (result.error) { toast.error(result.error); return }
    toast.success('Notification saved')
    setEditing(null); load()
  }

  async function del(id: string) {
    if (!confirm('Delete this notification?')) return
    const res = await fetch('/api/admin/notifications', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }),
    })
    const result = await res.json()
    if (result.error) { toast.error(result.error); return }
    toast.success('Deleted'); load()
  }

  const f = (k: string, v: any) => setEditing((e: any) => ({ ...e, [k]: v }))

  const iconEmoji = (icon: string) => ICONS.find(i => i.value === icon)?.label.split(' ')[0] || '💬'

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <PageHeader
        title="Notifications"
        description="Manage notifications shown to users via the bell icon on the trading page."
        action={<Button onClick={() => setEditing({ ...empty })}><PlusCircle className="w-4 h-4 mr-2" /> New Notification</Button>}
      />

      {/* Edit Dialog */}
      <Dialog open={!!editing} onOpenChange={open => !open && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing?.id ? 'Edit Notification' : 'New Notification'}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input value={editing.title} onChange={e => f('title', e.target.value)} placeholder="Welcome to BetaBinary!" />
              </div>
              <div className="space-y-1.5">
                <Label>Body</Label>
                <Textarea rows={3} value={editing.body} onChange={e => f('body', e.target.value)}
                  placeholder="Notification message…" className="resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Icon</Label>
                  <Select value={editing.icon} onValueChange={v => f('icon', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ICONS.map(i => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Sort Order</Label>
                  <Input type="number" value={editing.sort_order} onChange={e => f('sort_order', parseInt(e.target.value))} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={!!editing.is_active} onCheckedChange={v => f('is_active', v)} id="notif-active" />
                <Label htmlFor="notif-active">Active (visible to users)</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Table */}
      <TableWrap>
        <table className="w-full text-sm">
          <TableHeader>
            <TableRow>
              <TableHead>Icon</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Body</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sort</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <SkeletonRows cols={6} />}
            {!loading && items.map(n => (
              <TableRow key={n.id}>
                <TableCell className="text-xl">{iconEmoji(n.icon)}</TableCell>
                <TableCell className="font-medium">{n.title}</TableCell>
                <TableCell className="text-muted-foreground max-w-xs truncate">{n.body}</TableCell>
                <TableCell><Badge status={n.is_active ? 'active' : 'suspended'} /></TableCell>
                <TableCell className="text-muted-foreground">{n.sort_order}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing({ ...n })}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => del(n.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!loading && items.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No notifications yet</TableCell></TableRow>
            )}
          </TableBody>
        </table>
      </TableWrap>
    </div>
  )
}
