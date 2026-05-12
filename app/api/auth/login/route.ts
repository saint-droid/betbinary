import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'
import { signUserToken, USER_COOKIE } from '@/lib/user-auth'
import { getSiteId } from '@/lib/site'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { phone, password } = await req.json()

    if (!phone || !password) {
      return NextResponse.json({ error: 'Username/Phone and password required' }, { status: 400 })
    }

    const siteId = getSiteId()
    console.time('supabase_fetch')
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('site_id', siteId)
      .or(`username.eq.${phone},phone.eq.${phone}`)
      .single()
    console.timeEnd('supabase_fetch')

    if (error || !user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    if (user.status !== 'active') {
      return NextResponse.json({ error: 'Account suspended' }, { status: 403 })
    }

    // pgcrypto crypt uses standard bcrypt
    console.time('bcrypt_compare')
    const valid = await bcrypt.compare(password, user.password_hash)
    console.timeEnd('bcrypt_compare')

    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    console.time('supabase_update')
    await supabase.from('users').update({ last_login: new Date().toISOString() }).eq('id', user.id)
    console.timeEnd('supabase_update')

    console.time('sign_token')
    const token = await signUserToken({ id: user.id, username: user.username, phone: user.phone })
    console.timeEnd('sign_token')

    const res = NextResponse.json({ success: true, user })
    res.cookies.set(USER_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    })
    return res
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
