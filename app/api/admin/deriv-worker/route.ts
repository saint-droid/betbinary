import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { startWorker, stopWorker, reloadPairs, getWorkerStatus } from '@/lib/deriv-ws'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json(getWorkerStatus())
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { action } = await req.json()

  if (action === 'start') {
    await startWorker()
    return NextResponse.json({ ok: true, status: getWorkerStatus() })
  }
  if (action === 'stop') {
    await stopWorker()
    return NextResponse.json({ ok: true, status: getWorkerStatus() })
  }
  if (action === 'reload') {
    await reloadPairs()
    return NextResponse.json({ ok: true, status: getWorkerStatus() })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
