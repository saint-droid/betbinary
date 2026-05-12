import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase'

const KENYAN_NAMES = [
  'James Kamau','Faith Wanjiku','Brian Otieno','Grace Achieng','Kevin Mwangi',
  'Mercy Njeri','Samuel Odhiambo','Tabitha Wambui','Dennis Kipchoge','Lydia Auma',
  'Victor Mutua','Esther Nyambura','Patrick Omondi','Caroline Wangari','Felix Kimani',
  'Beatrice Adhiambo','George Njenga','Irene Chebet','Robert Ndung\'u','Angela Moraa',
  'Charles Owino','Purity Waweru','Michael Musyoki','Lilian Cherotich','Joseph Gacheru',
  'Winnie Anyango','Peter Kihara','Jacqueline Wafula','Daniel Korir','Elizabeth Muthoni',
  'Andrew Onyango','Priscilla Njoroge','Stephen Muriuki','Vivian Akinyi','Christopher Gitau',
  'Esther Chelangat','Edwin Ochieng','Dorothy Nzisa','Anthony Wekesa','Millicent Kemunto',
  'Harrison Mugo','Naomi Nakitare','Oscar Simiyu','Pauline Ogot','Emmanuel Kamande',
  'Hellen Atieno','Francis Kiprotich','Alice Wanjiru','Timothy Ochieng','Rose Wachira',
]

const COUNTRIES = ['KE','KE','KE','KE','KE','UG','TZ','NG','GH']

const BOT_BIOS = [
  'Algorithmic trader from Nairobi with 6+ years of scalping forex markets. Known for aggressive but calculated entries.',
  'Binary options specialist. Built a consistent edge trading news events and economic releases.',
  'Former stockbroker turned retail trader. Focuses on momentum and trend-following strategies.',
  'Self-taught trader from Mombasa. Mastered price action after 4 years of disciplined study.',
  'Risk-first approach — never risks more than 1% per trade. Slow and steady compound growth.',
  'High-frequency style trader who thrives on volatility. Loves non-farm payroll days.',
  'Started trading at 19. Now runs a private signals group with over 3,000 members.',
  'Combines technical analysis with sentiment data. Rarely loses more than two days in a row.',
  'Consistently in the top 5% of traders across regional platforms. Specialises in EUR/USD.',
  'University lecturer by day, full-time trader mindset. Patience and discipline define his edge.',
  'Built her trading career from a KSh 5,000 account. Now manages a personal fund.',
  'Relies on support/resistance and psychological price levels. Simple but highly effective.',
  'Trained under a professional prop firm. Brings institutional-grade discipline to retail trading.',
  'Swing trader with a 3–5 day hold strategy. Lets profits run and cuts losses fast.',
  'Options and binary veteran. Adapts quickly to changing market conditions.',
]

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function makeBotEntries(count: number, highestWin: number, durationHours: number, tournamentId: string) {
  const durationSecs = durationHours * 3600
  const shuffled = [...KENYAN_NAMES].sort(() => Math.random() - 0.5).slice(0, count)

  const entries = shuffled.map((name, i) => {
    // Target balance at tournament end: spread from highestWin down to ~30%
    const fraction = count === 1 ? 1 : 1 - (i / count) * 0.7
    const noise = 0.9 + Math.random() * 0.2
    const targetBalance = Math.round(highestWin * fraction * noise)
    const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

    // Stagger join times: first bot joins within first 5% of tournament,
    // last bot joins within first 60% so all bots are in by midpoint
    const joinFraction = (i / Math.max(count - 1, 1)) * 0.6 + Math.random() * 0.05
    const joinOffsetSecs = Math.round(joinFraction * durationSecs)

    // Exaggerated but plausible public profile stats
    const winRate = rand(72, 94)
    const totalTrades = rand(3200, 18500)
    const totalProfit = rand(Math.round(highestWin * 8), Math.round(highestWin * 40))
    const bestTrade = rand(Math.round(highestWin * 0.4), Math.round(highestWin * 2.5))
    const bio = BOT_BIOS[i % BOT_BIOS.length]

    return {
      tournament_id: tournamentId,
      trader_name: name,
      avatar_seed: initials,
      country_code: COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)],
      result_balance: targetBalance,
      prize_amount: 0,
      rank: i + 1,
      join_offset_secs: joinOffsetSecs,
      bot_total_trades: totalTrades,
      bot_win_rate: winRate,
      bot_total_profit: totalProfit,
      bot_best_trade: bestTrade,
      bot_bio: bio,
    }
  })

  entries.sort((a, b) => b.result_balance - a.result_balance)
  entries.forEach((e, i) => { e.rank = i + 1 })
  return entries
}

