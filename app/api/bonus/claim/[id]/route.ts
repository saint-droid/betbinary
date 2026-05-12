import { NextRequest, NextResponse } from 'next/server'
import { getUserSession } from '@/lib/user-auth'

// The bonus offers shown are structural (welcome bonus is auto-applied on deposit,
// referral is ongoing). There's no manual claim flow needed — return success.
export async function POST(req: NextRequest) {
  const session = await getUserSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  return NextResponse.json({ success: true, message: 'Bonus information noted.' })
}
