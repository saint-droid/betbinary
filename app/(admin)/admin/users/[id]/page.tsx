'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save } from 'lucide-react'
import Badge from '@/components/admin/Badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ account_type: '', status: '', balance_usd: '', custom_win_rate: '', is_blocked_from_trading: false, is_blocked_from_chat: false, admin_notes: '' })

  useEffect(() => {
    fetch(`/api/admin/users/${id}`)
      .then(r => r.json())
      .then(d => {
        setData(d)
        setForm({
          account_type: d.user?.account_type || '',
          status: d.user?.status || '',
          balance_usd: d.user?.balance_usd || '0',
          custom_win_rate: d.overrides?.custom_win_rate != null ? String(d.overrides.custom_win_rate * 100) : '',
          is_blocked_from_trading: d.overrides?.is_blocked_from_trading || false,
          is_blocked_from_chat: d.overrides?.is_blocked_from_chat || false,
          admin_notes: d.overrides?.admin_notes || '',
        })
      })
  }, [id])

  async function save() {
    setSaving(true)
    const body: any = {
      account_type: form.account_type,
      status: form.status,
      balance_usd: parseFloat(form.balance_usd),
      is_blocked_from_trading: form.is_blocked_from_trading,
      is_blocked_from_chat: form.is_blocked_from_chat,
      admin_notes: form.admin_notes,
    }
    if (form.custom_win_rate !== '') body.custom_win_rate = parseFloat(form.custom_win_rate) / 100
    await fetch(`/api/admin/users/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setSaving(false)
    toast.success('User saved')
  }

  if (!data) return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-24" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-96" />
        <Skeleton className="h-96" />
      </div>
    </div>
  )

  const u = data.user

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <Button variant="ghost" size="sm" className="mb-5 text-muted-foreground" onClick={() => router.back()}>
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Users
      </Button>

      <Card className="mb-6">
        <CardContent className="pt-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center shrink-0 bg-primary/15">
              <span className="text-xl font-bold text-primary">{u.username?.charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold">{u.username}</h1>
                <Badge status={u.account_type} />
                <Badge status={u.status} />
              </div>
              <p className="text-sm text-muted-foreground mt-1">{u.phone}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Joined {new Date(u.created_at).toLocaleString()}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xl font-bold">KES {Math.round(Number(u.balance_usd) * 129).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Balance (KES)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Account Settings</CardTitle></CardHeader>
          <CardContent className="space-y-4">
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
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => v && setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Balance (KES)</Label>
              <Input type="number" step="1" value={form.balance_usd}
                onChange={e => setForm(f => ({ ...f, balance_usd: e.target.value }))} />
            </div>

            <div className="space-y-1.5">
              <Label>Custom Win Rate (%) — leave blank to use global</Label>
              <Input type="number" min="0" max="100" step="1" value={form.custom_win_rate}
                onChange={e => setForm(f => ({ ...f, custom_win_rate: e.target.value }))}
                placeholder="e.g. 65" />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <Label htmlFor="block-trading" className="text-destructive">Block from trading</Label>
              <Switch id="block-trading" checked={form.is_blocked_from_trading}
                onCheckedChange={v => setForm(f => ({ ...f, is_blocked_from_trading: v }))}
                className="data-[state=checked]:bg-destructive" />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="block-chat" className="text-destructive">Ban from chat</Label>
              <Switch id="block-chat" checked={form.is_blocked_from_chat}
                onCheckedChange={v => setForm(f => ({ ...f, is_blocked_from_chat: v }))}
                className="data-[state=checked]:bg-destructive" />
            </div>

            <div className="space-y-1.5">
              <Label>Admin Notes (private)</Label>
              <Textarea rows={3} value={form.admin_notes}
                onChange={e => setForm(f => ({ ...f, admin_notes: e.target.value }))}
                className="resize-none" />
            </div>

            <Button onClick={save} disabled={saving} className="w-full">
              <Save className="w-4 h-4 mr-2" />{saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Recent Trades</CardTitle></CardHeader>
          <CardContent>
            {(!data.trades || data.trades.length === 0) && (
              <p className="text-sm text-muted-foreground">No trades yet.</p>
            )}
            <div className="space-y-0">
              {data.trades?.slice(0, 10).map((t: any) => (
                <div key={t.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                  <div>
                    <span className={cn('text-xs font-bold uppercase', t.direction === 'buy' ? 'text-emerald-500' : 'text-red-400')}>
                      {t.direction}
                    </span>
                    <span className="text-xs text-muted-foreground ml-2">KES {Math.round(Number(t.amount_usd) * 129).toLocaleString()}</span>
                  </div>
                  <Badge status={t.outcome} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
