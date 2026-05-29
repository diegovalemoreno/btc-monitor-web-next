// ================================================================
// services/alert-evaluation.ts
// Evaluates market state → creates alert_events for eligible users.
// Called by cron job (Etapa 6). Uses service role (bypasses RLS).
// ================================================================

import type { TacticalSignal } from '@lib/shared/types/signal'
import { getServiceClient } from '@/lib/supabase/service'
import { deriveSnapshotScores } from '@/domain/snapshot-scores'
import { evaluateAlertsForSignal, filterAlertsForSubscription, meetsMinSeverity } from '@/domain/alert-engine'
import { determineDcaAction } from '@/domain/dca-rules'
import { computeDcaAmounts } from '@/domain/dca-engine'
import type { AlertSubscriptionRow, AlertEventRow, InsertAlertEvent, DcaPlanRow } from '@/lib/db/types'
import { dispatchBulkAlerts } from './notification'

const DEDUP_WINDOW_HOURS    = 2
const DISPATCH_MIN_SEVERITY = 'HIGH' // Below HIGH: save to DB history only, no Telegram

const SEVERITY_ORDER = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const

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

  // Fetch subscriptions and active DCA plans in parallel
  const [{ data: subscriptions, error: subError }, { data: plans }] = await Promise.all([
    client.from('alert_subscriptions').select('*').eq('enabled', true),
    client.from('dca_plans')
      .select('user_id, monthly_amount_brl, reserve_percentage, risk_profile')
      .eq('enabled', true),
  ])

  if (subError || !subscriptions?.length) return { created: 0, skipped: 0, subscribers: 0 }

  const scores     = deriveSnapshotScores(signal)
  const cutoff     = new Date(Date.now() - DEDUP_WINDOW_HOURS * 3_600_000).toISOString()
  const planByUser = new Map((plans ?? []).map(p => [p.user_id as string, p as unknown as import('@/lib/db/types').DcaPlanRow]))

  const baseContext = {
    regime:            signal.regime,
    opportunityScore:  scores.opportunityScore,
    riskScore:         scores.riskScore,
    convictionScore:   scores.convictionScore,
    euphoriaScore:     scores.euphoriaScore,
    capitulationScore: scores.capitulationScore,
  }

  let created = 0
  let skipped = 0
  const eventsForDispatch: AlertEventRow[] = []

  for (const sub of subscriptions as AlertSubscriptionRow[]) {
    const eligible = filterAlertsForSubscription(triggered, sub)
    if (!eligible.length) continue

    // Per-user dedup: skip types already sent in the dedup window
    const { data: recent } = await client
      .from('alert_events')
      .select('type')
      .eq('user_id', sub.user_id)
      .gte('created_at', cutoff)

    const recentTypes = new Set((recent ?? []).map((r: { type: string }) => r.type))
    const unsent      = eligible.filter(a => !recentTypes.has(a.type))

    if (!unsent.length) { skipped += eligible.length; continue }

    // Consolidate: pick the single highest-severity alert
    const best = unsent.reduce((acc, a) =>
      SEVERITY_ORDER.indexOf(a.severity as typeof SEVERITY_ORDER[number]) >
      SEVERITY_ORDER.indexOf(acc.severity as typeof SEVERITY_ORDER[number]) ? a : acc
    )

    skipped += eligible.length - 1

    // Build DCA recommendation from user's active plan (if any)
    const plan = planByUser.get(sub.user_id) as DcaPlanRow | undefined
    let dcaRec = null
    if (plan) {
      const decision = determineDcaAction(scores, plan.risk_profile)
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
      type:        best.type,
      severity:    best.severity,
      title:       best.title,
      message:     best.message,
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
      const event = (inserted as AlertEventRow[])[0]
      // Only dispatch HIGH+ via Telegram — LOW/MEDIUM saved as DB history only
      if (meetsMinSeverity(best.severity, DISPATCH_MIN_SEVERITY)) {
        eventsForDispatch.push(event)
      }
    }
  }

  // Dispatch notifications — awaited so serverless function doesn't terminate early
  try {
    await dispatchBulkAlerts(eventsForDispatch, subscriptions as AlertSubscriptionRow[])
  } catch (err) {
    console.error('[alert-evaluation] notification dispatch error:', err)
  }

  return { created, skipped, subscribers: subscriptions.length }
}
