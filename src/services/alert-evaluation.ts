// ================================================================
// services/alert-evaluation.ts
// Evaluates market state → creates alert_events for eligible users.
// Called by cron job (Etapa 6). Uses service role (bypasses RLS).
// ================================================================

import type { TacticalSignal } from '@lib/shared/types/signal'
import { getServiceClient } from '@/lib/supabase/service'
import { deriveSnapshotScores } from '@/domain/snapshot-scores'
import { evaluateAlertsForSignal, filterAlertsForSubscription } from '@/domain/alert-engine'
import type { AlertSubscriptionRow, AlertEventRow, InsertAlertEvent } from '@/lib/db/types'
import { dispatchBulkAlerts } from './notification'

const DEDUP_WINDOW_HOURS = 6

export interface AlertEvaluationResult {
  created: number
  skipped: number
  subscribers: number
}

export async function evaluateAndDispatchAlerts(
  signal: TacticalSignal,
  snapshotId: string | null
): Promise<AlertEvaluationResult> {
  const client = getServiceClient()

  // Previous regime for REGIME_CHANGE detection — skip current snapshot
  const { data: recentSnapshots } = await client
    .from('market_snapshots')
    .select('market_regime')
    .order('created_at', { ascending: false })
    .limit(2)

  const previousRegime = recentSnapshots?.[1]?.market_regime as string | undefined

  // Evaluate rules once — pure, regime-aware
  const triggered = evaluateAlertsForSignal(signal, previousRegime)
  if (!triggered.length) return { created: 0, skipped: 0, subscribers: 0 }

  // All active subscribers
  const { data: subscriptions, error: subError } = await client
    .from('alert_subscriptions')
    .select('*')
    .eq('enabled', true)

  if (subError || !subscriptions?.length) return { created: 0, skipped: 0, subscribers: 0 }

  const scores  = deriveSnapshotScores(signal)
  const cutoff  = new Date(Date.now() - DEDUP_WINDOW_HOURS * 3_600_000).toISOString()
  const context = {
    regime:            signal.regime,
    opportunityScore:  scores.opportunityScore,
    riskScore:         scores.riskScore,
    convictionScore:   scores.convictionScore,
    euphoriaScore:     scores.euphoriaScore,
    capitulationScore: scores.capitulationScore,
  }

  let created = 0
  let skipped = 0
  const insertedEvents: AlertEventRow[] = []

  for (const sub of subscriptions as AlertSubscriptionRow[]) {
    const eligible = filterAlertsForSubscription(triggered, sub)
    if (!eligible.length) continue

    // Per-user dedup: skip types already sent in the last 6h
    const { data: recent } = await client
      .from('alert_events')
      .select('type')
      .eq('user_id', sub.user_id)
      .gte('created_at', cutoff)

    const recentTypes = new Set((recent ?? []).map((r: { type: string }) => r.type))

    const toInsert: InsertAlertEvent[] = eligible
      .filter((a) => !recentTypes.has(a.type))
      .map((a) => ({
        user_id:     sub.user_id,
        snapshot_id: snapshotId,
        type:        a.type,
        severity:    a.severity,
        title:       a.title,
        message:     a.message,
        context,
      }))

    skipped += eligible.length - toInsert.length
    if (!toInsert.length) continue

    const { data: inserted, error } = await client
      .from('alert_events')
      .insert(toInsert)
      .select()

    if (error) {
      console.error('[alert-evaluation] insert failed:', error.message)
    } else {
      created += inserted.length
      insertedEvents.push(...(inserted as AlertEventRow[]))
    }
  }

  // Dispatch notifications — awaited so serverless function doesn't terminate early
  try {
    await dispatchBulkAlerts(insertedEvents, subscriptions as AlertSubscriptionRow[])
  } catch (err) {
    console.error('[alert-evaluation] notification dispatch error:', err)
  }

  return { created, skipped, subscribers: subscriptions.length }
}