export async function GET(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const siteId = searchParams.get('site_id') || ''

  const db = createAdminClient()
  let q = db
    .from('tournaments')
    .select('*, tournament_entries(*)')
    .order('starts_at', { ascending: false })

  if (siteId) q = q.eq('site_id', siteId)

  const { data, error } = await q

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tournaments: data })
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const db = createAdminClient()

  const now = new Date()
  const startsAt = new Date(body.starts_at)
  const endsAt = new Date(body.ends_at)
  const status = now < startsAt ? 'upcoming' : now > endsAt ? 'ended' : 'active'

  if (body.id) {
    // Update existing tournament
    const { id, entries, dummy_count: _dc, bot_count: _bc, ...fields } = body
    const { error } = await db.from('tournaments').update({ ...fields, status }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (entries && Array.isArray(entries)) {
      await db.from('tournament_entries').delete().eq('tournament_id', id)
      if (entries.length > 0) {
        await db.from('tournament_entries').insert(entries.map((e: any) => ({ ...e, tournament_id: id })))
      }
    }
    return NextResponse.json({ success: true })
  }

  // Create new tournament — strip UI-only bot fields so insert never fails on missing columns
  const { entries, dummy_count, bot_count, bot_highest_win, bot_trade_count, ...fields } = body
  const { data, error } = await db
    .from('tournaments')
    .insert({ ...fields, status, site_id: fields.site_id || null })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Optionally persist bot config columns if they exist (migration may not have run yet)
  try {
    await db.from('tournaments').update({
      bot_highest_win: bot_highest_win || 20000,
      bot_trade_count: bot_trade_count || 10,
    }).eq('id', data.id)
  } catch { /* ignore if columns don't exist yet */ }

  const tournamentId = data.id
  const botCount = Number(bot_count || dummy_count) || 20
  const highestWin = Number(bot_highest_win) || 20000
  const durationHours = Number(fields.duration_hours) || 24

  // Auto-generate bots with staggered join times
  const botEntries = makeBotEntries(botCount, highestWin, durationHours, tournamentId)
  if (botEntries.length > 0) {
    await db.from('tournament_entries').insert(botEntries)
  }

  return NextResponse.json({ success: true, id: tournamentId })
}

export async function PATCH(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, bot_count, bot_highest_win } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const db = createAdminClient()
  const botCount = Number(bot_count) || 20
  const highestWin = Number(bot_highest_win) || 20000

  // Fetch tournament duration
  const { data: tourney } = await db.from('tournaments').select('duration_hours').eq('id', id).single()
  const durationHours = Number(tourney?.duration_hours) || 24

  // Delete existing bot entries only (keep real user entries)
  await db.from('tournament_entries').delete().eq('tournament_id', id).eq('is_real', false)

  const botEntries = makeBotEntries(botCount, highestWin, durationHours, id)
  if (botEntries.length > 0) {
    const { error } = await db.from('tournament_entries').insert(botEntries)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, generated: botEntries.length })
}

export async function DELETE(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const db = createAdminClient()

  const ids: string[] = Array.isArray(body.ids) ? body.ids : [body.id]
  const { error } = await db.from('tournaments').delete().in('id', ids)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
