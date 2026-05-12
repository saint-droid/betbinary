import { NextRequest, NextResponse } from 'next/server'
import { clearDemoBias } from '@/lib/demo-bias'

export async function POST(req: NextRequest) {
  const { sessionId } = await req.json()
  if (sessionId) clearDemoBias(sessionId)
  return NextResponse.json({ ok: true })
}
