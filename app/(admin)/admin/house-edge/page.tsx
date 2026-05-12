'use client'

import { useEffect, useState, useRef } from 'react'
import { Activity, RefreshCw } from 'lucide-react'
import PageHeader from '@/components/admin/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export default function HouseEdgePage() {
  const [data, setData] = useState<any>(null)
  const [rates, setRates] = useState({ house_win_rate: 65, house_win_rate_vip: 60, house_win_rate_demo: 50 })
  const [tradeTicks, setTradeTicks] = useState(2)
  const [saving, setSaving] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function load() {
    fetch('/api/admin/house-edge').then(r => r.json()).then(d => {
      setData(d)
      if (d.settings) {
        setRates({
          house_win_rate: Math.round(d.settings.house_win_rate * 100),
          house_win_rate_vip: Math.round(d.settings.house_win_rate_vip * 100),
          house_win_rate_demo: Math.round(d.settings.house_win_rate_demo * 100),
        })
        setTradeTicks(d.settings.trade_ticks ?? 2)
      }
    })
  }

  // Poll exposure every 3 seconds
  function loadExposure() {
    fetch('/api/admin/house-edge').then(r => r.json()).then(d => {
      setData((prev: any) => ({ ...prev, activeTrades: d.activeTrades, buyVolume: d.buyVolume, sellVolume: d.sellVolume }))
    }).catch(() => {})
  }

  useEffect(() => {
    load()
    pollRef.current = setInterval(loadExposure, 3000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  async function saveRates() {
    setSaving(true)
    const res = await fetch('/api/admin/house-edge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_global',
        house_win_rate: rates.house_win_rate / 100,
        house_win_rate_vip: rates.house_win_rate_vip / 100,
        house_win_rate_demo: rates.house_win_rate_demo / 100,
        trade_ticks: tradeTicks,
      }),
    })
    setSaving(false)
    if (res.ok) toast.success('Win rates saved')
    else toast.error('Failed to save')
  }

  const buyVol = Number(data?.buyVolume || 0)
  const sellVol = Number(data?.sellVolume || 0)
  const totalVol = buyVol + sellVol
  const netExposure = buyVol - sellVol

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <PageHeader title="House Edge Control" description="Configure win rates and monitor live exposure" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Global Win Rates */}
        <Card>
          <CardHeader><CardTitle className="text-base">Global Win Rates</CardTitle></CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-5">House wins this % of trades (price drift applied against users).</p>
            <div className="space-y-6">
              {[
                { k: 'house_win_rate', label: 'Standard Accounts' },
                { k: 'house_win_rate_vip', label: 'VIP Accounts' },
                { k: 'house_win_rate_demo', label: 'Demo Accounts' },
              ].map(({ k, label }) => (
                <div key={k}>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm text-muted-foreground">{label}</label>
                    <span className="text-sm font-bold">{rates[k as keyof typeof rates]}%</span>
                  </div>
                  <Slider
                    min={0} max={100} step={1}
                    value={[rates[k as keyof typeof rates]]}
                    onValueChange={val => {
                      const v = Array.isArray(val) ? val[0] : val
                      setRates(r => ({ ...r, [k]: v }))
                    }}
                  />
                </div>
              ))}
              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-sm text-muted-foreground">Trade Duration (ticks)</Label>
                  <span className="text-sm font-bold">{tradeTicks} tick{tradeTicks !== 1 ? 's' : ''}</span>
                </div>
                <Input
                  type="number" min={1} max={20} value={tradeTicks}
                  onChange={e => setTradeTicks(Math.max(1, parseInt(e.target.value) || 1))}
                  className="mb-1"
                />
                <p className="text-xs text-muted-foreground">Each trade resolves after this many price ticks. Default: 2.</p>
              </div>
              <Button onClick={saveRates} disabled={saving}>
                {saving ? 'Saving…' : 'Save Rates'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Live Exposure */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Live Exposure
              <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground font-normal">
                <RefreshCw className="w-3 h-3 animate-spin opacity-50" /> live
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!data ? (
              <div className="space-y-3"><Skeleton className="h-14" /><Skeleton className="h-14" /></div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="rounded-lg p-3 text-center bg-muted">
                    <p className="text-xl font-bold text-emerald-500">${buyVol.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">BUY Volume</p>
                  </div>
                  <div className="rounded-lg p-3 text-center bg-muted">
                    <p className="text-xl font-bold text-destructive">${sellVol.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">SELL Volume</p>
                  </div>
                </div>

                {/* Net exposure bar */}
                {totalVol > 0 && (
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Net exposure</span>
                      <span className={netExposure > 0 ? 'text-emerald-500' : netExposure < 0 ? 'text-destructive' : ''}>
                        {netExposure >= 0 ? '+' : ''}${netExposure.toFixed(2)}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden flex">
                      <div
                        className="h-full bg-emerald-500 transition-all"
                        style={{ width: `${(buyVol / totalVol) * 100}%` }}
                      />
                      <div
                        className="h-full bg-destructive transition-all"
                        style={{ width: `${(sellVol / totalVol) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                <p className="text-sm text-muted-foreground mb-3">
                  {data.activeTrades?.length || 0} active trade(s)
                </p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {data.activeTrades?.map((t: any) => (
                    <div key={t.id} className="flex justify-between text-xs py-1.5 border-b border-border">
                      <span className="text-muted-foreground">{(t.users as any)?.username || '—'}</span>
                      <span className={t.direction === 'buy' ? 'text-emerald-500' : 'text-destructive'}>
                        {t.direction.toUpperCase()}
                      </span>
                      <span>${Number(t.amount_usd).toFixed(2)}</span>
                    </div>
                  ))}
                  {(!data.activeTrades || data.activeTrades.length === 0) && (
                    <p className="text-sm text-muted-foreground">No active trades.</p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Per-User Overrides */}
      <Card className="mt-6">
        <CardHeader><CardTitle className="text-base">Per-User Overrides</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Username</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Account Type</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Custom Win Rate</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Blocked</th>
                </tr>
              </thead>
              <tbody>
                {(!data?.overrides || data.overrides.length === 0) && (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-sm text-muted-foreground">
                      No per-user overrides set. Configure them on the user detail page.
                    </td>
                  </tr>
                )}
                {data?.overrides?.map((o: any) => (
                  <tr key={o.id} className="border-b border-border hover:bg-muted/30">
                    <td className="px-5 py-3 font-medium">{(o.users as any)?.username || o.user_id}</td>
                    <td className="px-5 py-3 text-muted-foreground capitalize">{(o.users as any)?.account_type || '—'}</td>
                    <td className="px-5 py-3 font-bold text-amber-400">{Math.round(o.custom_win_rate * 100)}%</td>
                    <td className={cn('px-5 py-3 font-semibold', o.is_blocked_from_trading ? 'text-destructive' : 'text-muted-foreground')}>
                      {o.is_blocked_from_trading ? 'Yes' : 'No'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
