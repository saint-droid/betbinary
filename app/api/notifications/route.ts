import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function GET() {
  const db = createAdminClient()
  const { data, error } = await db
    .from('platform_notifications')
    .select('id, title, body, icon')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ notifications: [] }, { headers: { 'Cache-Control': 's-maxage=120, stale-while-revalidate=600' } })
  return NextResponse.json({ notifications: data || [] }, { headers: { 'Cache-Control': 's-maxage=120, stale-while-revalidate=600' } })
}
