import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { getUserSession } from '@/lib/user-auth'
import { broadcastInsert } from '@/lib/chat-bus'

export const dynamic = 'force-dynamic'

async function awardEndedTournaments(db: ReturnType<typeof createAdminClient>) {
  const siteId = process.env.NEXT_PUBLIC_SITE_ID || null
  let endedQ = db
    .from('tournaments')
    .select('id, name, prize_fund, tournament_entries(*)')
    .eq('status', 'ended')
    .eq('is_active', true)
  if (siteId) endedQ = endedQ.eq('site_id', siteId)
  const { data: ended } = await endedQ

  for (const t of ended || []) {
    const entries: any[] = t.tournament_entries || []
    if (entries.length === 0) continue

    // Only bot entries are eligible for the prize
    const botEntries = entries.filter((e: any) => !e.is_real)
    if (botEntries.length === 0) continue

    const sorted = [...botEntries].sort((a, b) => Number(b.result_balance) - Number(a.result_balance))
    const alreadyAwarded = Number(sorted[0]?.prize_amount) > 0
    if (alreadyAwarded) continue

    const prizeFund = Number(t.prize_fund) || 0
    if (prizeFund === 0) continue

    const prizeMap: Record<number, number> = {
      0: Math.round(prizeFund * 0.5 * 100) / 100,
      1: Math.round(prizeFund * 0.3 * 100) / 100,
      2: Math.round(prizeFund * 0.2 * 100) / 100,
    }

    for (let i = 0; i < Math.min(sorted.length, 3); i++) {
      await db.from('tournament_entries').update({
        rank: i + 1,
        prize_amount: prizeMap[i],
      }).eq('id', sorted[i].id)
    }

    const winner = sorted[0]
    const announcements = [
      `🏆 Tournament "${t.name}" has ended! Congratulations to ${winner.trader_name} who wins KSh ${prizeMap[0].toLocaleString()}! 🎉`,
      ...(sorted[1] ? [`🥈 2nd place: ${sorted[1].trader_name} — KSh ${prizeMap[1].toLocaleString()}`] : []),
      ...(sorted[2] ? [`🥉 3rd place: ${sorted[2].trader_name} — KSh ${prizeMap[2].toLocaleString()}`] : []),
    ]

    for (const message of announcements) {
      const { data: chatMsg } = await db
        .from('chat_messages')
        .insert({ username: '🏆 Tournament', message, type: 'system_real', site_id: siteId })
        .select().single()
      if (chatMsg) broadcastInsert(chatMsg)
    }
  }
}

export async function GET() {
  const db = createAdminClient()
  const now = new Date().toISOString()

  // Status transitions
  await db.from('tournaments').update({ status: 'active' })
    .eq('is_active', true).lte('starts_at', now).gte('ends_at', now).eq('status', 'upcoming')
  await db.from('tournaments').update({ status: 'ended' })
    .eq('is_active', true).lt('ends_at', now).neq('status', 'ended')

  await awardEndedTournaments(db)

  const recentlyCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const siteId = process.env.NEXT_PUBLIC_SITE_ID || null

  let q = db
    .from('tournaments')
    .select(`*, tournament_entries(*)`)
    .eq('is_active', true)
    .or(`status.in.(active,upcoming),and(status.eq.ended,ends_at.gte.${recentlyCutoff})`)
    .order('sort_order', { ascending: true })
    .order('starts_at', { ascending: true })

  if (siteId) q = q.eq('site_id', siteId)

  const { data, error } = await q

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const session = await getUserSession()
  let joinedSet = new Set<string>()

  if (session) {
    const { data: participations } = await db
      .from('tournament_participants')
      .select('tournament_id')
      .eq('user_id', session.id)
    for (const p of participations || []) joinedSet.add(p.tournament_id)
  }

  const nowMs = Date.now()

  const tournaments = (data || []).map((t: any) => {
    const joined = session ? joinedSet.has(t.id) : false
    const allEntries: any[] = (t.tournament_entries || [])

    const startsAt = new Date(t.starts_at).getTime()
    const endsAt = new Date(t.ends_at).getTime()
    const durationSecs = (endsAt - startsAt) / 1000
    const elapsedSecs = Math.max(0, (nowMs - startsAt) / 1000)

    // For each bot entry: only show if its join_offset_secs has elapsed,
    // and compute live balance as linear progression toward target
    const visibleEntries = allEntries
      .map((e: any) => {
        if (e.is_real) {
          // Real users: always visible once joined, mark current user
          if (session && e.user_id === session.id) return { ...e, id: 'you' }
          return e
        }

        // Bot: only appear after their join offset has elapsed
        const joinOffset = Number(e.join_offset_secs) || 0
        if (t.status === 'active' && elapsedSecs < joinOffset) return null

        // Compute live balance: grows from 0 toward target over remaining time after joining
        const targetBalance = Number(e.result_balance)
        if (t.status === 'ended') return { ...e, result_balance: targetBalance }

        const activeForSecs = Math.max(0, elapsedSecs - joinOffset)
        const botDurationSecs = Math.max(1, durationSecs - joinOffset)
        const progress = Math.min(1, activeForSecs / botDurationSecs)

        // Non-linear growth: slow start, faster middle, slow near end (ease in-out)
        const eased = progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2

        // Add small noise (±3%) so it doesn't look perfectly smooth
        const noise = 1 + (Math.sin(joinOffset + elapsedSecs * 0.01) * 0.03)
        const liveBalance = Math.round(targetBalance * eased * noise)

        return { ...e, result_balance: liveBalance }
      })
      .filter(Boolean)

    // Sort by live balance desc, assign ranks
    visibleEntries.sort((a: any, b: any) => Number(b.result_balance) - Number(a.result_balance))
    visibleEntries.forEach((e: any, i: number) => { e.rank = i + 1 })

    return {
      ...t,
      joined,
      participant_count: visibleEntries.length,
      tournament_entries: visibleEntries,
    }
  })

  return NextResponse.json(
    { tournaments, isLoggedIn: !!session },
    { headers: { 'Cache-Control': 's-maxage=10, stale-while-revalidate=60' } }
  )
}
