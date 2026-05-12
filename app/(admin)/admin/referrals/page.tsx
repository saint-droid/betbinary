'use client'

import { useEffect, useState } from 'react'
import PageHeader from '@/components/admin/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { TableWrap, TableHeader, TableRow, TableHead, TableBody, TableCell, SkeletonRows } from '@/components/admin/Table'
import { toast } from 'sonner'
import { CheckCircle2, XCircle, Clock } from 'lucide-react'

interface AffiliateWithdrawal {
  id: string
  amount_kes: number
  amount_usd: number
  phone: string
  status: 'pending' | 'completed' | 'rejected'
  rejection_reason?: string
  created_at: string
  users: { username: string; phone: string }
}

function statusBadge(status: string) {
  if (status === 'completed') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/20 text-green-400 uppercase">
      <CheckCircle2 className="w-3 h-3" /> Done
    </span>
  )
  if (status === 'rejected') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 uppercase">
      <XCircle className="w-3 h-3" /> Rejected
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 uppercase">
      <Clock className="w-3 h-3" /> Pending
    </span>
  )
}

export default function ReferralsPage() {
  const [settings, setSettings] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [withdrawals, setWithdrawals] = useState<AffiliateWithdrawal[]>([])
  const [wLoading, setWLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/settings').then(r => r.json()).then(d => setSettings(d.settings))
    loadWithdrawals()
  }, [])

  function loadWithdrawals() {
    setWLoading(true)
    fetch('/api/admin/affiliate-withdrawals')
      .then(r => r.json())
      .then(d => { setWithdrawals(d.withdrawals || []); setWLoading(false) })
  }

  async function save() {
    setSaving(true)
    await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        referral_enabled: settings.referral_enabled,
        referral_l1_percent: parseFloat(settings.referral_l1_percent),
        referral_l2_percent: parseFloat(settings.referral_l2_percent),
        referral_l3_percent: parseFloat(settings.referral_l3_percent),
        min_referral_withdrawal_kes: parseFloat(settings.min_referral_withdrawal_kes),
      }),
    })
    setSaving(false)
    toast.success('Referral settings saved')
  }

  async function approveWithdrawal(id: string) {
    const res = await fetch('/api/admin/affiliate-withdrawals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve', id }),
    })
    const data = await res.json()
    if (data.error) { toast.error(data.error); return }
    toast.success('Withdrawal approved')
    loadWithdrawals()
  }

  async function rejectWithdrawal(id: string) {
    const reason = prompt('Rejection reason (optional):') ?? ''
    const res = await fetch('/api/admin/affiliate-withdrawals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject', id, reason }),
    })
    const data = await res.json()
    if (data.error) { toast.error(data.error); return }
    toast.success('Withdrawal rejected & balance refunded')
    loadWithdrawals()
  }

  const sf = (k: string, v: any) => setSettings((s: any) => s ? { ...s, [k]: v } : s)

  const pending = withdrawals.filter(w => w.status === 'pending')

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <PageHeader title="Referral & Affiliate" description="Configure commission rates and manage affiliate withdrawals" />

      {/* Settings */}
      <div className="max-w-xl">
        {!settings ? (
          <Card><CardContent className="pt-6 space-y-4">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12" />)}</CardContent></Card>
        ) : (
          <Card>
            <CardHeader><CardTitle className="text-base">Commission Configuration</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between">
                <Label htmlFor="referral-enabled">Referral program enabled</Label>
                <Switch id="referral-enabled" checked={settings.referral_enabled} onCheckedChange={v => sf('referral_enabled', v)} />
              </div>
              {[
                { k: 'referral_l1_percent', label: 'Level 1 Commission (%)', desc: 'Direct referrals' },
                { k: 'referral_l2_percent', label: 'Level 2 Commission (%)', desc: "Referral's referrals" },
                { k: 'referral_l3_percent', label: 'Level 3 Commission (%)', desc: 'Third-level referrals' },
                { k: 'min_referral_withdrawal_kes', label: 'Minimum Affiliate Withdrawal (KES)', desc: 'Minimum amount affiliates can withdraw' },
              ].map(({ k, label, desc }) => (
                <div key={k} className="space-y-1.5">
                  <Label>{label}</Label>
                  {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
                  <Input type="number" step="0.01" value={settings[k]} onChange={e => sf(k, e.target.value)} />
                </div>
              ))}
              <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Settings'}</Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Affiliate Withdrawals */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-foreground">Affiliate Withdrawals</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {pending.length > 0 && <span className="text-amber-400 font-semibold">{pending.length} pending · </span>}
              Approve or reject affiliate commission withdrawals
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={loadWithdrawals}>Refresh</Button>
        </div>

        <TableWrap>
          <table className="w-full text-sm">
            <TableHeader>
              <TableRow>
                <TableHead>Affiliate</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>M-Pesa Phone</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {wLoading && <SkeletonRows cols={7} />}
              {!wLoading && withdrawals.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">No affiliate withdrawals yet</TableCell>
                </TableRow>
              )}
              {!wLoading && withdrawals.map(w => (
                <TableRow key={w.id} className={w.status === 'pending' ? 'bg-amber-500/5' : ''}>
                  <TableCell className="font-medium">{w.users?.username}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">
                    {w.users?.phone?.slice(0, 3)}****{w.users?.phone?.slice(-2)}
                  </TableCell>
                  <TableCell className="text-[#22c55e] font-mono font-semibold">
                    KSh {Number(w.amount_kes).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">{w.phone}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{new Date(w.created_at).toLocaleString()}</TableCell>
                  <TableCell>{statusBadge(w.status)}</TableCell>
                  <TableCell>
                    {w.status === 'pending' && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          className="h-7 bg-[#22c55e] hover:bg-[#16a34a] text-black font-bold text-xs px-3"
                          onClick={() => approveWithdrawal(w.id)}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-destructive hover:text-destructive hover:bg-destructive/10 text-xs px-3"
                          onClick={() => rejectWithdrawal(w.id)}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </table>
        </TableWrap>
      </div>
    </div>
  )
}
