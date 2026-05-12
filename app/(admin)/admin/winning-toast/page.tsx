'use client'

import { useEffect, useState } from 'react'
import PageHeader from '@/components/admin/PageHeader'
import { useSite } from '@/components/admin/SiteContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { toast } from 'sonner'
import { TrendingUp, Users, Clock, DollarSign, Percent, Eye, EyeOff } from 'lucide-react'

const PREVIEW_NAMES = ['James K.', 'Faith W.', 'Otieno', 'Wanjiku', 'Kevin M.']
const PREVIEW_AMOUNTS = [500, 1200, 350, 8500, 750]

function PreviewToast({ name, amount, siteName, real }: { name: string; amount: number; siteName: string; real?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 bg-[#0d1525]/95 border border-[#22c55e]/30 rounded-2xl px-3.5 py-2.5 shadow-xl max-w-[220px]">
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center shrink-0">
        <span className="text-base font-black text-amber-900">$</span>
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-white font-bold text-xs">{name}</span>
          <span className="text-[10px] text-gray-400">Profited</span>
        </div>
        <div className="text-[#22c55e] font-black text-sm">+$ {amount.toLocaleString()}</div>
        <div className="flex items-center gap-1 mt-0.5">
          {real ? (
            <>
              <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 fill-[#22c55e]"><path d="M10 3L5 8.5 2 5.5l-1 1L5 10.5l6-7z"/></svg>
              <span className="text-[9px] text-[#22c55e] font-semibold">Verified withdrawal · {siteName}</span>
            </>
          ) : (
            <>
              <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 fill-blue-400"><path d="M6 0l1.4 3.9H11L8 6.3l1.1 3.9L6 8l-3.1 2.2L4 6.3 1 3.9h3.6z"/></svg>
              <span className="text-[9px] text-blue-400 font-semibold">Verified by {siteName}</span>
            </>
          )}
        </div>
      </div>
      <div className="text-amber-400 text-base shrink-0">✨</div>
    </div>
  )
}

export default function WinningToastPage() {
  const [settings, setSettings] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const { selectedSiteId } = useSite()

  useEffect(() => {
    const url = selectedSiteId
      ? `/api/admin/settings?site_id=${selectedSiteId}`
      : '/api/admin/settings'
    fetch(url).then(r => r.json()).then(d => setSettings(d.settings))
  }, [selectedSiteId])

  function sf(k: string, v: any) {
    setSettings((s: any) => s ? { ...s, [k]: v } : s)
  }

  async function save() {
    setSaving(true)
    const url = selectedSiteId
      ? `/api/admin/settings?site_id=${selectedSiteId}`
      : '/api/admin/settings'
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        winning_toast_enabled: settings.winning_toast_enabled,
        winning_toast_interval_min_secs: Number(settings.winning_toast_interval_min_secs),
        winning_toast_interval_max_secs: Number(settings.winning_toast_interval_max_secs),
        winning_toast_real_win_pct: Number(settings.winning_toast_real_win_pct),
        winning_toast_min_amount: Number(settings.winning_toast_min_amount),
        winning_toast_max_amount: Number(settings.winning_toast_max_amount),
      }),
    })
    setSaving(false)
    if (res.ok) toast.success('Winning toast settings saved')
    else toast.error('Failed to save')
  }

  const siteName = settings?.site_name || 'NOVA FX'
  const enabled = settings?.winning_toast_enabled ?? true
  const minSecs = settings?.winning_toast_interval_min_secs ?? 6
  const maxSecs = settings?.winning_toast_interval_max_secs ?? 14
  const realPct = settings?.winning_toast_real_win_pct ?? 40
  const minAmt = settings?.winning_toast_min_amount ?? 100
  const maxAmt = settings?.winning_toast_max_amount ?? 10000

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <PageHeader
        title="Animated Winnings"
        description="Control the live winning toast notifications shown to all users on the trading screen."
      />

      {!settings ? (
        <div className="space-y-4 mt-6">
          {[1,2,3].map(i => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Left — controls */}
          <div className="space-y-5">

            {/* Master toggle */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${enabled ? 'bg-[#22c55e]/10' : 'bg-muted'}`}>
                    {enabled ? <Eye className="w-5 h-5 text-[#22c55e]" /> : <EyeOff className="w-5 h-5 text-muted-foreground" />}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{enabled ? 'Toasts are Live' : 'Toasts are Hidden'}</p>
                    <p className="text-xs text-muted-foreground">Show animated winning notifications to all users</p>
                  </div>
                </div>
                <Switch
                  checked={enabled}
                  onCheckedChange={v => sf('winning_toast_enabled', v)}
                />
              </div>
            </div>

            {/* Interval */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Clock className="w-3.5 h-3.5" /> Display Interval
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Min seconds between toasts</Label>
                  <Input
                    type="number"
                    min={3}
                    max={60}
                    value={minSecs}
                    onChange={e => sf('winning_toast_interval_min_secs', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Max seconds between toasts</Label>
                  <Input
                    type="number"
                    min={3}
                    max={120}
                    value={maxSecs}
                    onChange={e => sf('winning_toast_interval_max_secs', e.target.value)}
                  />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                A new toast appears every {minSecs}–{maxSecs} seconds at random. Lower = more frequent.
              </p>
            </div>

            {/* Real win mix */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Users className="w-3.5 h-3.5" /> Real User Mix
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Real withdrawal wins: <span className="font-black text-foreground">{realPct}%</span></Label>
                  <span className="text-xs text-muted-foreground">Simulated: {100 - realPct}%</span>
                </div>
                <Slider
                  min={0}
                  max={100}
                  step={5}
                  value={[realPct]}
                  onValueChange={(v) => sf('winning_toast_real_win_pct', Array.isArray(v) ? v[0] : v)}
                />
                <p className="text-[11px] text-muted-foreground">
                  {realPct === 0
                    ? 'All toasts are simulated — no real user data shown.'
                    : realPct === 100
                      ? 'Only real withdrawal wins are shown. Requires completed withdrawals in the system.'
                      : `${realPct}% chance each toast uses a real completed withdrawal. Falls back to simulated if none exist.`}
                </p>
              </div>
            </div>

            {/* Amount range */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <DollarSign className="w-3.5 h-3.5" /> Simulated Amount Range (KES)
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Min amount (KSh)</Label>
                  <Input
                    type="number"
                    min={50}
                    value={minAmt}
                    onChange={e => sf('winning_toast_min_amount', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Max amount (KSh)</Label>
                  <Input
                    type="number"
                    min={100}
                    value={maxAmt}
                    onChange={e => sf('winning_toast_max_amount', e.target.value)}
                  />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Simulated wins are randomly picked within this range. Weighted so most appear near the lower end.
              </p>
            </div>

            <Button onClick={save} disabled={saving} className="w-full">
              {saving ? 'Saving…' : 'Save Settings'}
            </Button>
          </div>

          {/* Right — live preview */}
          <div className="space-y-5">
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Preview</p>
              <p className="text-xs text-muted-foreground">How toasts appear to users — alternates left/right on screen.</p>

              <div className="space-y-3">
                {PREVIEW_NAMES.map((name, i) => (
                  <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                    <PreviewToast
                      name={name}
                      amount={PREVIEW_AMOUNTS[i]}
                      siteName={siteName}
                      real={i % 3 === 1}
                    />
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-border space-y-2">
                <p className="text-xs font-semibold text-foreground">Badge types</p>
                <div className="flex items-center gap-2">
                  <svg viewBox="0 0 12 12" className="w-3 h-3 fill-[#22c55e]"><path d="M10 3L5 8.5 2 5.5l-1 1L5 10.5l6-7z"/></svg>
                  <span className="text-xs text-muted-foreground">Green checkmark = real verified withdrawal</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg viewBox="0 0 12 12" className="w-3 h-3 fill-blue-400"><path d="M6 0l1.4 3.9H11L8 6.3l1.1 3.9L6 8l-3.1 2.2L4 6.3 1 3.9h3.6z"/></svg>
                  <span className="text-xs text-muted-foreground">Blue star = simulated win</span>
                </div>
              </div>
            </div>

            {/* Stats summary */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Current Config Summary</p>
              {[
                { label: 'Status', value: enabled ? '🟢 Live' : '🔴 Hidden' },
                { label: 'Frequency', value: `Every ${minSecs}–${maxSecs}s` },
                { label: 'Real wins shown', value: `${realPct}% of toasts` },
                { label: 'Simulated range', value: `KSh ${Number(minAmt).toLocaleString()} – ${Number(maxAmt).toLocaleString()}` },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-semibold">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
