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
    const { username, phone, password, ref_code } = await req.json()

    if (!username || !phone || !password) {
      return NextResponse.json({ error: 'Username, phone, and password required' }, { status: 400 })
    }

    // Resolve referrer from ref_code (body) or ref_code cookie
    const cookieRefCode = req.cookies.get('ref_code')?.value
    const refCode = ref_code || cookieRefCode
    let referred_by: string | null = null

    if (refCode) {
      const { data: referrer } = await supabase
        .from('users')
        .select('id')
        .eq('referral_code', refCode.toUpperCase())
        .single()
      if (referrer) referred_by = referrer.id
    }

    const salt = await bcrypt.genSalt(10)
    const password_hash = await bcrypt.hash(password, salt)
    const siteId = getSiteId()

    const insertData: any = { username, phone, password_hash, balance_usd: 0, demo_balance: 0, site_id: siteId }
    if (referred_by) insertData.referred_by = referred_by

    const { data: user, error } = await supabase
      .from('users')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Phone number already registered on this site' }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const token = await signUserToken({ id: user.id, username: user.username, phone: user.phone })

    const res = NextResponse.json({ success: true, user })
    res.cookies.set(USER_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    })
    // Clear the referral cookie after successful registration
    res.cookies.set('ref_code', '', { maxAge: 0, path: '/' })
    return res
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
