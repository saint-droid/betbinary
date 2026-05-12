import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminToken, ADMIN_COOKIE } from '@/lib/admin-auth'

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const token = req.cookies.get(ADMIN_COOKIE)?.value

  if (pathname.startsWith('/admin')) {
    const payload = token ? await verifyAdminToken(token) : null
    if (!payload) {
      return NextResponse.redirect(new URL('/admin-login', req.url))
    }
  }

  if (pathname.startsWith('/api/admin') && !pathname.startsWith('/api/admin/auth')) {
    const payload = token ? await verifyAdminToken(token) : null
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
