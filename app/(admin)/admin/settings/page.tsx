'use client'

import { useEffect, useState } from 'react'
import PageHeader from '@/components/admin/PageHeader'
import { useSite } from '@/components/admin/SiteContext'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

const SaveBtn = ({ onClick, saving }: { onClick: () => void; saving: boolean }) => (
  <Button onClick={onClick} disabled={saving} className="mt-4">{saving ? 'Saving...' : 'Save Changes'}</Button>
)

const Field = ({ k, label, type = 'text', placeholder = '', settings, sf }: { k: string; label: string; type?: string; placeholder?: string; settings: any; sf: (k: string, v: any) => void }) => (
  <div className="space-y-1.5">
    <Label>{label}</Label>
    <Input type={type} value={settings?.[k] ?? ''} onChange={e => sf(k, type === 'number' ? parseFloat(e.target.value) : e.target.value)} placeholder={placeholder} />
  </div>
)

const Toggle = ({ k, label, settings, sf }: { k: string; label: string; settings: any; sf: (k: string, v: any) => void }) => (
  <div className="flex items-center justify-between">
    <Label htmlFor={`toggle-${k}`}>{label}</Label>
    <Switch id={`toggle-${k}`} checked={settings?.[k] || false} onCheckedChange={v => sf(k, v)} />
  </div>
)

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const { selectedSiteId, selectedSite } = useSite()

  useEffect(() => {
    const url = selectedSiteId
      ? `/api/admin/settings?site_id=${selectedSiteId}`
      : '/api/admin/settings'
    fetch(url).then(r => r.json()).then(d => setSettings(d.settings))
  }, [selectedSiteId])

  const sf = (k: string, v: any) => setSettings((s: any) => s ? { ...s, [k]: v } : s)

  async function save(fields: Record<string, unknown>, perSite = false) {
    setSaving(true)
    const url = perSite && selectedSiteId
      ? `/api/admin/settings?site_id=${selectedSiteId}`
      : '/api/admin/settings'
    await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fields) })
    setSaving(false); toast.success('Settings saved')
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <PageHeader
        title="Platform Settings"
        description={selectedSite ? `Editing site-specific settings for ${selectedSite.name}` : 'Universal settings apply to all sites'}
      />

      {!settings ? (
        <div className="space-y-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-12" />)}</div>
      ) : (
        <Tabs defaultValue="general">
          <TabsList className="mb-6 flex flex-wrap h-auto gap-1">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="currency">Currency & Rates</TabsTrigger>
            <TabsTrigger value="trading">Trading</TabsTrigger>
            <TabsTrigger value="deposits">Deposits</TabsTrigger>
            <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card><CardContent className="pt-6 space-y-4">
              {!selectedSiteId && (
                <p className="text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                  Select a site from the dropdown in the top bar to edit site-specific branding.
                </p>
              )}
              <Field settings={settings} sf={sf} k="site_name" label="Site Name (shown in header logo)" />
              <Field settings={settings} sf={sf} k="site_title" label="Browser Tab Title" placeholder="Leave blank to use Site Name" />
              <Field settings={settings} sf={sf} k="logo_url" label="Logo URL" placeholder="https://..." />
              <Field settings={settings} sf={sf} k="favicon_url" label="Favicon URL" placeholder="https://..." />
              <Field settings={settings} sf={sf} k="footer_text" label="Footer Text" />
              <Toggle settings={settings} sf={sf} k="maintenance_mode" label="Maintenance Mode (shows maintenance page to all users)" />
              <Toggle settings={settings} sf={sf} k="show_currency_switcher" label="Show currency switcher on frontend" />
              <Separator />
              <Field settings={settings} sf={sf} k="whatsapp_community_url" label="WhatsApp Community URL" placeholder="https://whatsapp.com/channel/... (leave blank to hide button)" />
              <Separator />
              <Field settings={settings} sf={sf} k="marketer_percentage" label="Marketer Percentage (%)" type="number" placeholder="30" />
              <p className="text-xs text-muted-foreground -mt-2">Deposits shown on /marketing page = actual × (this % / 100). Default: 30</p>
              <SaveBtn saving={saving} onClick={() => save({ site_name: settings.site_name, site_title: settings.site_title, logo_url: settings.logo_url, favicon_url: settings.favicon_url, footer_text: settings.footer_text, maintenance_mode: settings.maintenance_mode, show_currency_switcher: settings.show_currency_switcher, whatsapp_community_url: settings.whatsapp_community_url || null, marketer_percentage: settings.marketer_percentage ?? 30 }, true)} />
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="currency">
            <Card><CardContent className="pt-6 space-y-4">
              <Field settings={settings} sf={sf} k="conversion_rate" label="KES to USD Conversion Rate" type="number" />
              <div className="space-y-1.5">
                <Label>Default Currency for New Users</Label>
                <Select value={settings.default_currency} onValueChange={v => sf('default_currency', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="KES">KES</SelectItem><SelectItem value="USD">USD</SelectItem></SelectContent>
                </Select>
              </div>
              <Toggle settings={settings} sf={sf} k="show_currency_switcher" label="Show currency switcher on frontend" />
              <SaveBtn saving={saving} onClick={() => save({ conversion_rate: settings.conversion_rate, default_currency: settings.default_currency, show_currency_switcher: settings.show_currency_switcher })} />
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="trading">
            <Card><CardContent className="pt-6 space-y-4">
              <div className="space-y-1.5">
                <Label>Candle Duration</Label>
                <Select value={String(settings.candle_duration_seconds)} onValueChange={v => v && sf('candle_duration_seconds', parseInt(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 seconds</SelectItem><SelectItem value="30">30 seconds</SelectItem>
                    <SelectItem value="60">1 minute</SelectItem><SelectItem value="300">5 minutes</SelectItem><SelectItem value="900">15 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field settings={settings} sf={sf} k="trade_duration_seconds" label="Trade Duration (seconds)" type="number" />
                <Field settings={settings} sf={sf} k="trade_ticks" label="Trade Duration (ticks)" type="number" placeholder="2" />
              </div>
              <Field settings={settings} sf={sf} k="payout_multiplier" label="Standard Payout Multiplier (e.g. 1.80 = 1.8×)" type="number" />
              <Field settings={settings} sf={sf} k="payout_multiplier_vip" label="VIP Payout Multiplier (e.g. 10 = 10×)" type="number" />
              <Separator />
              <p className="text-sm font-medium">Per-Trade-Type Payouts (multiplier, e.g. 1.9522 = 95.22%)</p>
              <div className="grid grid-cols-2 gap-4">
                <Field settings={settings} sf={sf} k="payout_even_odd" label="Even / Odd" type="number" placeholder="1.9522" />
                <Field settings={settings} sf={sf} k="payout_match" label="Match" type="number" placeholder="9.50" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Field settings={settings} sf={sf} k="payout_differ" label="Differ" type="number" placeholder="1.0556" />
                <Field settings={settings} sf={sf} k="payout_over" label="Over" type="number" placeholder="2.375" />
                <Field settings={settings} sf={sf} k="payout_under" label="Under" type="number" placeholder="1.90" />
              </div>
              <p className="text-xs text-muted-foreground -mt-2">Payout % shown = (multiplier − 1) × 100. Match defaults to 850%, Differ to 5.56%.</p>
              <p className="text-sm font-medium">Stake Limits</p>
              <div className="grid grid-cols-2 gap-4">
                <Field settings={settings} sf={sf} k="min_stake_usd" label="Min Stake (USD)" type="number" placeholder="1" />
                <Field settings={settings} sf={sf} k="max_stake_usd" label="Max Stake (USD)" type="number" placeholder="5000" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field settings={settings} sf={sf} k="min_stake_kes" label="Min Stake (KES)" type="number" placeholder="50" />
                <Field settings={settings} sf={sf} k="max_stake_kes" label="Max Stake (KES)" type="number" placeholder="100000" />
              </div>
              <Field settings={settings} sf={sf} k="buy_button_label" label="BUY Button Label" />
              <Field settings={settings} sf={sf} k="sell_button_label" label="SELL Button Label" />
              <div className="space-y-1.5">
                <Label>Market Status</Label>
                <Select value={settings.market_status} onValueChange={v => sf('market_status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="live">Live (trading enabled)</SelectItem><SelectItem value="offline">Offline (trading disabled)</SelectItem></SelectContent>
                </Select>
              </div>
              <Field settings={settings} sf={sf} k="demo_starting_balance" label="Demo Starting Balance (USD)" type="number" />
              <Toggle settings={settings} sf={sf} k="show_demo_badge" label="Show DEMO badge in header" />
              <SaveBtn saving={saving} onClick={() => save({ candle_duration_seconds: settings.candle_duration_seconds, trade_duration_seconds: settings.trade_duration_seconds, trade_ticks: settings.trade_ticks, payout_multiplier: settings.payout_multiplier, payout_multiplier_vip: settings.payout_multiplier_vip, payout_even_odd: settings.payout_even_odd, payout_match: settings.payout_match, payout_differ: settings.payout_differ, payout_over: settings.payout_over, payout_under: settings.payout_under, min_stake_usd: settings.min_stake_usd, max_stake_usd: settings.max_stake_usd, min_stake_kes: settings.min_stake_kes, max_stake_kes: settings.max_stake_kes, buy_button_label: settings.buy_button_label, sell_button_label: settings.sell_button_label, market_status: settings.market_status, demo_starting_balance: settings.demo_starting_balance, show_demo_badge: settings.show_demo_badge })} />
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="deposits">
            <Card><CardContent className="pt-6 space-y-4">
              <Field settings={settings} sf={sf} k="min_deposit_kes" label="Minimum Deposit (KES)" type="number" />
              <Field settings={settings} sf={sf} k="max_deposit_kes" label="Maximum Deposit (KES)" type="number" />
              <div className="space-y-1.5">
                <Label>Deposit Fee Type</Label>
                <Select value={settings.deposit_fee_type} onValueChange={v => sf('deposit_fee_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="none">None</SelectItem><SelectItem value="percent">Percentage</SelectItem><SelectItem value="flat">Flat Amount</SelectItem></SelectContent>
                </Select>
              </div>
              {settings.deposit_fee_type !== 'none' && <Field settings={settings} sf={sf} k="deposit_fee_value" label="Fee Value" type="number" />}
              <Toggle settings={settings} sf={sf} k="auto_confirm_deposits" label="Auto-confirm deposits (vs manual review)" />
              <Separator />
              <p className="text-sm font-medium text-muted-foreground">M-Pesa STK Push (Daraja)</p>
              <Separator />
              <p className="text-sm font-medium text-muted-foreground">Welcome Bonus</p>
              <Toggle settings={settings} sf={sf} k="welcome_bonus_enabled" label="Enable welcome deposit bonus" />
              {settings.welcome_bonus_enabled && <>
                <div className="grid grid-cols-2 gap-4">
                  <Field settings={settings} sf={sf} k="welcome_bonus_percent" label="Bonus %" type="number" placeholder="30" />
                  <Field settings={settings} sf={sf} k="welcome_bonus_min_deposit_kes" label="Min Deposit (KES)" type="number" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field settings={settings} sf={sf} k="welcome_bonus_trades_required" label="Trades to Unlock" type="number" placeholder="10" />
                  <Field settings={settings} sf={sf} k="welcome_bonus_expiry_hours" label="Bonus Expiry (hours)" type="number" placeholder="4" />
                </div>
              </>}
              <Separator />
              <p className="text-sm font-medium text-muted-foreground">M-Pesa STK Push (Daraja)</p>
              <Field settings={settings} sf={sf} k="mpesa_paybill" label="Paybill / Till Number" />
              <Field settings={settings} sf={sf} k="mpesa_shortcode" label="Shortcode" />
              <Field settings={settings} sf={sf} k="mpesa_consumer_key" label="Consumer Key" />
              <Field settings={settings} sf={sf} k="mpesa_consumer_secret" label="Consumer Secret" />
              <Field settings={settings} sf={sf} k="mpesa_passkey" label="Passkey" />
              <SaveBtn saving={saving} onClick={async () => {
                // Universal: limits + M-Pesa
                await save({ min_deposit_kes: settings.min_deposit_kes, max_deposit_kes: settings.max_deposit_kes, deposit_fee_type: settings.deposit_fee_type, deposit_fee_value: settings.deposit_fee_value, auto_confirm_deposits: settings.auto_confirm_deposits, mpesa_paybill: settings.mpesa_paybill, mpesa_shortcode: settings.mpesa_shortcode, mpesa_consumer_key: settings.mpesa_consumer_key, mpesa_consumer_secret: settings.mpesa_consumer_secret, mpesa_passkey: settings.mpesa_passkey })
                // Per-site: welcome bonus config
                await save({ welcome_bonus_enabled: settings.welcome_bonus_enabled, welcome_bonus_percent: settings.welcome_bonus_percent, welcome_bonus_min_deposit_kes: settings.welcome_bonus_min_deposit_kes, welcome_bonus_trades_required: settings.welcome_bonus_trades_required, welcome_bonus_expiry_hours: settings.welcome_bonus_expiry_hours }, true)
              }} />
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="withdrawals">
            <Card><CardContent className="pt-6 space-y-4">
              <Field settings={settings} sf={sf} k="min_withdrawal_kes" label="Minimum Withdrawal (KES)" type="number" />
              <Field settings={settings} sf={sf} k="max_withdrawal_kes" label="Maximum Withdrawal (KES)" type="number" />
              <div className="space-y-1.5">
                <Label>Withdrawal Approval Mode</Label>
                <Select value={settings.withdrawal_approval_mode} onValueChange={v => sf('withdrawal_approval_mode', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto_all">Auto — all withdrawals</SelectItem>
                    <SelectItem value="auto_threshold">Auto — below threshold, manual above</SelectItem>
                    <SelectItem value="profit_based">Profit-based — auto within deposits, manual if profit</SelectItem>
                    <SelectItem value="manual_all">Manual — all withdrawals</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {settings.withdrawal_approval_mode === 'auto_threshold' && <Field settings={settings} sf={sf} k="auto_approve_withdrawal_threshold" label="Auto-approve Threshold (KES)" type="number" />}
              <Toggle settings={settings} sf={sf} k="allow_multiple_pending_withdrawals" label="Allow multiple pending withdrawals per user" />
              <Toggle settings={settings} sf={sf} k="withdrawal_paused" label="PAUSE all withdrawals (emergency toggle)" />
              <div className="space-y-1.5">
                <Label>Processing Message (shown to user)</Label>
                <Textarea rows={2} value={settings.withdrawal_processing_message} onChange={e => sf('withdrawal_processing_message', e.target.value)} className="resize-none" />
              </div>
              <Separator />
              <p className="text-sm font-medium text-muted-foreground">M-Pesa B2C (Daraja)</p>
              <Field settings={settings} sf={sf} k="mpesa_b2c_initiator_name" label="Initiator Name" />
              <Field settings={settings} sf={sf} k="mpesa_b2c_shortcode" label="B2C Shortcode" />
              <Field settings={settings} sf={sf} k="mpesa_b2c_security_credential" label="Security Credential" />
              <SaveBtn saving={saving} onClick={() => save({ min_withdrawal_kes: settings.min_withdrawal_kes, max_withdrawal_kes: settings.max_withdrawal_kes, withdrawal_approval_mode: settings.withdrawal_approval_mode, auto_approve_withdrawal_threshold: settings.auto_approve_withdrawal_threshold, allow_multiple_pending_withdrawals: settings.allow_multiple_pending_withdrawals, withdrawal_paused: settings.withdrawal_paused, withdrawal_processing_message: settings.withdrawal_processing_message, mpesa_b2c_initiator_name: settings.mpesa_b2c_initiator_name, mpesa_b2c_shortcode: settings.mpesa_b2c_shortcode, mpesa_b2c_security_credential: settings.mpesa_b2c_security_credential })} />
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
