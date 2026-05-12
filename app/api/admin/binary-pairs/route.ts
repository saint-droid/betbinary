import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase'

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()
  const { data, error } = await db
    .from('binary_pairs')
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
    const { error } = await db.from('binary_pairs').update(fields).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    // Reload worker so symbol changes take effect immediately
    const { reloadPairs } = await import('@/lib/deriv-ws')
    reloadPairs().catch(() => {})
    return NextResponse.json({ success: true })
  }

  const { data: inserted, error } = await db
    .from('binary_pairs')
    .insert({
      symbol:       body.symbol,
      display_name: body.display_name,
      deriv_symbol: body.deriv_symbol,
      is_active:    body.is_active ?? true,
      sort_order:   body.sort_order ?? 0,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Reload the Deriv worker so it subscribes to the new symbol
  if (body.deriv_symbol) {
    const { reloadPairs } = await import('@/lib/deriv-ws')
    reloadPairs().catch(() => {})
  }

  return NextResponse.json({ success: true, id: inserted.id })
}

export async function DELETE(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const db = createAdminClient()
  const { error, count } = await db.from('binary_pairs').delete({ count: 'exact' }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (count === 0) return NextResponse.json({ error: 'Pair not found' }, { status: 404 })
  return NextResponse.json({ success: true })
}
