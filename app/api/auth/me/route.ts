import { NextRequest, NextResponse } from 'next/server'
import { getUserSession } from '@/lib/user-auth'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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
