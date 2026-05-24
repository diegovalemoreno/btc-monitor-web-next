// ================================================================
// lib/dca-tactical/types.ts
// Canonical types for the DCA Tático / Capital Allocation Engine.
// ================================================================

export type DcaStrategyProfile = 'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE'

export type DcaMarketState = 'DEFENSIVE' | 'NEUTRAL' | 'FAVORABLE' | 'AGGRESSIVE'

export type DcaImpact =
  | 'STRONG_POSITIVE'
  | 'POSITIVE'
  | 'NEUTRAL'
  | 'NEGATIVE'
  | 'STRONG_NEGATIVE'

export interface DcaIndicatorSignal {
  name:        string
  group:       string
  score:       number
  summary:     string
  impact:      DcaImpact
  impactLabel: string
}

export interface DcaTacticalConfig {
  structuralDcaPct:      number              // % of monthly that's always structural DCA
  minReservePct:         number              // minimum % of tactical pool to always preserve
  usedThisMonth:         number              // BRL deployed manually this month
  strategyProfile:       DcaStrategyProfile
  monthlyAmountOverride: number | null       // for when no DcaPlan exists in DB
}

export const DEFAULT_TACTICAL_CONFIG: DcaTacticalConfig = {
  structuralDcaPct:      50,
  minReservePct:         10,
  usedThisMonth:         0,
  strategyProfile:       'BALANCED',
  monthlyAmountOverride: null,
}

export interface DcaScoreInput {
  opportunityScore:  number
  riskScore:         number
  convictionScore:   number
  euphoriaScore:     number
  capitulationScore: number
}

export interface DcaAllocation {
  monthlyContribution:        number
  structuralDcaAmount:        number
  tacticalContributionAmount: number
  tacticalReserveAmount:      number
  usedTacticalThisMonth:      number
  remainingTactical:          number
  score:                      number
  marketState:                DcaMarketState
  strategyProfile:            DcaStrategyProfile
}
