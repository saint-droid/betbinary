import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const supabase = createAdminClient()

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const result = body?.Result
    if (!result) return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })

    const { ConversationID, ResultCode, ResultDesc, ResultParameters } = result

    // Find withdrawal by ConversationID
    const { data: withdrawal } = await supabase
      .from('withdrawals')
      .select('id, user_id, amount_usd, status')
      .eq('mpesa_transaction_id', ConversationID)
      .single()

    if (!withdrawal) return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
    if (withdrawal.status === 'completed' || withdrawal.status === 'failed' || withdrawal.status === 'rejected') {
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
    }

    if (ResultCode === 0) {
      // B2C payment successful
      const params: any[] = ResultParameters?.ResultParameter || []
      const mpesaRef = params.find((p: any) => p.Key === 'TransactionID')?.Value || ConversationID

      await supabase.from('withdrawals').update({
        status: 'completed',
        mpesa_transaction_id: mpesaRef,
      }).eq('id', withdrawal.id)
    } else {
      // B2C payment failed — refund the user
      const { data: user } = await supabase.from('users').select('balance_usd').eq('id', withdrawal.user_id).single()
      await supabase.from('users')
        .update({ balance_usd: Number(user?.balance_usd ?? 0) + Number(withdrawal.amount_usd) })
        .eq('id', withdrawal.user_id)

      await supabase.from('withdrawals').update({
        status: 'cancelled',
        rejection_reason: `M-Pesa: ${ResultDesc}`,
      }).eq('id', withdrawal.id)
    }

    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  } catch {
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  }
}
