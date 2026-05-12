import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') || ''
  const type = searchParams.get('type') || ''
  const status = searchParams.get('status') || ''
  const siteId = searchParams.get('site_id') || ''
  const page = parseInt(searchParams.get('page') || '1')
  const limit = 20
  const offset = (page - 1) * limit

  const db = createAdminClient()
  let query = db
    .from('users')
    .select('id, username, phone, balance_usd, affiliate_balance_usd, account_type, status, referral_code, created_at, last_login, site_id', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (search) query = query.or(`username.ilike.%${search}%,phone.ilike.%${search}%`)
  if (type) query = query.eq('account_type', type)
  if (status) query = query.eq('status', status)
  if (siteId) query = query.eq('site_id', siteId)

  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ users: data, total: count, page, limit })
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { username, phone, password, account_type = 'standard', balance_usd = 0 } = body

  if (!username || !phone || !password) {
    return NextResponse.json({ error: 'username, phone and password are required' }, { status: 400 })
  }

  const bcrypt = await import('bcryptjs')
  const password_hash = await bcrypt.hash(password, 10)

  const referral_code = Math.random().toString(36).substring(2, 8).toUpperCase()

  const db = createAdminClient()
  const { site_id } = body
  const { data, error } = await db
    .from('users')
    .insert({ username, phone, password_hash, account_type, balance_usd, referral_code, status: 'active', site_id: site_id || null })
    .select('id, username, phone, account_type, balance_usd, status, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ user: data })
}
