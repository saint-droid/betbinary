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

    const { ConversationID } = result

    const { data: withdrawal } = await supabase
      .from('withdrawals')
      .select('id, user_id, amount_usd, status')
      .eq('mpesa_transaction_id', ConversationID)
      .single()

    if (!withdrawal || withdrawal.status !== 'processing') return ok

    const { data: user } = await supabase.from('users').select('balance_usd').eq('id', withdrawal.user_id).single()
    await supabase.from('users')
      .update({ balance_usd: Number(user?.balance_usd ?? 0) + Number(withdrawal.amount_usd) })
      .eq('id', withdrawal.user_id)

    await supabase.from('withdrawals').update({
      status: 'cancelled',
      rejection_reason: 'M-Pesa request timed out — refunded',
    }).eq('id', withdrawal.id)
  } catch {
    // always return 200 to Safaricom
  }

  return ok
})
