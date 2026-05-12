import { SignJWT, jwtVerify } from 'jose'

const COOKIE = 'nova_admin_token'

export interface AdminPayload {
  id: string
  email: string
  name: string
}

function secret() {
  return new TextEncoder().encode(process.env.ADMIN_JWT_SECRET!)
}

export async function signAdminToken(payload: AdminPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('8h')
    .sign(secret())
}

export async function verifyAdminToken(token: string): Promise<AdminPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret())
    return payload as unknown as AdminPayload
  } catch {
    return null
  }
}

export async function getAdminSession(): Promise<AdminPayload | null> {
  // Dynamic import keeps next/headers out of the Edge middleware bundle
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE)?.value
  if (!token) return null
  return verifyAdminToken(token)
}

export const ADMIN_COOKIE = COOKIE
