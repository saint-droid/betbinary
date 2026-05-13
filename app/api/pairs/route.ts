import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

const supabase = createAdminClient()

export async function GET() {
  const { data } = await supabase
    .from('binary_pairs')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  return NextResponse.json(
    { pairs: data || [] },
    { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=120' } }
  )
}
