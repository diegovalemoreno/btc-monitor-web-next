import { NextResponse } from 'next/server'
import { getCurrentMarketData } from '@/services/market-data'
import { deriveSnapshotScores } from '@/domain/snapshot-scores'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { signal, snapshot, cached, stale } = await getCurrentMarketData()
    const scores = deriveSnapshotScores(signal)

    const headers: Record<string, string> = {
      'Cache-Control': 's-maxage=120, stale-while-revalidate=60',
      'X-Cache':       cached ? (stale ? 'STALE' : 'HIT') : 'MISS',
    }

    return NextResponse.json(
      {
        snapshotId:        snapshot?.id ?? null,
        generatedAt:       signal.generatedAt,
        btcPriceUsd:       signal.btcPrice,
        marketRegime:      signal.regime,
        riskScore:         scores.riskScore,
        opportunityScore:  scores.opportunityScore,
        convictionScore:   scores.convictionScore,
        euphoriaScore:     scores.euphoriaScore,
        capitulationScore: scores.capitulationScore,
        riskLevel:         signal.riskLevel,
        actionBias:        signal.actionBias,
        score:             signal.score,
        summary:           signal.reading,
        insights:          signal.insights,
        indicatorGroups:   signal.indicatorGroups,
        triggeredRules:    signal.triggeredRules,
        playbook:          signal.playbook,
        dimensionScores:   signal.dimensionScores,
      },
      { headers }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Signal engine error'
    console.error('[GET /api/market-snapshot/current]', message)
    return NextResponse.json({ error: message }, { status: 503 })
  }
}
