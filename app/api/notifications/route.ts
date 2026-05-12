import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function GET() {
  const db = createAdminClient()
  const { data, error } = await db
    .from('platform_notifications')
    .select('id, title, body, icon')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ notifications: [] })
  return NextResponse.json({ notifications: data || [] })
}
