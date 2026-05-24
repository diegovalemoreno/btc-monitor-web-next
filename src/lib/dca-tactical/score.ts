// ================================================================
// lib/dca-tactical/score.ts
// Pure, deterministic DCA Opportunity Score engine.
// Auditável: each weight is explicit and labeled.
// ================================================================

import type { DcaMarketState, DcaScoreInput, DcaImpact, DcaIndicatorSignal } from './types'
import type { IndicatorGroup } from '@lib/shared/types/signal'

// Weighted combination of existing market scores (all 0-100).
// Weights: opportunity 35% + safety 30% + conviction 20% + capitulation 10% + anti-euphoria 5%
export function calculateDcaOpportunityScore(input: DcaScoreInput): number {
  const { opportunityScore, riskScore, convictionScore, euphoriaScore, capitulationScore } = input
  const raw =
    opportunityScore   * 0.35 +
    (100 - riskScore)  * 0.30 +
    convictionScore    * 0.20 +
    capitulationScore  * 0.10 +
    (100 - euphoriaScore) * 0.05
  return Math.round(Math.min(100, Math.max(0, raw)))
}

export function classifyDcaMarketState(score: number): DcaMarketState {
  if (score <= 25) return 'DEFENSIVE'
  if (score <= 50) return 'NEUTRAL'
  if (score <= 75) return 'FAVORABLE'
  return 'AGGRESSIVE'
}

// Individual indicator score (-10..+10 from signal engine) → DCA impact direction
function impactOf(score: number): DcaImpact {
  if (score >= 6)  return 'STRONG_POSITIVE'
  if (score >= 2)  return 'POSITIVE'
  if (score > -2)  return 'NEUTRAL'
  if (score > -6)  return 'NEGATIVE'
  return 'STRONG_NEGATIVE'
}

const IMPACT_LABEL: Record<DcaImpact, string> = {
  STRONG_POSITIVE: 'Positivo forte',
  POSITIVE:        'Positivo',
  NEUTRAL:         'Neutro',
  NEGATIVE:        'Negativo',
  STRONG_NEGATIVE: 'Negativo forte',
}

export function buildIndicatorSignals(groups: IndicatorGroup[]): DcaIndicatorSignal[] {
  const out: DcaIndicatorSignal[] = []
  for (const group of groups) {
    for (const ind of group.indicators) {
      const impact = impactOf(ind.score)
      out.push({
        name:        ind.name,
        group:       group.label,
        score:       ind.score,
        summary:     ind.summary,
        impact,
        impactLabel: IMPACT_LABEL[impact],
      })
    }
  }
  // Sort by absolute impact magnitude descending
  return out.sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
}
