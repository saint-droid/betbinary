'use client'

import { useEffect, useState } from 'react'
import { Send, ChevronLeft } from 'lucide-react'
import PageHeader from '@/components/admin/PageHeader'
import { useSite } from '@/components/admin/SiteContext'
import Badge from '@/components/admin/Badge'
import { TableWrap, TableHeader, TableRow, TableHead, TableBody, TableCell, EmptyRow, SkeletonRows } from '@/components/admin/Table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export default function SupportPage() {
  const { selectedSiteId, switching } = useSite()
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('all')
  const [selected, setSelected] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)

  function loadTickets() {
    setLoading(true)
    const params = new URLSearchParams()
    if (status !== 'all') params.set('status', status)
    if (selectedSiteId) params.set('site_id', selectedSiteId)
    fetch(`/api/admin/support?${params}`).then(r => r.json()).then(d => { setTickets(d.tickets || []); setLoading(false) })
  }

  useEffect(() => { loadTickets() }, [status, selectedSiteId])

  function selectTicket(t: any) {
    setSelected(t)
    fetch(`/api/admin/support?ticket_id=${t.id}`).then(r => r.json()).then(d => { setSelected(d.ticket); setMessages(d.messages || []) })
  }

  async function sendReply() {
    if (!reply.trim() || !selected) return
    setSending(true)
    await fetch('/api/admin/support', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reply', ticket_id: selected.id, message: reply }) })
    setReply(''); setSending(false); selectTicket(selected); loadTickets()
    toast.success('Reply sent')
  }

  async function setTicketStatus(ticket_id: string, stat: string) {
    await fetch('/api/admin/support', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'set_status', ticket_id, status: stat }) })
    loadTickets(); if (selected?.id === ticket_id) setSelected((s: any) => ({ ...s, status: stat }))
  }

  if (selected) {
    return (
      <div className="p-6 lg:p-8 max-w-3xl mx-auto">
        <Button variant="ghost" size="sm" className="mb-5 text-muted-foreground" onClick={() => setSelected(null)}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to Tickets
        </Button>

        <Card className="mb-4">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold">{selected.subject}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">{(selected.users as any)?.username} — {(selected.users as any)?.phone}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge status={selected.status} />
                <Select value={selected.status} onValueChange={v => setTicketStatus(selected.id, v)}>
                  <SelectTrigger className="w-32 h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-4">
          <ScrollArea className="h-80">
            <CardContent className="pt-5 space-y-4">
              {messages.map(m => (
                <div key={m.id} className={cn('flex', m.is_admin ? 'justify-end' : 'justify-start')}>
                  <div className={cn('max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm', m.is_admin ? 'bg-primary/15 text-primary-foreground dark:text-primary' : 'bg-muted text-muted-foreground')}>
                    <p>{m.message}</p>
                    <p className="text-xs mt-1 opacity-60">{new Date(m.created_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
              {messages.length === 0 && <p className="text-sm text-center text-muted-foreground">No messages yet.</p>}
            </CardContent>
          </ScrollArea>
        </Card>

        <div className="flex gap-3">
          <Textarea value={reply} onChange={e => setReply(e.target.value)} placeholder="Type your reply..." rows={3} className="flex-1 resize-none" />
          <Button className="self-end" size="icon" onClick={sendReply} disabled={sending || !reply.trim()}><Send className="w-4 h-4" /></Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8">
      <PageHeader title="Support Tickets" description={`${tickets.length} tickets`} />

      <div className="mb-5">
        <Select value={status} onValueChange={v => v && setStatus(v)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <TableWrap>
        <table className="w-full text-sm">
          <TableHeader>
            <TableRow><TableHead>User</TableHead><TableHead>Subject</TableHead><TableHead>Status</TableHead><TableHead>Updated</TableHead><TableHead></TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {(loading || switching) && <SkeletonRows cols={5} />}
            {!(loading || switching) && tickets.length === 0 && <EmptyRow cols={5} message="No tickets found." />}
            {!(loading || switching) && tickets.map(t => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{(t.users as any)?.username || '—'}</TableCell>
                <TableCell className="text-muted-foreground">{t.subject}</TableCell>
                <TableCell><Badge status={t.status} /></TableCell>
                <TableCell className="text-muted-foreground">{new Date(t.updated_at).toLocaleDateString()}</TableCell>
                <TableCell><Button variant="ghost" size="sm" className="text-primary hover:text-primary" onClick={() => selectTicket(t)}>Open →</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </table>
      </TableWrap>
    </div>
  )
}
