import { SignJWT, jwtVerify } from 'jose'

const COOKIE = 'nova_user_token'

export interface UserPayload {
  id: string
  username: string
  phone: string
}

function secret() {
  return new TextEncoder().encode(process.env.ADMIN_JWT_SECRET || 'fallback_secret_for_dev')
}

export async function signUserToken(payload: UserPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .sign(secret())
}

export async function verifyUserToken(token: string): Promise<UserPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret())
    return payload as unknown as UserPayload
  } catch {
    return null
  }
}

export async function getUserSession(): Promise<UserPayload | null> {
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE)?.value
  if (!token) return null
  return verifyUserToken(token)
}

export const USER_COOKIE = COOKIE
