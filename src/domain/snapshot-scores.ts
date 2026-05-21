import type { TacticalSignal } from '@lib/shared/types/signal'

export interface SnapshotScores {
  riskScore: number
  opportunityScore: number
  convictionScore: number
  euphoriaScore: number
  capitulationScore: number
}

// Regime → risk level (0-100: higher = more dangerous)
const REGIME_RISK: Record<string, number> = {
  CAPITULATION_ZONE:       15,
  TACTICAL_BUY_AGGRESSIVE: 20,
  TACTICAL_BUY_MODERATE:   30,
  TACTICAL_BUY_LIGHT:      40,
  NEUTRAL:                 50,
  RISK_OFF:                65,
  EXTREME_RISK:            85,
  OVERLEVERAGED_MARKET:    90,
  EUPHORIA_ZONE:           95,
}

// Regime → euphoria level (0-100)
const REGIME_EUPHORIA: Record<string, number> = {
  EUPHORIA_ZONE:           90,
  OVERLEVERAGED_MARKET:    75,
  EXTREME_RISK:            60,
  RISK_OFF:                45,
  NEUTRAL:                 30,
  TACTICAL_BUY_LIGHT:      20,
  TACTICAL_BUY_MODERATE:   15,
  TACTICAL_BUY_AGGRESSIVE: 10,
  CAPITULATION_ZONE:        5,
}

// Regime → capitulation level (0-100)
const REGIME_CAPITULATION: Record<string, number> = {
  CAPITULATION_ZONE:       85,
  TACTICAL_BUY_AGGRESSIVE: 70,
  TACTICAL_BUY_MODERATE:   50,
  TACTICAL_BUY_LIGHT:      35,
  NEUTRAL:                 25,
  RISK_OFF:                15,
  EXTREME_RISK:            10,
  OVERLEVERAGED_MARKET:    10,
  EUPHORIA_ZONE:            5,
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

// weighted score range: roughly -20..+20; classify() considers >= 12 "very interesting"
function opportunityFromWeighted(weighted: number): number {
  return clamp(Math.round((weighted + 20) / 40 * 100), 0, 100)
}

// onchain + trend combined range: roughly -20..+20
function convictionFromDimensions(onchain: number, trend: number): number {
  return clamp(Math.round((onchain + trend + 20) / 40 * 100), 0, 100)
}

export function deriveSnapshotScores(signal: TacticalSignal): SnapshotScores {
  const { regime, score, dimensionScores } = signal

  return {
    opportunityScore: opportunityFromWeighted(score.weighted),
    riskScore:        REGIME_RISK[regime]        ?? 50,
    euphoriaScore:    REGIME_EUPHORIA[regime]    ?? 30,
    capitulationScore: REGIME_CAPITULATION[regime] ?? 25,
    convictionScore:  convictionFromDimensions(
      dimensionScores.onchain ?? 0,
      dimensionScores.trend   ?? 0,
    ),
  }
}
