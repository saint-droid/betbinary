'use client'

import { useEffect, useState } from 'react'
import PageHeader from '@/components/admin/PageHeader'
import { Globe, Copy, Check, Pencil, X, Save, PlusCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface Site {
  id: string
  name: string
  slug: string
  domain: string | null
  created_at: string
}

export default function SitesPage() {
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', slug: '', domain: '' })
  const [saving, setSaving] = useState(false)
  const [adding, setAdding] = useState(false)
  const [newForm, setNewForm] = useState({ name: '', slug: '', domain: '' })
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetch('/api/admin/sites')
      .then(r => r.json())
      .then(d => { setSites(d.sites || []); setLoading(false) })
  }, [])

  function copyId(id: string) {
    navigator.clipboard.writeText(id)
    setCopied(id)
    toast.success('Site ID copied')
    setTimeout(() => setCopied(null), 2000)
  }

  function startEdit(site: Site) {
    setEditingId(site.id)
    setEditForm({ name: site.name, slug: site.slug, domain: site.domain || '' })
  }

  function cancelEdit() {
    setEditingId(null)
  }

  function toSlug(name: string) {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  }

  async function createSite() {
    if (!newForm.name.trim() || !newForm.slug.trim()) {
      toast.error('Name and slug are required')
      return
    }
    setCreating(true)
    const res = await fetch('/api/admin/sites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newForm),
    })
    const data = await res.json()
    setCreating(false)
    if (!res.ok) { toast.error(data.error || 'Failed to create site'); return }
    setSites(ss => [...ss, data.site])
    setNewForm({ name: '', slug: '', domain: '' })
    setAdding(false)
    toast.success('Site created')
  }

  async function saveEdit(id: string) {
    setSaving(true)
    const res = await fetch('/api/admin/sites', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...editForm }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { toast.error(data.error || 'Failed to save'); return }
    setSites(ss => ss.map(s => s.id === id ? { ...s, ...editForm, domain: editForm.domain || null } : s))
    setEditingId(null)
    toast.success('Site updated')
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <PageHeader
        title="Sites"
        description="All registered sites sharing this Supabase backend. Set NEXT_PUBLIC_SITE_ID in each deployment's environment variables."
      />

      {/* Add new site */}
      <div className="mt-6">
        {!adding ? (
          <Button onClick={() => setAdding(true)} className="gap-2">
            <PlusCircle className="w-4 h-4" />
            Add New Site
          </Button>
        ) : (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-3">
            <p className="text-sm font-semibold">New Site</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Site Name <span className="text-destructive">*</span></Label>
                <Input
                  value={newForm.name}
                  onChange={e => {
                    const name = e.target.value
                    setNewForm(f => ({ ...f, name, slug: f.slug || toSlug(name) }))
                  }}
                  placeholder="My Trading Site"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Slug <span className="text-destructive">*</span></Label>
                <Input
                  value={newForm.slug}
                  onChange={e => setNewForm(f => ({ ...f, slug: toSlug(e.target.value) }))}
                  placeholder="my-trading-site"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Domain <span className="text-muted-foreground">(optional)</span></Label>
              <Input
                value={newForm.domain}
                onChange={e => setNewForm(f => ({ ...f, domain: e.target.value }))}
                placeholder="https://mysite.com"
              />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Button size="sm" onClick={createSite} disabled={creating} className="gap-1.5">
                <Save className="w-3.5 h-3.5" />
                {creating ? 'Creating…' : 'Create Site'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setNewForm({ name: '', slug: '', domain: '' }) }} className="gap-1.5">
                <X className="w-3.5 h-3.5" />
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {loading && [1, 2].map(i => (
          <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
        ))}

        {!loading && sites.map(site => (
          <div key={site.id} className="rounded-xl border border-border bg-card p-5">
            {editingId === site.id ? (
              /* ── Edit mode ── */
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Site Name</Label>
                    <Input
                      value={editForm.name}
                      onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="My Trading Site"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Slug</Label>
                    <Input
                      value={editForm.slug}
                      onChange={e => setEditForm(f => ({ ...f, slug: e.target.value }))}
                      placeholder="my-trading-site"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Domain <span className="text-muted-foreground">(optional)</span></Label>
                  <Input
                    value={editForm.domain}
                    onChange={e => setEditForm(f => ({ ...f, domain: e.target.value }))}
                    placeholder="https://mysite.com"
                  />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Button size="sm" onClick={() => saveEdit(site.id)} disabled={saving} className="gap-1.5">
                    <Save className="w-3.5 h-3.5" />
                    {saving ? 'Saving…' : 'Save'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={cancelEdit} className="gap-1.5">
                    <X className="w-3.5 h-3.5" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              /* ── View mode ── */
              <>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Globe className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{site.name}</p>
                      <p className="text-xs text-muted-foreground">{site.domain || site.slug}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEdit(site)}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded border border-border hover:border-primary"
                    >
                      <Pencil className="w-3 h-3" />
                      Edit
                    </button>
                    <button
                      onClick={() => copyId(site.id)}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded border border-border hover:border-primary"
                    >
                      {copied === site.id ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                      <span className="font-mono">{site.id.slice(0, 8)}…</span>
                    </button>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-[11px] text-muted-foreground font-mono">
                    NEXT_PUBLIC_SITE_ID=<span className="text-foreground">{site.id}</span>
                  </p>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-border bg-muted/30 p-5 space-y-2">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">How to deploy a new site</p>
        <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
          <li>Insert a new row into the <code className="text-foreground">sites</code> table in Supabase.</li>
          <li>Create a new Vercel project pointing to this same repository.</li>
          <li>Set <code className="text-foreground">NEXT_PUBLIC_SITE_ID</code> to the new site's UUID in Vercel env vars.</li>
          <li>Copy the same <code className="text-foreground">SUPABASE_*</code> and other env vars from the existing project.</li>
          <li>Deploy — users who register on that domain will be stamped with that site's ID.</li>
        </ol>
      </div>
    </div>
  )
}
