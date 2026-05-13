import { NextRequest, NextResponse } from 'next/server'
import { getUserSession } from '@/lib/user-auth'
import { createAdminClient } from '@/lib/supabase'

const supabase = createAdminClient()

export async function GET(req: NextRequest) {
  try {
    const session = await getUserSession()
    if (!session) {
      return NextResponse.json({ user: null })
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.id)
      .single()

    if (error || !user) {
      return NextResponse.json({ user: null })
    }

    return NextResponse.json({ user })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
