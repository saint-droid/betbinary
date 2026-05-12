'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PlusCircle, Pencil, Trash2, Bot } from 'lucide-react'
import PageHeader from '@/components/admin/PageHeader'
import { TableWrap, TableHeader, TableRow, TableHead, TableBody, TableCell, SkeletonRows } from '@/components/admin/Table'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { useSite } from '@/components/admin/SiteContext'

function statusBadge(status: string) {
  if (status === 'active') return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/20 text-green-400 uppercase">Active</span>
  if (status === 'upcoming') return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-400 uppercase">Upcoming</span>
  return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-500/20 text-gray-400 uppercase">Ended</span>
}

export default function TournamentsPage() {
  const router = useRouter()
  const { selectedSiteId, switching } = useSite()
  const [tournaments, setTournaments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  function load() {
    setLoading(true)
    const url = selectedSiteId ? `/api/admin/tournaments?site_id=${selectedSiteId}` : '/api/admin/tournaments'
    fetch(url)
      .then(r => r.json())
      .then(d => { setTournaments(d.tournaments || []); setLoading(false); setSelected(new Set()) })
  }

  async function generateBots(t: any) {
    const count = parseInt(prompt(`Number of bots to generate for "${t.name}"?`, '20') || '20')
    if (!count || count < 1) return
    const highest = parseFloat(prompt('Highest bot win (KSh)?', '20000') || '20000')
    const trades = parseInt(prompt('Bot trade count?', '10') || '10')
    const res = await fetch('/api/admin/tournaments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: t.id, bot_count: count, bot_highest_win: highest, bot_trade_count: trades }),
    })
    const data = await res.json()
    if (data.error) { toast.error(data.error); return }
    toast.success(`Generated ${data.generated} bots`)
    load()
  }

  useEffect(() => { load() }, [selectedSiteId])

  async function del(id: string) {
    if (!confirm('Delete this tournament?')) return
    await fetch('/api/admin/tournaments', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    load()
    toast.success('Tournament deleted')
  }

  async function bulkDelete() {
    if (!confirm(`Delete ${selected.size} tournamen${selected.size > 1 ? 's' : ''}?`)) return
    await fetch('/api/admin/tournaments', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: Array.from(selected) }),
    })
    load()
    toast.success(`${selected.size} tournamen${selected.size > 1 ? 's' : ''} deleted`)
  }

  const allChecked = tournaments.length > 0 && selected.size === tournaments.length
  const someChecked = selected.size > 0 && selected.size < tournaments.length

  function toggleAll() {
    if (allChecked) setSelected(new Set())
    else setSelected(new Set(tournaments.map(t => t.id)))
  }

  function toggleOne(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Tournaments"
        description="Create and manage trading tournaments shown on the frontend"
        action={<Button onClick={() => router.push('/admin/tournaments/new')}><PlusCircle className="w-4 h-4 mr-2" /> New Tournament</Button>}
      />

      {selected.size > 0 && (
        <div className="mb-4 flex items-center gap-3 px-4 py-2.5 rounded-lg bg-muted/50 border border-border">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <Button size="sm" variant="destructive" onClick={bulkDelete}>
            <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete Selected
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      )}

      <TableWrap>
        <table className="w-full text-sm">
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allChecked}
                  onCheckedChange={toggleAll}
                  aria-label="Select all"
                  {...(someChecked ? { 'data-state': 'indeterminate' } : {})}
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Prize Fund</TableHead>
              <TableHead>Fee</TableHead>
              <TableHead>Starts</TableHead>
              <TableHead>Ends</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Entries</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(loading || switching) && <SkeletonRows cols={9} />}
            {!(loading || switching) && tournaments.map(t => (
              <TableRow key={t.id} className={selected.has(t.id) ? 'bg-muted/30' : ''}>
                <TableCell>
                  <Checkbox
                    checked={selected.has(t.id)}
                    onCheckedChange={() => toggleOne(t.id)}
                    aria-label={`Select ${t.name}`}
                  />
                </TableCell>
                <TableCell className="font-medium">{t.name}</TableCell>
                <TableCell className="text-[#22c55e] font-mono">KSh {Number(t.prize_fund).toLocaleString()}</TableCell>
                <TableCell className="text-muted-foreground">KSh {Number(t.participation_fee).toLocaleString()}</TableCell>
                <TableCell className="text-muted-foreground text-xs">{new Date(t.starts_at).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}</TableCell>
                <TableCell className="text-muted-foreground text-xs">{new Date(t.ends_at).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}</TableCell>
                <TableCell>{statusBadge(t.status)}</TableCell>
                <TableCell className="text-muted-foreground">{(t.tournament_entries?.length || 0)}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-blue-400 hover:text-blue-300" onClick={() => generateBots(t)} title="Generate bots">
                      <Bot className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => router.push(`/admin/tournaments/${t.id}`)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => del(t.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
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
