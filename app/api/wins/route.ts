import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const db = createAdminClient()
  const siteId = process.env.NEXT_PUBLIC_SITE_ID || null

  let q = db
    .from('withdrawals')
    .select('amount, users!inner(username)')
    .eq('status', 'completed')
    .neq('phone', 'tournament')
    .order('created_at', { ascending: false })
    .limit(30)

  if (siteId) q = q.eq('site_id', siteId)

  const { data } = await q

  const wins = (data || []).map((w: any) => ({
    name: w.users?.username || 'User',
    amount: Math.round(Number(w.amount)),
  })).filter((w: any) => w.amount >= 100)

  return NextResponse.json({ wins })
}
