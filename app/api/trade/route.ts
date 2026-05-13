import { NextRequest, NextResponse } from 'next/server'
import { getUserSession } from '@/lib/user-auth'
import { createAdminClient } from '@/lib/supabase'

const supabase = createAdminClient()

export async function POST(req: NextRequest) {
  try {
    const session = await getUserSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { amount, direction, pairId } = await req.json()
    if (!amount || amount <= 0) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    if (direction !== 'buy' && direction !== 'sell') return NextResponse.json({ error: 'Invalid direction' }, { status: 400 })
    if (!pairId) return NextResponse.json({ error: 'pairId required' }, { status: 400 })

    const [
      { data: user },
      { data: settings },
      { data: override },
      { data: binaryPair },
    ] = await Promise.all([
      supabase.from('users').select('id, balance_usd, account_type, referred_by').eq('id', session.id).single(),
      supabase.from('platform_settings')
        .select('house_win_rate, house_win_rate_vip, house_win_rate_demo, payout_multiplier, payout_multiplier_vip, trade_duration_seconds, trade_ticks, per_user_override_enabled, conversion_rate, min_stake_usd, max_stake_usd, min_stake_kes, max_stake_kes, referral_enabled, referral_l1_percent, referral_l2_percent, referral_l3_percent')
        .eq('id', 1).single(),
      supabase.from('user_overrides').select('custom_win_rate, is_blocked_from_trading').eq('user_id', session.id).maybeSingle(),
      supabase.from('binary_pairs').select('id, deriv_symbol').eq('id', pairId).maybeSingle(),
    ])

    const pair = binaryPair

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    if (!settings) return NextResponse.json({ error: 'Settings not found' }, { status: 500 })
    if (!pair) return NextResponse.json({ error: 'Pair not found' }, { status: 404 })

    if (override?.is_blocked_from_trading) {
      return NextResponse.json({ error: 'Trading is currently restricted on your account' }, { status: 403 })
    }

    const stakeUsd = Number(amount)
    if (user.balance_usd < stakeUsd) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 })
    }

    // House edge: determine user win probability
    // Stored as decimal: 0.90 = house wins 90% = user wins 10%
    let houseEdge: number
    if (settings.per_user_override_enabled && override?.custom_win_rate != null) {
      houseEdge = Number(override.custom_win_rate)
    } else if (user.account_type === 'vip') {
      houseEdge = Number(settings.house_win_rate_vip)
    } else {
      houseEdge = Number(settings.house_win_rate)
    }
    const winRate = 1 - houseEdge
    // Outcome pre-determined at trade entry by house edge
    const isWin = Math.random() < winRate

    // Payout multiplier by account type
    const payoutMultiplier = user.account_type === 'vip'
      ? Number(settings.payout_multiplier_vip || 10)
      : Number(settings.payout_multiplier || 1.8)

    const tradeTicks = Number(settings.trade_ticks ?? 2)
    const duration = Number(settings.trade_duration_seconds || 10)

    const { data: latestEntry } = await supabase
      .from('price_feed').select('close').eq('pair_id', pairId)
      .order('time_open', { ascending: false }).limit(1).single()
    const entryPrice = Number(latestEntry?.close ?? 0)

    const conversionRate = Number(settings.conversion_rate || 129)

    const minUsd = Number(settings.min_stake_usd ?? 1)
    const maxUsd = Number(settings.max_stake_usd ?? 5000)
    if (stakeUsd < minUsd) return NextResponse.json({ error: `Minimum stake is $${minUsd.toLocaleString()}` }, { status: 400 })
    if (stakeUsd > maxUsd) return NextResponse.json({ error: `Maximum stake is $${maxUsd.toLocaleString()}` }, { status: 400 })

    const expiresAt = new Date(Date.now() + duration * 1000).toISOString()

    const { data: trade, error: insertErr } = await supabase
      .from('trades')
      .insert({
        user_id: user.id,
        pair_id: pairId,
        direction,
        amount_usd: stakeUsd,
        amount_kes: stakeUsd * conversionRate,
        entry_price: entryPrice,
        outcome: 'pending',
        is_demo: false,
        house_forced: !isWin,
        expires_at: expiresAt,
        ...(process.env.NEXT_PUBLIC_SITE_ID ? { site_id: process.env.NEXT_PUBLIC_SITE_ID } : {}),
      })
      .select()
      .single()

    if (insertErr || !trade) {
      return NextResponse.json({ error: insertErr?.message || 'Failed to create trade' }, { status: 500 })
    }

    // Debit stake immediately
    await supabase.rpc('fn_debit_balance', { p_user_id: user.id, p_amount: stakeUsd, p_is_demo: false })

    // Resolve after duration â€” outcome already decided
    setTimeout(async () => {
      const { data: latestCandle } = await supabase
        .from('price_feed').select('close').eq('pair_id', pairId)
        .order('time_open', { ascending: false }).limit(1).single()
      const exitPrice = Number(latestCandle?.close ?? entryPrice)

      const outcome = isWin ? 'win' : 'loss'
      // Win: stake Ã— multiplier (full profit). Loss: 0 returned.
      const payout = isWin ? stakeUsd * payoutMultiplier : 0

      await supabase.from('trades').update({
        outcome,
        exit_price: exitPrice,
        payout_usd: payout,
        house_forced: !isWin,
        resolved_at: new Date().toISOString(),
      }).eq('id', trade.id)

      if (payout > 0) {
        await supabase.rpc('fn_credit_balance', { p_user_id: user.id, p_amount: payout, p_is_demo: false })
      }

      // Bonus unlock logic
      const { data: freshUser } = await supabase
        .from('users')
        .select('bonus_balance_usd, bonus_trades_remaining, bonus_expires_at')
        .eq('id', user.id)
        .single()

      if (freshUser && Number(freshUser.bonus_balance_usd) > 0) {
        const bonusExpired = freshUser.bonus_expires_at && new Date(freshUser.bonus_expires_at) < new Date()
        if (bonusExpired) {
          await supabase.from('users').update({
            bonus_balance_usd: 0, bonus_trades_remaining: 0, bonus_expires_at: null,
          }).eq('id', user.id)
        } else {
          const remaining = Math.max(0, Number(freshUser.bonus_trades_remaining) - 1)
          if (remaining === 0) {
            await supabase.rpc('fn_credit_balance', {
              p_user_id: user.id, p_amount: Number(freshUser.bonus_balance_usd), p_is_demo: false,
            })
            await supabase.from('users').update({
              bonus_balance_usd: 0, bonus_trades_remaining: 0, bonus_expires_at: null,
            }).eq('id', user.id)
          } else {
            await supabase.from('users').update({ bonus_trades_remaining: remaining }).eq('id', user.id)
          }
        }
      }

      // Tournament profit tracking
      const convRate = Number(settings.conversion_rate || 129)
      const profitUsd = isWin ? payout - stakeUsd : -stakeUsd
      const profitKes = profitUsd * convRate
      if (profitKes !== 0) {
        const { data: participations } = await supabase
          .from('tournament_participants').select('id, profit_kes, tournament_id').eq('user_id', user.id)

        for (const p of participations || []) {
          const { data: tourney } = await supabase
            .from('tournaments').select('status, bot_highest_win').eq('id', p.tournament_id).single()
          if (tourney?.status !== 'active') continue

          const newProfit = Number(p.profit_kes) + profitKes
          await supabase.from('tournament_participants').update({ profit_kes: newProfit }).eq('id', p.id)

          const { data: topBot } = await supabase
            .from('tournament_entries')
            .select('id, result_balance')
            .eq('tournament_id', p.tournament_id)
            .eq('is_real', false)
            .order('result_balance', { ascending: false })
            .limit(1).single()

          if (topBot && newProfit >= Number(topBot.result_balance)) {
            const bump = 1.05 + Math.random() * 0.10
            await supabase.from('tournament_entries')
              .update({ result_balance: Math.round(newProfit * bump) }).eq('id', topBot.id)
          }

          await supabase.from('tournament_entries')
            .update({ result_balance: Math.max(0, newProfit) })
            .eq('tournament_id', p.tournament_id)
            .eq('user_id', user.id)
            .eq('is_real', true)
        }
      }

      // Referral commissions
      if (settings.referral_enabled && user.referred_by) {
        const l1Pct = Number(settings.referral_l1_percent || 0)
        const l2Pct = Number(settings.referral_l2_percent || 0)
        const l3Pct = Number(settings.referral_l3_percent || 0)

        if (l1Pct > 0) {
          await supabase.rpc('fn_credit_referral', {
            p_beneficiary_id: user.referred_by, p_from_user_id: user.id,
            p_trade_id: trade.id, p_level: 1, p_percent: l1Pct, p_trade_amount: stakeUsd,
          })
        }
        if (l2Pct > 0 || l3Pct > 0) {
          const { data: l1User } = await supabase.from('users').select('referred_by').eq('id', user.referred_by).single()
          if (l1User?.referred_by && l2Pct > 0) {
            await supabase.rpc('fn_credit_referral', {
              p_beneficiary_id: l1User.referred_by, p_from_user_id: user.id,
              p_trade_id: trade.id, p_level: 2, p_percent: l2Pct, p_trade_amount: stakeUsd,
            })
            if (l3Pct > 0) {
              const { data: l2User } = await supabase.from('users').select('referred_by').eq('id', l1User.referred_by).single()
              if (l2User?.referred_by) {
                await supabase.rpc('fn_credit_referral', {
                  p_beneficiary_id: l2User.referred_by, p_from_user_id: user.id,
                  p_trade_id: trade.id, p_level: 3, p_percent: l3Pct, p_trade_amount: stakeUsd,
                })
              }
            }
          }
        }
      }
    }, duration * 1000)

    return NextResponse.json({
      tradeId: trade.id,
      duration,
      tradeTicks,
      entryPrice,
      isWin,
      payoutMultiplier,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

