// ================================================================
// services/alert-evaluation.ts
// Detects significant market changes and notifies subscribers.
// Called by cron job. Uses service role (bypasses RLS).
// Sends ONE alert per cycle only when something material changed.
// ================================================================

import type { TacticalSignal } from '@lib/shared/types/signal'
import { getServiceClient } from '@/lib/supabase/service'
import { deriveSnapshotScores } from '@/domain/snapshot-scores'
import { detectSignificantChange, CHANGE_TO_ALERT_TYPE } from '@/domain/change-detection'
import type { DetectedChange } from '@/domain/change-detection'
import { determineDcaAction } from '@/domain/dca-rules'
import { computeDcaAmounts } from '@/domain/dca-engine'
import type { AlertSubscriptionRow, AlertEventRow, InsertAlertEvent, DcaPlanRow } from '@/lib/db/types'
import { dispatchBulkAlerts } from './notification'

const DEDUP_WINDOW_HOURS = 4  // same category won't re-fire within this window

const MARKET_LABEL: Record<string, string> = {
  AGGRESSIVE_DCA: 'Excepcional',
  REINFORCED_DCA: 'Favorável',
  NORMAL_DCA:     'Neutro',
  REDUCED_DCA:    'Cauteloso',
  WAIT:           'Em cautela',
}

const CONF_LABEL: Record<string, string> = {
  HIGH:   'Alta',
  MEDIUM: 'Média',
  LOW:    'Baixa',
}

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

  // Fetch the two most recent snapshots to compare current vs previous
  const { data: recentSnapshots } = await client
    .from('market_snapshots')
    .select('market_regime, opportunity_score, risk_score, euphoria_score, capitulation_score')
    .order('created_at', { ascending: false })
    .limit(2)

  const prevSnap = recentSnapshots?.[1]
  if (!prevSnap) return { created: 0, skipped: 0, subscribers: 0 }

  const curr = deriveSnapshotScores(signal)
  const prev = {
    regime:            prevSnap.market_regime as string,
    opportunityScore:  prevSnap.opportunity_score as number,
    riskScore:         prevSnap.risk_score as number,
    euphoriaScore:     (prevSnap.euphoria_score ?? 30) as number,
    capitulationScore: (prevSnap.capitulation_score ?? 25) as number,
  }

  // Detect whether anything material changed
  const change = detectSignificantChange(curr, prev, signal.regime, signal.indicatorGroups)
  if (!change) return { created: 0, skipped: 0, subscribers: 0 }

  const alertType = CHANGE_TO_ALERT_TYPE[change.category]

  // Fetch subscribers and active DCA plans in parallel
  const [{ data: subscriptions, error: subError }, { data: plans }] = await Promise.all([
    client.from('alert_subscriptions').select('*').eq('enabled', true),
    client.from('dca_plans')
      .select('user_id, monthly_amount_brl, reserve_percentage, risk_profile')
      .eq('enabled', true),
  ])

  if (subError || !subscriptions?.length) return { created: 0, skipped: 0, subscribers: 0 }

  const cutoff     = new Date(Date.now() - DEDUP_WINDOW_HOURS * 3_600_000).toISOString()
  const planByUser = new Map((plans ?? []).map(p => [p.user_id as string, p]))

  const baseContext = {
    regime:            signal.regime,
    opportunityScore:  curr.opportunityScore,
    riskScore:         curr.riskScore,
    convictionScore:   curr.convictionScore,
    euphoriaScore:     curr.euphoriaScore,
    capitulationScore: curr.capitulationScore,
    changeAlert:       {
      category:        change.category,
      prevOpportunity: change.prevOpportunity,
      currOpportunity: change.currOpportunity,
      prevRegimeLabel: change.prevRegimeLabel,
      currRegimeLabel: change.currRegimeLabel,
      drivers:         change.drivers,
    },
  }

  let created = 0
  let skipped = 0
  const eventsForDispatch: AlertEventRow[] = []

  for (const sub of subscriptions as AlertSubscriptionRow[]) {
    // Per-user dedup: skip if this alert type was already sent in the dedup window
    const { data: recent } = await client
      .from('alert_events')
      .select('type')
      .eq('user_id', sub.user_id)
      .gte('created_at', cutoff)

    const recentTypes = new Set((recent ?? []).map((r: { type: string }) => r.type))
    if (recentTypes.has(alertType)) { skipped++; continue }

    // Build DCA recommendation from user's active plan (if any)
    const plan = planByUser.get(sub.user_id) as DcaPlanRow | undefined
    let dcaRec = null
    if (plan) {
      const decision = determineDcaAction(curr, plan.risk_profile)
      const amounts  = computeDcaAmounts(plan, decision.action)
      dcaRec = {
        monthlyBrl:  plan.monthly_amount_brl,
        suggestBrl:  amounts.recommendedAmountBrl,
        reserveBrl:  amounts.reserveAmountBrl,
        marketLabel: MARKET_LABEL[decision.action] ?? 'Neutro',
        conviction:  CONF_LABEL[decision.confidence] ?? 'Média',
        rationale:   decision.rationale,
      }
    }

    const toInsert: InsertAlertEvent = {
      user_id:     sub.user_id,
      snapshot_id: snapshotId,
      type:        alertType as InsertAlertEvent['type'],
      severity:    change.severity,
      title:       change.currRegimeLabel,
      message:     `${change.category}: ${change.prevOpportunity} → ${change.currOpportunity}`,
      context:     { ...baseContext, dcaRec },
    }

    const { data: inserted, error } = await client
      .from('alert_events')
      .insert([toInsert])
      .select()

    if (error) {
      console.error('[alert-evaluation] insert failed:', error.message)
    } else {
      created++
      eventsForDispatch.push((inserted as AlertEventRow[])[0])
    }
  }

  try {
    await dispatchBulkAlerts(eventsForDispatch, subscriptions as AlertSubscriptionRow[])
  } catch (err) {
    console.error('[alert-evaluation] notification dispatch error:', err)
  }

  return { created, skipped, subscribers: subscriptions.length }
}
