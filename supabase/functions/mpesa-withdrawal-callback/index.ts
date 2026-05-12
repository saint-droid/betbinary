import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async (req) => {
  const headers = { 'Content-Type': 'application/json' }
  const ok = new Response(JSON.stringify({ ResultCode: 0, ResultDesc: 'Accepted' }), { headers })

  try {
    const body = await req.json()
    const result = body?.Result
    if (!result) return ok

    const { ConversationID, ResultCode, ResultDesc, ResultParameters } = result

    const { data: withdrawal } = await supabase
      .from('withdrawals')
      .select('id, user_id, amount_usd, status')
      .eq('mpesa_transaction_id', ConversationID)
      .single()

    if (!withdrawal) return ok
    if (['completed', 'failed', 'rejected'].includes(withdrawal.status)) return ok

    if (ResultCode === 0) {
      const params: any[] = ResultParameters?.ResultParameter || []
      const mpesaRef = params.find((p: any) => p.Key === 'TransactionID')?.Value || ConversationID

      await supabase.from('withdrawals').update({
        status: 'completed',
        mpesa_transaction_id: mpesaRef,
      }).eq('id', withdrawal.id)
    } else {
      const { data: user } = await supabase.from('users').select('balance_usd').eq('id', withdrawal.user_id).single()
      await supabase.from('users')
        .update({ balance_usd: Number(user?.balance_usd ?? 0) + Number(withdrawal.amount_usd) })
        .eq('id', withdrawal.user_id)

      await supabase.from('withdrawals').update({
        status: 'cancelled',
        rejection_reason: `M-Pesa: ${ResultDesc}`,
      }).eq('id', withdrawal.id)
    }
  } catch {
    // always return 200 to Safaricom
  }

  return ok
})
