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
    const stkCallback = body?.Body?.stkCallback
    if (!stkCallback) return ok

    const { CheckoutRequestID, ResultCode, CallbackMetadata } = stkCallback

    const { data: deposit } = await supabase
      .from('deposits')
      .select('id, user_id, amount_usd, bonus_amount_usd, bonus_applied, status')
      .eq('mpesa_transaction_id', CheckoutRequestID)
      .single()

    if (!deposit) return ok
    if (deposit.status === 'completed' || deposit.status === 'failed') return ok

    if (ResultCode === 0) {
      const items: any[] = CallbackMetadata?.Item || []
      const mpesaRef = items.find((i: any) => i.Name === 'MpesaReceiptNumber')?.Value || null

      // Credit only the real deposit amount — bonus goes to bonus_balance separately
      const { data: user } = await supabase
        .from('users').select('balance_usd').eq('id', deposit.user_id).single()

      await supabase
        .from('users')
        .update({ balance_usd: Number(user?.balance_usd ?? 0) + Number(deposit.amount_usd) })
        .eq('id', deposit.user_id)

      // Apply bonus to separate wallet if eligible
      if (deposit.bonus_applied && Number(deposit.bonus_amount_usd) > 0) {
        const { data: settings } = await supabase
          .from('platform_settings')
          .select('welcome_bonus_trades_required,welcome_bonus_expiry_hours')
          .eq('id', 1)
          .single()

        const tradesRequired = Number(settings?.welcome_bonus_trades_required ?? 10)
        const expiryHours = Number(settings?.welcome_bonus_expiry_hours ?? 4)
        const expiresAt = new Date(Date.now() + expiryHours * 3600 * 1000).toISOString()

        await supabase.from('users').update({
          bonus_balance_usd: Number(deposit.bonus_amount_usd),
          bonus_trades_remaining: tradesRequired,
          bonus_expires_at: expiresAt,
        }).eq('id', deposit.user_id)
      }

      await supabase
        .from('deposits')
        .update({
          status: 'completed',
          mpesa_transaction_id: mpesaRef || CheckoutRequestID,
          completed_at: new Date().toISOString(),
        })
        .eq('id', deposit.id)
    } else {
      await supabase.from('deposits').update({ status: 'failed' }).eq('id', deposit.id)
    }
  } catch {
    // always return 200 to Safaricom
  }

  return ok
})
