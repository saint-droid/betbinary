import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createAdminClient } from '@/lib/supabase'
import { signAdminToken, ADMIN_COOKIE } from '@/lib/admin-auth'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
  }

  const db = createAdminClient()
  const { data: admin, error } = await db
    .from('admins')
    .select('id, email, name, password_hash, is_active')
    .eq('email', email.toLowerCase().trim())
    .single()

  if (error || !admin) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  if (!admin.is_active) {
    return NextResponse.json({ error: 'Account disabled' }, { status: 403 })
  }

  const valid = await bcrypt.compare(password, admin.password_hash)
  if (!valid) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  await db.from('admins').update({ last_login: new Date().toISOString() }).eq('id', admin.id)

  const token = await signAdminToken({ id: admin.id, email: admin.email, name: admin.name })

  const res = NextResponse.json({ success: true, name: admin.name })
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8, // 8 hours
    path: '/',
  })
  return res
}
