// ================================================================
// domain/dca-engine.ts
// Computes recommended and reserve amounts from a DCA plan + action.
//
// reserve_percentage = % of monthly to hold back for better moments.
// Multipliers deploy different fractions of base + reserve per action.
// ================================================================

import type { DcaPlanRow } from '@/lib/db/types'
import type { DcaAction } from '@/lib/db/types'

export interface DcaAmounts {
  recommendedAmountBrl: number
  reserveAmountBrl:     number
}

// How much of the base and reserve to deploy per action
const ACTION_DEPLOY: Record<DcaAction, { baseFraction: number; reserveFraction: number }> = {
  WAIT:           { baseFraction: 0,    reserveFraction: 0   },
  REDUCED_DCA:    { baseFraction: 0.5,  reserveFraction: 0   },
  NORMAL_DCA:     { baseFraction: 1.0,  reserveFraction: 0   },
  REINFORCED_DCA: { baseFraction: 1.0,  reserveFraction: 0.5 },
  AGGRESSIVE_DCA: { baseFraction: 1.0,  reserveFraction: 1.0 },
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function computeDcaAmounts(plan: DcaPlanRow, action: DcaAction): DcaAmounts {
  const { monthly_amount_brl, reserve_percentage } = plan
  const reserveFrac = Math.min(100, Math.max(0, reserve_percentage)) / 100

  const baseAmount    = monthly_amount_brl * (1 - reserveFrac)
  const reserveAmount = monthly_amount_brl * reserveFrac

  const { baseFraction, reserveFraction } = ACTION_DEPLOY[action]

  const deployed = baseAmount * baseFraction + reserveAmount * reserveFraction
  const remaining = monthly_amount_brl - deployed

  return {
    recommendedAmountBrl: round2(Math.max(0, deployed)),
    reserveAmountBrl:     round2(Math.max(0, remaining)),
  }
}
