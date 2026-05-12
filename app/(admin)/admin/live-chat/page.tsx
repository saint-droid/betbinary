'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Trash2, PlusCircle, Send, Zap } from 'lucide-react'
import PageHeader from '@/components/admin/PageHeader'
import { useSite } from '@/components/admin/SiteContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface ChatMessage {
  id: string
  user_id: string | null
  username: string | null
  message: string
  type: 'user' | 'system_simulated' | 'system_real'
  is_deleted: boolean
  created_at: string
}

const TYPE_LABEL: Record<string, string> = {
  user:             'User',
  system_simulated: 'Simulated',
  system_real:      'Admin',
}
const TYPE_COLOR: Record<string, string> = {
  user:             'text-blue-400',
  system_simulated: 'text-emerald-400',
  system_real:      'text-orange-400',
}

export default function LiveChatPage() {
  const { selectedSiteId } = useSite()
  // ── Settings & name pool ────────────────────────────────────────
  const [names, setNames] = useState<any[]>([])
  const [settings, setSettings] = useState<any>(null)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)

  // ── Live messages ───────────────────────────────────────────────
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [adminInput, setAdminInput] = useState('')
  const [sendingMsg, setSendingMsg] = useState(false)
  const [simulating, setSimulating] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const isAtBottomRef = useRef(true)

  const scrollToBottom = useCallback((smooth = true) => {
    chatEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' })
  }, [])

  function loadSettings() {
    const chatUrl = selectedSiteId ? `/api/admin/chat?site_id=${selectedSiteId}` : '/api/admin/chat'
    const settingsUrl = selectedSiteId ? `/api/admin/settings?site_id=${selectedSiteId}` : '/api/admin/settings'
    Promise.all([
      fetch(chatUrl).then(r => r.json()),
      fetch(settingsUrl).then(r => r.json()),
    ]).then(([chatData, settingsData]) => {
      setNames(chatData.names || [])
      if (settingsData.settings) setSettings(settingsData.settings)
    })
  }

  const esRef = useRef<EventSource | null>(null)

  // Load initial messages + settings
  useEffect(() => {
    loadSettings()

    // Initial message load via REST (site-scoped via admin chat endpoint)
    const chatUrl = selectedSiteId ? `/api/admin/chat?site_id=${selectedSiteId}` : '/api/admin/chat'
    fetch(chatUrl)
      .then(r => r.json())
      .then(d => {
        if (d.messages) {
          setMessages(d.messages)
          setTimeout(() => scrollToBottom(false), 50)
        }
      })

    // SSE stream for real-time updates
    function connect() {
      const streamUrl = selectedSiteId ? `/api/chat/stream?site_id=${selectedSiteId}` : '/api/chat/stream'
      const es = new EventSource(streamUrl)
      esRef.current = es

      es.onmessage = (event) => {
        const data = JSON.parse(event.data)
        if (data.type === 'insert') {
          setMessages(prev => {
            if (prev.some((m: ChatMessage) => m.id === data.message.id)) return prev
            const next = [...prev, data.message]
            return next.length > 150 ? next.slice(-150) : next
          })
          if (isAtBottomRef.current) setTimeout(() => scrollToBottom(true), 30)
        }
        if (data.type === 'delete') {
          setMessages(prev => prev.filter((m: ChatMessage) => m.id !== data.id))
        }
      }

      es.onerror = () => {
        es.close()
        esRef.current = null
        setTimeout(connect, 3000)
      }
    }

    connect()

    return () => {
      esRef.current?.close()
      esRef.current = null
    }
  }, [scrollToBottom, selectedSiteId])

  // ── Settings helpers ────────────────────────────────────────────
  const sf = (k: string, v: any) => setSettings((s: any) => s ? { ...s, [k]: v } : s)

  async function saveSettings() {
    if (!settings) return
    setSaving(true)
    await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_simulation_enabled: settings.chat_simulation_enabled,
        chat_simulation_freq_min_secs: settings.chat_simulation_freq_min_secs,
        chat_simulation_freq_max_secs: settings.chat_simulation_freq_max_secs,
        chat_simulation_amount_min_kes: settings.chat_simulation_amount_min_kes,
        chat_simulation_amount_max_kes: settings.chat_simulation_amount_max_kes,
        chat_simulation_message_template: settings.chat_simulation_message_template,
        chat_real_users_enabled: settings.chat_real_users_enabled,
        chat_pinned_message: settings.chat_pinned_message,
      }),
    })
    setSaving(false)
    toast.success('Chat settings saved')
  }

  // ── Name pool helpers ───────────────────────────────────────────
  async function addName() {
    if (!newName.trim()) return
    await fetch('/api/admin/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_name', name: newName.trim() }),
    })
    setNewName('')
    loadSettings()
  }

  async function toggleName(id: string, is_active: boolean) {
    await fetch('/api/admin/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle_name', id, is_active }),
    })
    setNames(ns => ns.map(n => n.id === id ? { ...n, is_active } : n))
  }

  // ── Message helpers ─────────────────────────────────────────────
  async function deleteMsg(id: string) {
    await fetch('/api/admin/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_message', id }),
    })
    // Realtime UPDATE will remove it from state
  }

  async function sendAdminMessage() {
    if (!adminInput.trim() || sendingMsg) return
    const txt = adminInput.trim()
    setAdminInput('')
    setSendingMsg(true)
    await fetch('/api/admin/chat/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: txt, site_id: selectedSiteId || null }),
    })
    setSendingMsg(false)
  }

  async function triggerSimulation() {
    setSimulating(true)
    const res = await fetch('/api/chat/simulate', { method: 'POST' })
    const data = await res.json()
    if (data.success) toast.success('Simulated message sent')
    else if (data.skipped) toast.info('Simulation disabled or no active names')
    else toast.error(data.error || 'Failed')
    setSimulating(false)
  }

  function formatTime(iso: string) {
    const d = new Date(iso)
    return `${d.toLocaleDateString()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <PageHeader title="Live Chat Control" />

      {/* ── Top row: Simulation settings + Name pool ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Simulation Settings</CardTitle></CardHeader>
          <CardContent>
            {settings && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="sim-enabled">Enable simulation messages</Label>
                  <Switch id="sim-enabled" checked={settings.chat_simulation_enabled} onCheckedChange={v => sf('chat_simulation_enabled', v)} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="real-enabled">Allow real user messages</Label>
                  <Switch id="real-enabled" checked={settings.chat_real_users_enabled} onCheckedChange={v => sf('chat_real_users_enabled', v)} />
                </div>
                {[
                  { k: 'chat_simulation_freq_min_secs', label: 'Min frequency (secs)' },
                  { k: 'chat_simulation_freq_max_secs', label: 'Max frequency (secs)' },
                  { k: 'chat_simulation_amount_min_kes', label: 'Min amount (KES)' },
                  { k: 'chat_simulation_amount_max_kes', label: 'Max amount (KES)' },
                ].map(({ k, label }) => (
                  <div key={k} className="space-y-1.5">
                    <Label>{label}</Label>
                    <Input type="number" value={settings[k]} onChange={e => sf(k, parseInt(e.target.value))} />
                  </div>
                ))}
                <div className="space-y-1.5">
                  <Label>Message Template <span className="text-muted-foreground text-xs">(use {'{name}'} and {'{amount}'})</span></Label>
                  <Textarea rows={2} value={settings.chat_simulation_message_template} onChange={e => sf('chat_simulation_message_template', e.target.value)} className="resize-none" />
                </div>
                <div className="space-y-1.5">
                  <Label>Pinned Announcement</Label>
                  <Input value={settings.chat_pinned_message || ''} onChange={e => sf('chat_pinned_message', e.target.value)} placeholder="Optional pinned message..." />
                </div>
                <Button onClick={saveSettings} disabled={saving}>{saving ? 'Saving…' : 'Save Settings'}</Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Name Pool</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-3">
              <Input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Add name…"
                className="flex-1"
                onKeyDown={e => e.key === 'Enter' && addName()}
              />
              <Button size="icon" onClick={addName}><PlusCircle className="w-4 h-4" /></Button>
            </div>
            <ScrollArea className="h-64">
              <div className="space-y-1.5 pr-2">
                {names.map(n => (
                  <div key={n.id} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-muted">
                    <span className={cn('text-sm', !n.is_active && 'line-through text-muted-foreground')}>{n.name}</span>
                    <button onClick={() => toggleName(n.id, !n.is_active)}>
                      <Badge variant={n.is_active ? 'default' : 'secondary'} className="text-xs cursor-pointer">
                        {n.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* ── Live chat feed ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Live Chat Feed</CardTitle>
            <Button size="sm" variant="outline" onClick={triggerSimulation} disabled={simulating} className="gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              {simulating ? 'Sending…' : 'Simulate Now'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Messages */}
          <div
            ref={listRef}
            onScroll={() => {
              const el = listRef.current
              if (!el) return
              isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
            }}
            className="h-80 overflow-y-auto px-4 py-3 space-y-1 border-b border-border"
          >
            {messages.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-8">No messages yet. Chat is quiet.</p>
            )}
            {messages.map(m => (
              <div
                key={m.id}
                className="group flex items-start gap-3 py-1.5 px-2 -mx-2 rounded-lg hover:bg-muted/40 transition-colors"
              >
                <span className={cn('text-[10px] font-bold uppercase mt-0.5 w-16 shrink-0', TYPE_COLOR[m.type] ?? 'text-muted-foreground')}>
                  {TYPE_LABEL[m.type] ?? m.type}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-foreground truncate">{m.username || '—'}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">{formatTime(m.created_at)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground break-words">{m.message}</p>
                </div>
                <button
                  onClick={() => deleteMsg(m.id)}
                  className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive/70 transition-opacity shrink-0 mt-0.5"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Admin send */}
          <div className="flex items-center gap-2 px-4 py-3">
            <input
              type="text"
              value={adminInput}
              onChange={e => setAdminInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendAdminMessage()}
              placeholder="Send announcement to all users…"
              maxLength={500}
              className="flex-1 bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
            />
            <Button onClick={sendAdminMessage} disabled={!adminInput.trim() || sendingMsg} size="sm" className="gap-1.5 shrink-0">
              <Send className="w-3.5 h-3.5" />
              {sendingMsg ? 'Sending…' : 'Send'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
