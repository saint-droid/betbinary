'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Bot, Save } from 'lucide-react'
import PageHeader from '@/components/admin/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'

function toLocalDatetime(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  // Format as YYYY-MM-DDTHH:MM in Kenyan time (EAT = UTC+3)
  const ke = new Date(d.getTime() + 3 * 60 * 60 * 1000)
  return ke.toISOString().slice(0, 16)
}

function toUTC(local: string) {
  if (!local) return ''
  // Input is Kenyan local time — subtract 3h to get UTC
  return new Date(new Date(local).getTime() - 3 * 60 * 60 * 1000).toISOString()
}

const emptyTournament = {
  name: '',
  description: '',
  prize_fund: 0,
  participation_fee: 0,
  rebuy_fee: 0,
  starting_balance: 100,
  duration_hours: 720,
  starts_at: '',
  ends_at: '',
  rules: '',
  is_active: true,
  sort_order: 0,
  bot_count: 20,
  bot_highest_win: 20000,
  bot_trade_count: 10,
  entries: [] as any[],
}

export default function TournamentEditPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const isNew = id === 'new'

  const [form, setForm] = useState<any | null>(isNew ? (() => {
    // Use Kenyan time (EAT = UTC+3) for default start/end
    const nowKe = new Date(Date.now() + 3 * 60 * 60 * 1000)
    const endKe = new Date(nowKe.getTime() + 30 * 24 * 60 * 60 * 1000)
    const fmt = (d: Date) => d.toISOString().slice(0, 16)
    return { ...emptyTournament, starts_at: fmt(nowKe), ends_at: fmt(endKe) }
  })() : null)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [generatingBots, setGeneratingBots] = useState(false)

  useEffect(() => {
    if (isNew) return
    fetch('/api/admin/tournaments')
      .then(r => r.json())
      .then(d => {
        const t = (d.tournaments || []).find((t: any) => t.id === id)
        if (!t) { toast.error('Tournament not found'); router.push('/admin/tournaments'); return }
        setForm({
          ...t,
          entries: t.tournament_entries || [],
          starts_at: toLocalDatetime(t.starts_at),
          ends_at: toLocalDatetime(t.ends_at),
          bot_count: t.bot_count ?? 20,
          bot_highest_win: t.bot_highest_win ?? 20000,
          bot_trade_count: t.bot_trade_count ?? 10,
        })
        setLoading(false)
      })
  }, [id, isNew, router])

  function f(k: string, v: any) {
    setForm((e: any) => {
      const next = { ...e, [k]: v }
      if (k === 'starts_at' || k === 'ends_at') {
        const sRaw = k === 'starts_at' ? v : e.starts_at
        const enRaw = k === 'ends_at' ? v : e.ends_at
        const s = sRaw ? new Date(sRaw.replace('T', ' ')) : null
        const en = enRaw ? new Date(enRaw.replace('T', ' ')) : null
        if (s && en && !isNaN(s.getTime()) && !isNaN(en.getTime()) && en > s) {
          next.duration_hours = Math.round((en.getTime() - s.getTime()) / 3600000)
        }
      }
      if (k === 'duration_hours') {
        const hours = parseInt(v) || 0
        const sRaw = e.starts_at
        const s = sRaw ? new Date(sRaw.replace('T', ' ')) : null
        if (s && !isNaN(s.getTime()) && hours > 0) {
          // Keep result in KE time by using ISO slice (input is already KE-offset)
          const end = new Date(s.getTime() + hours * 3600000)
          next.ends_at = end.toISOString().slice(0, 16)
        }
      }
      return next
    })
  }

  async function save() {
    if (!form.starts_at || form.starts_at.includes('--') || isNaN(new Date(form.starts_at).getTime())) {
      toast.error('Please set a valid start date and time'); return
    }
    if (!form.ends_at || form.ends_at.includes('--') || isNaN(new Date(form.ends_at).getTime())) {
      toast.error('Please set a valid end date and time'); return
    }
    if (!form.name.trim()) { toast.error('Tournament name is required'); return }

    const startsUtc = toUTC(form.starts_at)
    const endsUtc = toUTC(form.ends_at)
    if (new Date(endsUtc) <= new Date(startsUtc)) { toast.error('End date must be after start date'); return }

    setSaving(true)
    const payload = { ...form, starts_at: startsUtc, ends_at: endsUtc }
    const res = await fetch('/api/admin/tournaments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const result = await res.json()
    setSaving(false)
    if (result.error) { toast.error(result.error); return }
    toast.success('Tournament saved')
    router.push('/admin/tournaments')
  }

  async function generateBots() {
    if (!form?.id) { toast.error('Save the tournament first before generating bots'); return }
    setGeneratingBots(true)
    const res = await fetch('/api/admin/tournaments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: form.id, bot_count: form.bot_count, bot_highest_win: form.bot_highest_win, bot_trade_count: form.bot_trade_count }),
    })
    const data = await res.json()
    setGeneratingBots(false)
    if (data.error) { toast.error(data.error); return }
    toast.success(`Generated ${data.generated} bots`)
    // Refresh entries
    fetch('/api/admin/tournaments')
      .then(r => r.json())
      .then(d => {
        const t = (d.tournaments || []).find((t: any) => t.id === form.id)
        if (t) setForm((prev: any) => ({ ...prev, entries: t.tournament_entries || [] }))
      })
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-64" />
          <div className="h-4 bg-muted rounded w-48" />
        </div>
      </div>
    )
  }

  const entries = form?.entries || []
  const botEntries = [...entries.filter((e: any) => !e.is_real)]
    .sort((a: any, b: any) => (a.join_offset_secs || 0) - (b.join_offset_secs || 0))
  const realEntries = entries.filter((e: any) => e.is_real)
  const startsAt = form?.starts_at ? new Date(form.starts_at) : null
  const nowMs = Date.now()
  const startMs = startsAt ? startsAt.getTime() : 0

  const KE_TZ = 'Africa/Nairobi'

  function formatJoinTime(offsetSecs: number) {
    if (!startsAt) return `+${offsetSecs}s`
    const joinAt = new Date(startsAt.getTime() + offsetSecs * 1000)
    return joinAt.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', timeZone: KE_TZ }) +
      ' ' + joinAt.toLocaleDateString('en-KE', { month: 'short', day: 'numeric', timeZone: KE_TZ })
  }

  function formatOffset(secs: number) {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    if (h > 0) return `${h}h ${m}m after start`
    return `${m}m after start`
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin/tournaments')} className="mb-4 -ml-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to Tournaments
        </Button>
        <PageHeader
          title={isNew ? 'New Tournament' : (form?.name || 'Edit Tournament')}
          description={isNew ? 'Configure and launch a new trading tournament' : 'Edit tournament settings and view participant schedule'}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 max-w-7xl">
        {/* Left column — form */}
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Basic Info</p>
            <div className="space-y-1.5">
              <Label>Tournament Name</Label>
              <Input value={form.name} onChange={e => f('name', e.target.value)} placeholder="e.g. Weekend Showdown" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => f('description', e.target.value)} rows={2} placeholder="Short description shown in the detail view" />
            </div>
            <div className="space-y-1.5">
              <Label>Rules</Label>
              <Textarea value={form.rules} onChange={e => f('rules', e.target.value)} rows={3} placeholder="Tournament rules, one per line or as paragraph" />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Switch checked={form.is_active} onCheckedChange={v => f('is_active', v)} id="t-active" />
              <Label htmlFor="t-active">Active (show on frontend)</Label>
            </div>
          </div>

          {/* Financials */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Financials (KES)</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Prize Fund (KSh)</Label>
                <Input type="number" value={form.prize_fund} onChange={e => f('prize_fund', parseFloat(e.target.value) || 0)} />
              </div>
              <div className="space-y-1.5">
                <Label>Participation Fee (KSh)</Label>
                <Input type="number" value={form.participation_fee} onChange={e => f('participation_fee', parseFloat(e.target.value) || 0)} />
              </div>
              <div className="space-y-1.5">
                <Label>Re-buy Fee (KSh)</Label>
                <Input type="number" value={form.rebuy_fee} onChange={e => f('rebuy_fee', parseFloat(e.target.value) || 0)} />
              </div>
              <div className="space-y-1.5">
                <Label>Starting Balance (KSh)</Label>
                <Input type="number" value={form.starting_balance} onChange={e => f('starting_balance', parseFloat(e.target.value) || 0)} />
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Schedule</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Starts At (local time)</Label>
                <Input type="datetime-local" value={form.starts_at} onChange={e => f('starts_at', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Ends At (local time)</Label>
                <Input type="datetime-local" value={form.ends_at} onChange={e => f('ends_at', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Duration (hours)</Label>
                <Input type="number" value={form.duration_hours} onChange={e => f('duration_hours', parseInt(e.target.value) || 0)} />
              </div>
              <div className="space-y-1.5">
                <Label>Sort Order</Label>
                <Input type="number" value={form.sort_order} onChange={e => f('sort_order', parseInt(e.target.value) || 0)} />
              </div>
            </div>
          </div>

          {/* Bot Config */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bot Participants</p>
              <p className="text-[11px] text-muted-foreground mt-1">Bots use random Kenyan names and auto-adjust to always rank above real users. No human can win the tournament prize.</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Number of Bots</Label>
                <Input type="number" min={1} max={50} value={form.bot_count ?? 20} onChange={e => f('bot_count', parseInt(e.target.value) || 20)} />
              </div>
              <div className="space-y-1.5">
                <Label>Highest Bot Win (KSh)</Label>
                <Input type="number" min={100} value={form.bot_highest_win ?? 20000} onChange={e => f('bot_highest_win', parseFloat(e.target.value) || 20000)} />
              </div>
              <div className="space-y-1.5">
                <Label>Bot Trade Count</Label>
                <Input type="number" min={1} value={form.bot_trade_count ?? 10} onChange={e => f('bot_trade_count', parseInt(e.target.value) || 10)} />
              </div>
            </div>
            {form.id && (
              <Button variant="outline" size="sm" onClick={generateBots} disabled={generatingBots} className="w-full">
                <Bot className="w-3.5 h-3.5 mr-1.5" />
                {generatingBots ? 'Generating...' : 'Regenerate Bots'}
              </Button>
            )}
            {!form.id && (
              <p className="text-[10px] text-muted-foreground">Bots are generated automatically on creation. Use Regenerate Bots after saving to refresh them.</p>
            )}
          </div>

          {/* Save */}
          <div className="flex gap-3">
            <Button onClick={save} disabled={saving} className="flex-1">
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Tournament'}
            </Button>
            <Button variant="outline" onClick={() => router.push('/admin/tournaments')}>
              Cancel
            </Button>
          </div>
        </div>

        {/* Right column — participants */}
        <div className="space-y-6">
          {/* Bot schedule */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5 text-blue-400" />
                  Bot Schedule
                  {botEntries.length > 0 && <span className="text-muted-foreground/60 font-normal">({botEntries.length} bots)</span>}
                </p>
              </div>
            </div>
            {botEntries.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                {isNew
                  ? 'Bots will be generated after you save this tournament.'
                  : 'No bots yet. Configure bot settings and click Regenerate Bots.'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left pb-2 pr-3 text-muted-foreground font-medium">#</th>
                      <th className="text-left pb-2 pr-3 text-muted-foreground font-medium">Name</th>
                      <th className="text-left pb-2 pr-3 text-muted-foreground font-medium">Joins At</th>
                      <th className="text-left pb-2 pr-3 text-muted-foreground font-medium">Delay</th>
                      <th className="text-right pb-2 text-muted-foreground font-medium">Target Win</th>
                      <th className="text-left pb-2 pl-3 text-muted-foreground font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {botEntries.map((e: any, i: number) => {
                      const offset = Number(e.join_offset_secs) || 0
                      const joinMs = startMs + offset * 1000
                      const hasJoined = nowMs >= joinMs && startMs > 0
                      const isPending = nowMs < joinMs && startMs > 0
                      return (
                        <tr key={i} className={hasJoined ? 'bg-green-500/5' : ''}>
                          <td className="py-2 pr-3 text-muted-foreground">{i + 1}</td>
                          <td className="py-2 pr-3 font-medium text-white whitespace-nowrap">{e.trader_name}</td>
                          <td className="py-2 pr-3 text-muted-foreground font-mono whitespace-nowrap">{formatJoinTime(offset)}</td>
                          <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">{formatOffset(offset)}</td>
                          <td className="py-2 text-right text-[#22c55e] font-mono whitespace-nowrap">KSh {Number(e.result_balance).toLocaleString()}</td>
                          <td className="py-2 pl-3 whitespace-nowrap">
                            {hasJoined
                              ? <span className="text-green-400 font-semibold">Joined</span>
                              : isPending
                                ? <span className="text-blue-400">Pending</span>
                                : <span className="text-muted-foreground">—</span>
                            }
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Bot profile stats editor */}
          {botEntries.length > 0 && (
            <BotStatsEditor bots={botEntries} tournamentId={form.id} onSaved={() => toast.success('Bot stats saved')} />
          )}

          {/* Real participants */}
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              Real Participants ({realEntries.length})
            </p>
            {realEntries.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No real users have joined yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left pb-2 pr-3 text-muted-foreground font-medium">Username</th>
                      <th className="text-right pb-2 text-muted-foreground font-medium">Profit (KSh)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {realEntries.map((e: any, i: number) => (
                      <tr key={i}>
                        <td className="py-2 pr-3 font-medium text-white">{e.trader_name}</td>
                        <td className="py-2 text-right text-[#22c55e] font-mono">KSh {Number(e.result_balance).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function toForm(bot: any) {
  return {
    bot_total_trades: bot?.bot_total_trades ? String(bot.bot_total_trades) : '',
    bot_win_rate:     bot?.bot_win_rate     ? String(bot.bot_win_rate)     : '',
    bot_total_profit: bot?.bot_total_profit ? String(bot.bot_total_profit) : '',
    bot_best_trade:   bot?.bot_best_trade   ? String(bot.bot_best_trade)   : '',
    bot_bio:          bot?.bot_bio          ?? '',
  }
}

function BotStatsEditor({ bots, tournamentId, onSaved }: { bots: any[]; tournamentId: string; onSaved: () => void }) {
  const [selected, setSelected] = useState<any>(bots[0] || null)
  const [form, setForm] = useState<any>(() => toForm(bots[0]))
  const [saving, setSaving] = useState(false)
  const [autofilling, setAutofilling] = useState(false)

  async function autoFillAll() {
    setAutofilling(true)
    const res = await fetch('/api/admin/tournaments/bot-stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bulk: true, tournament_id: tournamentId }),
    })
    const data = await res.json()
    setAutofilling(false)
    if (data.error) { toast.error(data.error); return }
    toast.success(`Auto-filled stats for ${data.updated} bots`)
    onSaved()
  }

  function selectBot(bot: any) {
    setSelected(bot)
    setForm(toForm(bot))
  }

  async function save() {
    if (!selected) return
    setSaving(true)
    await fetch('/api/admin/tournaments/bot-stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entry_id: selected.id, ...form }),
    })
    setSaving(false)
    onSaved()
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Bot className="w-3.5 h-3.5 text-amber-400" />
            Bot Public Profile Stats
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Exaggerated figures shown on each bot's public profile.</p>
        </div>
        <Button variant="outline" size="sm" onClick={autoFillAll} disabled={autofilling} className="shrink-0 text-xs">
          {autofilling ? 'Filling…' : '⚡ Auto-fill All'}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {bots.map(b => (
          <button
            key={b.id}
            onClick={() => selectBot(b)}
            className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${selected?.id === b.id ? 'bg-amber-400/10 border-amber-400/40 text-amber-400' : 'border-border text-muted-foreground hover:text-white'}`}
          >
            {b.trader_name}
          </button>
        ))}
      </div>

      {selected && (
        <div className="space-y-3 pt-2 border-t border-border">
          <p className="text-xs font-medium text-white">{selected.trader_name}</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Total Trades</Label>
              <Input type="number" value={form.bot_total_trades} onChange={e => setForm((p: any) => ({ ...p, bot_total_trades: e.target.value }))} placeholder="e.g. 12450" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Win Rate (%)</Label>
              <Input type="number" value={form.bot_win_rate} onChange={e => setForm((p: any) => ({ ...p, bot_win_rate: e.target.value }))} placeholder="e.g. 87.5" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Total Profit (KES)</Label>
              <Input type="number" value={form.bot_total_profit} onChange={e => setForm((p: any) => ({ ...p, bot_total_profit: e.target.value }))} placeholder="e.g. 4500000" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Best Single Trade (KES)</Label>
              <Input type="number" value={form.bot_best_trade} onChange={e => setForm((p: any) => ({ ...p, bot_best_trade: e.target.value }))} placeholder="e.g. 250000" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Bio / Tagline</Label>
            <Textarea rows={2} value={form.bot_bio} onChange={e => setForm((p: any) => ({ ...p, bot_bio: e.target.value }))} placeholder="e.g. Algorithmic trader from Nairobi with 5 years experience..." className="resize-none" />
          </div>
          <Button onClick={save} disabled={saving} size="sm">
            <Save className="w-3.5 h-3.5 mr-1.5" />
            {saving ? 'Saving…' : 'Save Stats'}
          </Button>
        </div>
      )}
    </div>
  )
}
