import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { getUserSession } from '@/lib/user-auth'

const supabase = createAdminClient()

export async function GET(req: NextRequest) {
  const session = await getUserSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const depositId = new URL(req.url).searchParams.get('id')
  if (!depositId) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { data: deposit } = await supabase
    .from('deposits')
    .select('id, status, amount_kes, bonus_applied, bonus_amount_usd')
    .eq('id', depositId)
    .eq('user_id', session.id)
    .single()

  if (!deposit) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ status: deposit.status, deposit })
}
