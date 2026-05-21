import { type NextRequest, NextResponse } from 'next/server'
import { validateCronSecret } from '@/lib/cron'
import { getCurrentMarketData } from '@/services/market-data'
import { generateDailySummary } from '@/services/dca'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startMs = Date.now()

  try {
    const { signal, snapshot } = await getCurrentMarketData()
    const result = await generateDailySummary(signal, snapshot?.id ?? null)

    console.log('[cron/daily-dca-summary]', {
      regime:     signal.regime,
      snapshotId: snapshot?.id,
      ...result,
      durationMs: Date.now() - startMs,
    })

    return NextResponse.json({
      ok:         true,
      regime:     signal.regime,
      snapshotId: snapshot?.id ?? null,
      ...result,
      durationMs: Date.now() - startMs,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[cron/daily-dca-summary] failed:', message)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
