// @ts-nocheck
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { broadcastInsert } from '@/lib/chat-bus'

const supabase = createAdminClient()

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export async function POST() {
  const siteId = process.env.NEXT_PUBLIC_SITE_ID || null

  const [{ data: settings }, { data: names }] = await Promise.all([
    supabase
      .from('platform_settings')
      .select(
        'chat_simulation_enabled,chat_simulation_amount_min_kes,chat_simulation_amount_max_kes,' +
        'chat_simulation_message_template'
      )
      .eq('id', 1)
      .single(),
    supabase
      .from('simulation_name_pool')
      .select('name')
      .eq('is_active', true),
  ])

  if (!settings?.chat_simulation_enabled) return NextResponse.json({ skipped: true })

  const nameList = (names || []).map(n => n.name)
  if (nameList.length === 0) return NextResponse.json({ skipped: true, reason: 'no names' })

  const name = pickRandom(nameList)
  const minKes = Number(settings.chat_simulation_amount_min_kes ?? 500)
  const maxKes = Number(settings.chat_simulation_amount_max_kes ?? 15000)
  const amount = Math.round((Math.random() * (maxKes - minKes) + minKes) / 50) * 50

  const template = settings.chat_simulation_message_template ||
    'System: {name} has successfully withdrawn KES {amount}. Congratulations! ✅'

  const message = template
    .replace('{name}', name)
    .replace('{amount}', amount.toLocaleString())

  const { data, error } = await supabase
    .from('chat_messages')
    .insert({ username: 'System', message, type: 'system_simulated', site_id: siteId })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Broadcast to all SSE clients immediately
  broadcastInsert(data)

  return NextResponse.json({ success: true, message })
}
