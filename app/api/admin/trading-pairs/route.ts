import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase'
import { generateAndPersist } from '@/lib/candle-gen'

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()
  const { data, error } = await db
    .from('trading_pairs')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ pairs: data })
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const db = createAdminClient()

  if (body.id) {
    const { id, ...fields } = body
    const { error } = await db.from('trading_pairs').update(fields).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  // Create new pair and immediately generate 6h of candle data for it
  const { data: inserted, error } = await db
    .from('trading_pairs')
    .insert(body)
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Generate candles in background (don't await — respond fast)
  const { data: settings } = await db
    .from('platform_settings')
    .select('candle_duration_seconds')
    .eq('id', 1)
    .single()
  const candleDuration = settings?.candle_duration_seconds ?? 60
  const count = Math.ceil((6 * 60 * 60) / candleDuration)
  generateAndPersist(inserted.id, count).catch(() => {})

  return NextResponse.json({ success: true, id: inserted.id })
}

export async function DELETE(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const db = createAdminClient()

  // Delete dependent rows first (trades FK has no CASCADE)
  await db.from('trades').delete().eq('pair_id', id)

  const { error, count } = await db.from('trading_pairs').delete({ count: 'exact' }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (count === 0) return NextResponse.json({ error: 'Pair not found or already deleted' }, { status: 404 })
  return NextResponse.json({ success: true })
}
