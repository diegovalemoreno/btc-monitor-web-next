import { runSignalEngine } from '@lib/signal-engine/pipeline'
import { insertSnapshot, getLatestSnapshot } from '@/repositories/market-snapshots'
import { getServiceClient } from '@/lib/supabase/service'
import { deriveSnapshotScores } from '@/domain/snapshot-scores'
import { buildScoreExplanation } from '@lib/domain/score-explanation'
import type { TacticalSignal } from '@lib/shared/types/signal'
import type { MarketSnapshotRow } from '@/lib/db/types'

const CACHE_TTL_MS  = 120_000  // 2 min — same as legacy handler
const PIPELINE_TIMEOUT_MS = 9_000

interface CacheEntry {
  signal:   TacticalSignal
  snapshot: MarketSnapshotRow | null
  ts:       number
}

let cache: CacheEntry | null = null

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Pipeline timeout após ${ms}ms`)), ms)
    ),
  ])
}

export async function getCurrentMarketData(): Promise<{
  signal:   TacticalSignal
  snapshot: MarketSnapshotRow | null
  cached:   boolean
  stale:    boolean
}> {
  const now = Date.now()

  if (cache && now - cache.ts < CACHE_TTL_MS) {
    return { signal: cache.signal, snapshot: cache.snapshot, cached: true, stale: false }
  }

  try {
    const signal = await withTimeout(runSignalEngine(), PIPELINE_TIMEOUT_MS)
    const scores = deriveSnapshotScores(signal)

    // Fetch previous score for EMA smoothing (non-blocking)
    let previousScore: number | null = null
    try {
      const prevSnapshot = await getLatestSnapshot(getServiceClient())
      previousScore = prevSnapshot?.opportunity_score ?? null
    } catch {
      // proceed without smoothing
    }

    // Rebuild explanation with smoothing applied
    const explanation = buildScoreExplanation({
      indicators:    signal.indicators,
      previousScore,
    })

    // Attach smoothed explanation to signal
    const signalWithExplanation: TacticalSignal = { ...signal, explanation }

    // Persist to DB — non-blocking, fails silently
    let snapshot: MarketSnapshotRow | null = null
    try {
      snapshot = await insertSnapshot(getServiceClient(), {
        btc_price_usd:      signal.btcPrice,
        market_regime:      signal.regime,
        risk_score:         scores.riskScore,
        opportunity_score:  explanation.smoothedScore,
        euphoria_score:     scores.euphoriaScore,
        capitulation_score: scores.capitulationScore,
        conviction_score:   scores.convictionScore,
        summary:            signal.reading,
        indicators:         signal.indicatorGroups as unknown as Record<string, unknown>,
      })
    } catch (dbErr) {
      console.warn('[market-data] DB persist skipped:', (dbErr as Error).message)
    }

    cache = { signal: signalWithExplanation, snapshot, ts: Date.now() }
    return { signal: signalWithExplanation, snapshot, cached: false, stale: false }

  } catch (err) {
    if (cache) {
      return { signal: cache.signal, snapshot: cache.snapshot, cached: true, stale: true }
    }
    throw err
  }
}
