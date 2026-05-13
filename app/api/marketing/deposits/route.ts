import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

const supabase = createAdminClient()

function getDateRange(period: string): { start: Date; end: Date } {
  const now = new Date()
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)

  switch (period) {
    case 'today':
      return { start: today, end: now }

    case 'yesterday': {
      const start = new Date(today)
      start.setDate(start.getDate() - 1)
      const end = new Date(today)
      end.setMilliseconds(-1)
      return { start, end }
    }

    case 'this_week': {
      const start = new Date(today)
      const day = start.getDay()
      const diff = day === 0 ? -6 : 1 - day
      start.setDate(start.getDate() + diff)
      return { start, end: now }
    }

    case 'last_week': {
      const start = new Date(today)
      const day = start.getDay()
      const diff = day === 0 ? -6 : 1 - day
      start.setDate(start.getDate() + diff - 7)
      const end = new Date(start)
      end.setDate(end.getDate() + 7)
      end.setMilliseconds(-1)
      return { start, end }
    }

    case 'this_month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      return { start, end: now }
    }

    case 'this_year': {
      const start = new Date(now.getFullYear(), 0, 1)
      return { start, end: now }
    }

    default:
      return { start: today, end: now }
  }
}

export async function GET(req: NextRequest) {
  const siteId = process.env.NEXT_PUBLIC_SITE_ID || null
  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period') || 'today'

  const { start, end } = getDateRange(period)

  // Fetch site settings: marketer_percentage + site_name
  let marketerPct = 30
  let siteName = 'Trading Platform'
  if (siteId) {
    const { data: siteData } = await supabase
      .from('site_settings')
      .select('marketer_percentage, site_name')
      .eq('site_id', siteId)
      .single()
    if (siteData?.marketer_percentage != null) marketerPct = siteData.marketer_percentage
    if (siteData?.site_name) siteName = siteData.site_name
  }

  let query = supabase
    .from('deposits')
    .select('amount_kes')
    .eq('status', 'completed')
    .neq('phone', 'MANUAL')
    .not('mpesa_transaction_id', 'is', null)
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString())

  if (siteId) query = query.eq('site_id', siteId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const actualTotal = (data || []).reduce((sum, d) => sum + (d.amount_kes || 0), 0)
  const displayTotal = Math.floor(actualTotal * (marketerPct / 100))
  // Marketer earns 50% of what they see displayed, which is marketerPct% of actual
  const commissionDisplayPct = 50
  const yourEarnings = Math.floor(displayTotal * (commissionDisplayPct / 100))

  return NextResponse.json({
    period,
    display_total_kes: displayTotal,
    your_earnings_kes: yourEarnings,
    commission_display_pct: commissionDisplayPct,
    count: (data || []).length,
    site_name: siteName,
  })
}

