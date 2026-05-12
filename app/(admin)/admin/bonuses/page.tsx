'use client'

import { useEffect, useState } from 'react'
import { PlusCircle, Trash2 } from 'lucide-react'
import PageHeader from '@/components/admin/PageHeader'
import { useSite } from '@/components/admin/SiteContext'
import Badge from '@/components/admin/Badge'
import { TableWrap, TableHeader, TableRow, TableHead, TableBody, TableCell, SkeletonRows } from '@/components/admin/Table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

const emptyCode = { code: '', type: 'percent', value: 10, condition_min_deposit: 0, expiry_date: '', usage_limit: '' }

export default function BonusesPage() {
  const { selectedSiteId, switching } = useSite()
  const [codes, setCodes] = useState<any[]>([])
  const [settings, setSettings] = useState<any>(null)
  const [form, setForm] = useState({ ...emptyCode })
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  function load() {
    const bonusUrl = selectedSiteId ? `/api/admin/bonuses?site_id=${selectedSiteId}` : '/api/admin/bonuses'
    const settingsUrl = selectedSiteId ? `/api/admin/settings?site_id=${selectedSiteId}` : '/api/admin/settings'
    Promise.all([fetch(bonusUrl).then(r => r.json()), fetch(settingsUrl).then(r => r.json())])
      .then(([b, s]) => { setCodes(b.codes || []); setSettings(s.settings) })
  }

  useEffect(() => { load() }, [selectedSiteId])

  async function createCode() {
    await fetch('/api/admin/bonuses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, value: parseFloat(String(form.value)), condition_min_deposit: parseFloat(String(form.condition_min_deposit)), usage_limit: form.usage_limit ? parseInt(String(form.usage_limit)) : null, site_id: selectedSiteId || null }) })
    setForm({ ...emptyCode }); setShowForm(false); load(); toast.success('Promo code created')
  }

  async function toggleCode(id: string, is_active: boolean) {
    await fetch('/api/admin/bonuses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'toggle', id, is_active }) })
    setCodes(c => c.map(x => x.id === id ? { ...x, is_active } : x))
  }

  async function deleteCode(id: string) {
    if (!confirm('Delete this code?')) return
    await fetch('/api/admin/bonuses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', id }) })
    load(); toast.success('Code deleted')
  }

  async function saveWelcome() {
    setSaving(true)
    await fetch('/api/admin/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ welcome_bonus_enabled: settings.welcome_bonus_enabled, welcome_bonus_percent: parseFloat(settings.welcome_bonus_percent), welcome_bonus_min_deposit_kes: parseFloat(settings.welcome_bonus_min_deposit_kes) }) })
    setSaving(false); toast.success('Welcome bonus saved')
  }

  const sf = (k: string, v: any) => setSettings((s: any) => s ? { ...s, [k]: v } : s)

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Bonuses & Promo Codes" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {settings && (
          <Card>
            <CardHeader><CardTitle className="text-base">Welcome Bonus</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="welcome-enabled">Enabled</Label>
                <Switch id="welcome-enabled" checked={settings.welcome_bonus_enabled} onCheckedChange={v => sf('welcome_bonus_enabled', v)} />
              </div>
              <div className="space-y-1.5">
                <Label>Bonus % on first deposit</Label>
                <Input type="number" value={settings.welcome_bonus_percent} onChange={e => sf('welcome_bonus_percent', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Minimum deposit to qualify (KES)</Label>
                <Input type="number" value={settings.welcome_bonus_min_deposit_kes} onChange={e => sf('welcome_bonus_min_deposit_kes', e.target.value)} />
              </div>
              <Button onClick={saveWelcome} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-base">Create Promo Code</CardTitle>
              {!showForm && <Button variant="ghost" size="sm" onClick={() => setShowForm(true)} className="text-primary"><PlusCircle className="w-4 h-4 mr-1.5" /> New Code</Button>}
            </div>
          </CardHeader>
          {showForm && (
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label>Code</Label>
                <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="SAVE20" className="font-mono" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={v => v && setForm(f => ({ ...f, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">Percent (%)</SelectItem>
                      <SelectItem value="flat">Flat (USD)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Value</Label>
                  <Input type="number" value={form.value} onChange={e => setForm(f => ({ ...f, value: parseFloat(e.target.value) }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Min Deposit (KES)</Label>
                  <Input type="number" value={form.condition_min_deposit} onChange={e => setForm(f => ({ ...f, condition_min_deposit: parseFloat(e.target.value) }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Usage Limit (blank = unlimited)</Label>
                  <Input type="number" value={form.usage_limit} onChange={e => setForm(f => ({ ...f, usage_limit: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Expiry Date (optional)</Label>
                <Input type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} />
              </div>
              <div className="flex gap-3">
                <Button onClick={createCode} className="flex-1">Create</Button>
                <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1">Cancel</Button>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      <TableWrap>
        <div className="px-5 py-4 border-b border-border font-semibold text-sm">All Promo Codes</div>
        <table className="w-full text-sm">
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead><TableHead>Type / Value</TableHead><TableHead>Used</TableHead>
              <TableHead>Expiry</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {switching && <SkeletonRows cols={6} />}
            {!switching && codes.length === 0 && (
              <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No promo codes yet.</TableCell></TableRow>
            )}
            {!switching && codes.map(c => (
              <TableRow key={c.id}>
                <TableCell className="font-mono font-medium">{c.code}</TableCell>
                <TableCell className="text-muted-foreground">{c.type === 'percent' ? `${c.value}%` : `$${c.value}`}</TableCell>
                <TableCell className="text-muted-foreground">{c.times_used}{c.usage_limit ? ` / ${c.usage_limit}` : ''}</TableCell>
                <TableCell className="text-muted-foreground">{c.expiry_date ? new Date(c.expiry_date).toLocaleDateString() : '—'}</TableCell>
                <TableCell><Badge status={c.is_active ? 'active' : 'suspended'} /></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => toggleCode(c.id, !c.is_active)}>{c.is_active ? 'Deactivate' : 'Activate'}</Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => deleteCode(c.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </table>
      </TableWrap>
    </div>
  )
}
