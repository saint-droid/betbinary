'use client'

import { useEffect, useState } from 'react'
import { PlusCircle, Trash2, GripVertical } from 'lucide-react'
import PageHeader from '@/components/admin/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export default function NewsTickerPage() {
  const [items, setItems] = useState<any[]>([])
  const [settings, setSettings] = useState<any>(null)
  const [newHeadline, setNewHeadline] = useState('')
  const [saving, setSaving] = useState(false)

  function load() {
    Promise.all([fetch('/api/admin/news').then(r => r.json()), fetch('/api/admin/settings').then(r => r.json())])
      .then(([newsData, settingsData]) => { setItems(newsData.items || []); setSettings(settingsData.settings) })
  }

  useEffect(() => { load() }, [])

  async function addItem() {
    if (!newHeadline.trim()) return
    await fetch('/api/admin/news', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ headline: newHeadline.trim(), sort_order: items.length + 1 }) })
    setNewHeadline(''); load()
  }

  async function deleteItem(id: string) {
    await fetch('/api/admin/news', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', id }) })
    load()
  }

  async function toggleItem(id: string, is_active: boolean) {
    await fetch('/api/admin/news', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, is_active }) })
    setItems(its => its.map(i => i.id === id ? { ...i, is_active } : i))
  }

  async function saveSettings() {
    setSaving(true)
    await fetch('/api/admin/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ news_ticker_enabled: settings.news_ticker_enabled, news_scroll_speed: settings.news_scroll_speed }) })
    setSaving(false); toast.success('Ticker settings saved')
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <PageHeader title="News Ticker" description="Manage scrolling headlines on the trading screen" />

      {settings && (
        <Card className="mb-6">
          <CardContent className="pt-5">
            <div className="flex flex-wrap gap-6 items-end">
              <div className="flex items-center gap-3">
                <Switch id="ticker-enabled" checked={settings.news_ticker_enabled} onCheckedChange={v => setSettings((s: any) => ({ ...s, news_ticker_enabled: v }))} />
                <Label htmlFor="ticker-enabled">Ticker enabled</Label>
              </div>
              <div className="space-y-1.5">
                <Label>Scroll speed (px/s)</Label>
                <Input type="number" value={settings.news_scroll_speed} onChange={e => setSettings((s: any) => ({ ...s, news_scroll_speed: parseInt(e.target.value) }))} className="w-24" />
              </div>
              <Button onClick={saveSettings} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2 mb-4">
        <Input value={newHeadline} onChange={e => setNewHeadline(e.target.value)} placeholder="New headline text..." onKeyDown={e => e.key === 'Enter' && addItem()} className="flex-1" />
        <Button onClick={addItem}><PlusCircle className="w-4 h-4 mr-2" /> Add</Button>
      </div>

      <div className="space-y-2">
        {items.map(item => (
          <Card key={item.id}>
            <CardContent className="py-3 px-4 flex items-center gap-3">
              <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
              <p className={cn('flex-1 text-sm', !item.is_active && 'line-through text-muted-foreground')}>{item.headline}</p>
              <button onClick={() => toggleItem(item.id, !item.is_active)}>
                <Badge variant={item.is_active ? 'default' : 'secondary'} className="cursor-pointer shrink-0">
                  {item.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </button>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0" onClick={() => deleteItem(item.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
        {items.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No headlines yet. Add one above.</p>}
      </div>
    </div>
  )
}
