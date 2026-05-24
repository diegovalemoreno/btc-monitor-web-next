// ================================================================
// lib/dca-tactical/allocation.ts
// Converts score + config + profile into BRL allocation amounts.
// Rule: risk always preserves capital; euphoria always brakes.
// ================================================================

import type { DcaAllocation, DcaMarketState, DcaStrategyProfile, DcaTacticalConfig } from './types'

// Profile multiplies the base tactical intensity.
// CONSERVATIVE deploys less per signal; AGGRESSIVE deploys more.
const PROFILE_MULT: Record<DcaStrategyProfile, number> = {
  CONSERVATIVE: 0.60,
  BALANCED:     1.00,
  AGGRESSIVE:   1.35,
}

// Market state drives base fraction of tactical pool to deploy now.
const STATE_INTENSITY: Record<DcaMarketState, number> = {
  DEFENSIVE:  0.00,
  NEUTRAL:    0.35,
  FAVORABLE:  0.65,
  AGGRESSIVE: 1.00,
}

const r2 = (n: number) => Math.round(n * 100) / 100

export function calculateDcaAllocation(
  monthlyContribution: number,
  config: DcaTacticalConfig,
  score: number,
  marketState: DcaMarketState,
): DcaAllocation {
  const { structuralDcaPct, minReservePct, usedThisMonth, strategyProfile } = config

  // Clamp fractions to sane bounds
  const structFrac = Math.min(0.90, Math.max(0.20, structuralDcaPct / 100))
  const minResFrac = Math.min(0.80, Math.max(0.00, minReservePct / 100))

  const structAmount = monthlyContribution * structFrac
  const tactPool     = monthlyContribution - structAmount

  // Tactical deployment: base intensity × profile multiplier, capped by min reserve
  const rawDeploy  = STATE_INTENSITY[marketState] * PROFILE_MULT[strategyProfile]
  const maxDeploy  = 1.0 - minResFrac
  const deployFrac = Math.min(maxDeploy, rawDeploy)

  const remaining   = Math.max(0, tactPool - usedThisMonth)

  // Cap suggested tactical amount by what's actually left in the pool this month.
  // If the user already deployed R$400 and the pool is R$500, suggest at most R$100.
  const tactNow     = Math.min(tactPool * deployFrac, remaining)
  const tactReserve = tactPool - tactNow - usedThisMonth

  return {
    monthlyContribution:        r2(monthlyContribution),
    structuralDcaAmount:        r2(structAmount),
    tacticalContributionAmount: r2(tactNow),
    tacticalReserveAmount:      r2(Math.max(0, tactReserve)),
    usedTacticalThisMonth:      r2(usedThisMonth),
    remainingTactical:          r2(remaining),
    score,
    marketState,
    strategyProfile,
  }
}
