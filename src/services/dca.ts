// ================================================================
// services/dca.ts
// DCA daily summary: generates per-user recommendations for all
// active DCA plans. Called by cron job (daily-dca-summary).
// Uses service role — bypasses RLS.
// ================================================================

import type { TacticalSignal } from '@lib/shared/types/signal'
import { getServiceClient } from '@/lib/supabase/service'
import { deriveSnapshotScores } from '@/domain/snapshot-scores'
import { determineDcaAction } from '@/domain/dca-rules'
import { computeDcaAmounts } from '@/domain/dca-engine'
import { insertDcaRecommendations } from '@/repositories/dca-recommendations'
import type { DcaPlanRow, InsertDcaRecommendation } from '@/lib/db/types'

export interface DailySummaryResult {
  processed: number
  skipped:   number
}

export async function generateDailySummary(
  signal:     TacticalSignal,
  snapshotId: string | null
): Promise<DailySummaryResult> {
  const client = getServiceClient()
  const scores = deriveSnapshotScores(signal)

  // All active DCA plans
  const { data: plans, error } = await client
    .from('dca_plans')
    .select('*')
    .eq('enabled', true)

  if (error || !plans?.length) return { processed: 0, skipped: 0 }

  const recommendations: InsertDcaRecommendation[] = []

  for (const plan of plans as DcaPlanRow[]) {
    const decision = determineDcaAction(scores, plan.risk_profile)
    const amounts  = computeDcaAmounts(plan, decision.action)

    recommendations.push({
      user_id:                plan.user_id,
      dca_plan_id:            plan.id,
      snapshot_id:            snapshotId,
      action:                 decision.action,
      recommended_amount_brl: amounts.recommendedAmountBrl,
      reserve_amount_brl:     amounts.reserveAmountBrl,
      confidence:             decision.confidence,
      rationale:              decision.rationale,
      context: {
        regime:            signal.regime,
        opportunityScore:  scores.opportunityScore,
        riskScore:         scores.riskScore,
        convictionScore:   scores.convictionScore,
        euphoriaScore:     scores.euphoriaScore,
        capitulationScore: scores.capitulationScore,
      },
    })
  }

  try {
    await insertDcaRecommendations(client, recommendations)
    return { processed: recommendations.length, skipped: 0 }
  } catch (err) {
    console.error('[dca] bulk insert failed:', (err as Error).message)
    return { processed: 0, skipped: recommendations.length }
  }
}

// On-demand recommendation for a single user (used by API route)
export async function getOrCreateDcaRecommendation(
  signal:     TacticalSignal,
  plan:       DcaPlanRow,
  snapshotId: string | null
): Promise<InsertDcaRecommendation & { action: string }> {
  const scores   = deriveSnapshotScores(signal)
  const decision = determineDcaAction(scores, plan.risk_profile)
  const amounts  = computeDcaAmounts(plan, decision.action)

  return {
    user_id:                plan.user_id,
    dca_plan_id:            plan.id,
    snapshot_id:            snapshotId,
    action:                 decision.action,
    recommended_amount_brl: amounts.recommendedAmountBrl,
    reserve_amount_brl:     amounts.reserveAmountBrl,
    confidence:             decision.confidence,
    rationale:              decision.rationale,
    context: {
      regime:            signal.regime,
      opportunityScore:  scores.opportunityScore,
      riskScore:         scores.riskScore,
      convictionScore:   scores.convictionScore,
      euphoriaScore:     scores.euphoriaScore,
      capitulationScore: scores.capitulationScore,
    },
  }
}
