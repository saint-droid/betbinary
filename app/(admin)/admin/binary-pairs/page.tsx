'use client'

import { useEffect, useState, useCallback } from 'react'
import { PlusCircle, Pencil, Trash2, RefreshCw, Play, Square, Wifi, WifiOff, Search } from 'lucide-react'
import PageHeader from '@/components/admin/PageHeader'
import Badge from '@/components/admin/Badge'
import { TableWrap, TableHeader, TableRow, TableHead, TableBody, TableCell, SkeletonRows } from '@/components/admin/Table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'

const emptyPair = {
  symbol: '', display_name: '', deriv_symbol: '',
  is_active: true, sort_order: 0,
}

interface DerivSymbol { symbol: string; displayName: string; marketName: string; submarketName: string; pip: number }
interface WorkerStatus { status: string; pairs: string[]; lastError: string | null; startedAt: number | null }

export default function BinaryPairsPage() {
  const [pairs, setPairs]     = useState<any[]>([])
  const [editing, setEditing] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  const [worker, setWorker]           = useState<WorkerStatus | null>(null)
  const [workerLoading, setWorkerLoading] = useState(false)

  const [derivSymbols, setDerivSymbols] = useState<DerivSymbol[]>([])
  const [derivSearch, setDerivSearch]   = useState('')
  const [derivLoading, setDerivLoading] = useState(false)
  const [showDerivPicker, setShowDerivPicker] = useState(false)

  function load() {
    setLoading(true)
    fetch('/api/admin/binary-pairs').then(r => r.json()).then(d => { setPairs(d.pairs || []); setLoading(false) })
  }

  const loadWorker = useCallback(() => {
    fetch('/api/admin/deriv-worker').then(r => r.json()).then(setWorker).catch(() => {})
  }, [])

  useEffect(() => { load(); loadWorker() }, [loadWorker])

  useEffect(() => {
    const t = setInterval(loadWorker, 5000)
    return () => clearInterval(t)
  }, [loadWorker])

  async function workerAction(action: string) {
    setWorkerLoading(true)
    const res = await fetch('/api/admin/deriv-worker', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    const data = await res.json()
    if (data.status) setWorker(data.status)
    setWorkerLoading(false)
    toast.success(`Worker ${action === 'reload' ? 'reloaded' : action === 'start' ? 'started' : 'stopped'}`)
  }

  async function loadDerivSymbols() {
    if (derivSymbols.length > 0) { setShowDerivPicker(true); return }
    setDerivLoading(true)
    setShowDerivPicker(true)
    const res = await fetch('/api/admin/deriv-pairs')
    const data = await res.json()
    if (data.error) toast.error(data.error)
    setDerivSymbols(data.symbols ?? [])
    setDerivLoading(false)
  }

  async function save() {
    const isNew = !editing.id
    const body = {
      ...editing,
      deriv_symbol: editing.deriv_symbol || '',
    }
    const res = await fetch('/api/admin/binary-pairs', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    const result = await res.json()
    if (result.error) { toast.error(result.error); return }
    setEditing(null); load()

    if (editing.deriv_symbol) {
      await fetch('/api/admin/deriv-worker', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reload' }),
      })
      toast.success(isNew ? 'Binary pair added — Deriv worker reloaded' : 'Pair saved — worker reloaded')
    } else {
      toast.success('Binary pair saved')
    }
    loadWorker()
  }

  async function del(id: string) {
    if (!confirm('Delete this binary pair?')) return
    const res = await fetch('/api/admin/binary-pairs', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }),
    })
    const result = await res.json()
    if (result.error) { toast.error(result.error); return }
    load(); toast.success('Pair deleted')
  }

  const f = (k: string, v: any) => setEditing((e: any) => ({ ...e, [k]: v }))

  const filteredSymbols = derivSymbols.filter(s =>
    s.displayName.toLowerCase().includes(derivSearch.toLowerCase()) ||
    s.symbol.toLowerCase().includes(derivSearch.toLowerCase()) ||
    (s.submarketName || '').toLowerCase().includes(derivSearch.toLowerCase())
  )

  const statusColor = worker?.status === 'connected' ? 'text-green-400' : worker?.status === 'connecting' ? 'text-yellow-400' : 'text-red-400'

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <PageHeader
        title="Binary Pairs"
        description="Manage pairs shown on the /trade page for digit-based contracts (Even/Odd, Matches/Differs, Over/Under). Payouts are configured in Settings → Trading."
        action={<Button onClick={() => setEditing({ ...emptyPair })}><PlusCircle className="w-4 h-4 mr-2" /> New Pair</Button>}
      />

      {/* Deriv Worker Status */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-sm">Deriv Live Feed Worker</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Real-time price feed from Deriv WebSocket API</p>
          </div>
          <div className="flex items-center gap-2">
            {worker?.status === 'connected' ? <Wifi className="w-4 h-4 text-green-400" /> : <WifiOff className="w-4 h-4 text-red-400" />}
            <span className={`text-sm font-medium capitalize ${statusColor}`}>{worker?.status ?? 'unknown'}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="bg-muted/40 rounded-lg p-3">
            <div className="text-xs text-muted-foreground">Live Pairs</div>
            <div className="text-lg font-bold">{worker?.pairs?.length ?? 0}</div>
            {worker?.pairs?.length ? <div className="text-xs text-muted-foreground truncate">{worker.pairs.join(', ')}</div> : null}
          </div>
          <div className="bg-muted/40 rounded-lg p-3">
            <div className="text-xs text-muted-foreground">Started</div>
            <div className="text-sm font-medium">{worker?.startedAt ? new Date(worker.startedAt).toLocaleTimeString() : '—'}</div>
          </div>
          <div className="bg-muted/40 rounded-lg p-3 col-span-2">
            <div className="text-xs text-muted-foreground">Last Error</div>
            <div className="text-xs font-mono text-red-400 truncate">{worker?.lastError ?? 'None'}</div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button size="sm" disabled={workerLoading || worker?.status === 'connected' || worker?.status === 'connecting'}
            onClick={() => workerAction('start')}>
            <Play className="w-3.5 h-3.5 mr-1.5" /> Start
          </Button>
          <Button size="sm" variant="outline" disabled={workerLoading || worker?.status === 'stopped'}
            onClick={() => workerAction('stop')}>
            <Square className="w-3.5 h-3.5 mr-1.5" /> Stop
          </Button>
          <Button size="sm" variant="outline" disabled={workerLoading}
            onClick={() => workerAction('reload')}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Reload Pairs
          </Button>
          <Button size="sm" variant="ghost" onClick={loadWorker}>
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editing} onOpenChange={open => !open && setEditing(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? 'Edit Binary Pair' : 'New Binary Pair'}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              {/* Deriv Symbol picker */}
              <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Deriv Live Symbol</Label>
                  {editing.deriv_symbol && (
                    <button className="text-xs text-muted-foreground hover:text-destructive" onClick={() => f('deriv_symbol', '')}>Clear</button>
                  )}
                </div>
                {editing.deriv_symbol
                  ? <div className="flex items-center gap-2 text-sm">
                      <Wifi className="w-3.5 h-3.5 text-green-400 shrink-0" />
                      <span className="font-mono font-medium">{editing.deriv_symbol}</span>
                      <span className="text-muted-foreground">— live prices from Deriv</span>
                    </div>
                  : <div className="text-xs text-muted-foreground">No Deriv symbol set</div>
                }
                <Button size="sm" variant="outline" type="button" onClick={loadDerivSymbols}>
                  <Search className="w-3.5 h-3.5 mr-1.5" />
                  {editing.deriv_symbol ? 'Change Symbol' : 'Pick Deriv Symbol'}
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Symbol</Label>
                  <Input value={editing.symbol} onChange={e => f('symbol', e.target.value)} placeholder="e.g. V10_1S" />
                </div>
                <div className="space-y-1.5">
                  <Label>Display Name</Label>
                  <Input value={editing.display_name} onChange={e => f('display_name', e.target.value)} placeholder="e.g. Volatility 10 (1s)" />
                </div>
                <div className="space-y-1.5">
                  <Label>Sort Order</Label>
                  <Input type="number" value={editing.sort_order} onChange={e => f('sort_order', parseInt(e.target.value))} />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch checked={!!editing.is_active} onCheckedChange={v => f('is_active', v)} id="bp-active" />
                <Label htmlFor="bp-active">Active</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save}>Save Pair</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deriv Symbol Picker Dialog */}
      <Dialog open={showDerivPicker} onOpenChange={setShowDerivPicker}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader><DialogTitle>Pick Deriv Symbol</DialogTitle></DialogHeader>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search symbols…" value={derivSearch} onChange={e => setDerivSearch(e.target.value)} autoFocus />
          </div>
          <div className="overflow-y-auto flex-1 space-y-1 pr-1">
            {derivLoading && <div className="text-center text-sm text-muted-foreground py-8">Loading Deriv symbols…</div>}
            {!derivLoading && filteredSymbols.map(s => (
              <button
                key={s.symbol}
                className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-muted/60 transition-colors flex items-center justify-between group"
                onClick={() => {
                  f('deriv_symbol', s.symbol)
                  if (editing && !editing.symbol) f('symbol', s.symbol)
                  if (editing && !editing.display_name) f('display_name', s.displayName)
                  setShowDerivPicker(false)
                  setDerivSearch('')
                }}
              >
                <div>
                  <div className="text-sm font-mono font-medium">{s.symbol}</div>
                  <div className="text-xs text-muted-foreground">{s.displayName} · {s.submarketName}</div>
                </div>
                <div className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100">Select</div>
              </button>
            ))}
            {!derivLoading && filteredSymbols.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-8">No symbols found</div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Pairs Table */}
      <TableWrap>
        <table className="w-full text-sm">
          <TableHeader>
            <TableRow>
              <TableHead>Symbol</TableHead>
              <TableHead>Display Name</TableHead>
              <TableHead>Deriv Symbol</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sort</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <SkeletonRows cols={6} />}
            {!loading && pairs.map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-mono font-medium">{p.symbol}</TableCell>
                <TableCell className="text-muted-foreground">{p.display_name}</TableCell>
                <TableCell>
                  {p.deriv_symbol
                    ? <span className="flex items-center gap-1 text-green-400 font-mono text-xs"><Wifi className="w-3 h-3" />{p.deriv_symbol}</span>
                    : <span className="text-muted-foreground text-xs">—</span>
                  }
                </TableCell>
                <TableCell><Badge status={p.is_active ? 'active' : 'suspended'} /></TableCell>
                <TableCell className="text-muted-foreground">{p.sort_order}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7"
                      onClick={() => setEditing({ ...p, deriv_symbol: p.deriv_symbol || '' })}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => del(p.id)}>
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
