import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const supabase = createAdminClient()

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const stkCallback = body?.Body?.stkCallback
    if (!stkCallback) return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })

    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback

    // Find the deposit by checkout request ID
    const { data: deposit } = await supabase
      .from('deposits')
      .select('id, user_id, amount_usd, bonus_amount_usd, bonus_applied, status')
      .eq('mpesa_transaction_id', CheckoutRequestID)
      .single()

    if (!deposit) return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })

    // Ignore if already processed
    if (deposit.status === 'completed' || deposit.status === 'failed') {
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
    }

    if (ResultCode === 0) {
      // Payment successful — extract M-Pesa receipt
      const items: any[] = CallbackMetadata?.Item || []
      const mpesaRef = items.find((i: any) => i.Name === 'MpesaReceiptNumber')?.Value || null

      const totalCredit = Number(deposit.amount_usd) + Number(deposit.bonus_amount_usd || 0)

      // Credit balance
      const { data: user } = await supabase
        .from('users').select('balance_usd').eq('id', deposit.user_id).single()
      await supabase
        .from('users')
        .update({ balance_usd: Number(user?.balance_usd ?? 0) + totalCredit })
        .eq('id', deposit.user_id)

      // Mark deposit completed
      await supabase
        .from('deposits')
        .update({
          status: 'completed',
          mpesa_transaction_id: mpesaRef || CheckoutRequestID,
          completed_at: new Date().toISOString(),
        })
        .eq('id', deposit.id)
    } else {
      // Payment failed/cancelled
      await supabase
        .from('deposits')
        .update({ status: 'failed' })
        .eq('id', deposit.id)
    }

    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  } catch {
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  }
}
