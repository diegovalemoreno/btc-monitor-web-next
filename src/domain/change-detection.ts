// ================================================================
// domain/change-detection.ts
// Pure temporal comparison: current snapshot vs previous.
// Returns a DetectedChange only when something material happened.
// No DB calls, no side effects.
// ================================================================

import type { SnapshotScores } from './snapshot-scores'
import type { IndicatorGroup } from '@lib/shared/types/signal'

export type ChangeCategory =
  | 'EUPHORIA_WARNING'
  | 'RARE_EVENT'
  | 'REGIME_CHANGE'
  | 'OPPORTUNITY_IMPROVED'
  | 'OPPORTUNITY_WORSENED'

// Maps ChangeCategory to an existing AlertType for DB storage (no schema changes needed)
export const CHANGE_TO_ALERT_TYPE: Record<ChangeCategory, string> = {
  EUPHORIA_WARNING:     'EUPHORIA_WARNING',
  RARE_EVENT:           'CAPITULATION_SIGNAL',
  REGIME_CHANGE:        'REGIME_CHANGE',
  OPPORTUNITY_IMPROVED: 'AGGRESSIVE_OPPORTUNITY',
  OPPORTUNITY_WORSENED: 'HIGH_RISK',
}

// Lower rank = more favorable for accumulation
const REGIME_RANK: Record<string, number> = {
  CAPITULATION_ZONE:       0,
  TACTICAL_BUY_AGGRESSIVE: 1,
  TACTICAL_BUY_MODERATE:   2,
  TACTICAL_BUY_LIGHT:      3,
  NEUTRAL:                 4,
  RISK_OFF:                5,
  EXTREME_RISK:            6,
  OVERLEVERAGED_MARKET:    7,
  EUPHORIA_ZONE:           8,
}

const REGIME_LABEL: Record<string, string> = {
  CAPITULATION_ZONE:       'Capitulação',
  TACTICAL_BUY_AGGRESSIVE: 'Compra agressiva',
  TACTICAL_BUY_MODERATE:   'Compra moderada',
  TACTICAL_BUY_LIGHT:      'Compra leve',
  NEUTRAL:                 'Neutro',
  RISK_OFF:                'Risk-off',
  EXTREME_RISK:            'Risco extremo',
  OVERLEVERAGED_MARKET:    'Mercado alavancado',
  EUPHORIA_ZONE:           'Euforia',
}

export interface PreviousSnapshot {
  regime:            string
  opportunityScore:  number
  riskScore:         number
  euphoriaScore:     number
  capitulationScore: number
}

export interface DetectedChange {
  category:        ChangeCategory
  severity:        'HIGH' | 'CRITICAL'
  prevOpportunity: number
  currOpportunity: number
  prevRegime:      string
  currRegime:      string
  prevRegimeLabel: string
  currRegimeLabel: string
  drivers:         string[]
}

// Thresholds
const OPPORTUNITY_DELTA_MIN  = 10   // pts needed to trigger IMPROVED or WORSENED
const RARE_OPP_MIN           = 75
const RARE_RISK_MAX          = 25
const RARE_CAP_MIN           = 70
const EUPHORIA_MIN           = 80

function topIndicators(
  groups:    IndicatorGroup[],
  direction: 'positive' | 'negative',
  limit      = 3,
): string[] {
  return groups
    .flatMap(g => g.indicators)
    .filter(i => direction === 'positive' ? i.score > 2 : i.score < -2)
    .sort((a, b) =>
      direction === 'positive'
        ? b.score - a.score
        : a.score - b.score
    )
    .slice(0, limit)
    .map(i => i.name)
}

export function detectSignificantChange(
  curr:    SnapshotScores,
  prev:    PreviousSnapshot,
  regime:  string,
  groups:  IndicatorGroup[],
): DetectedChange | null {
  const delta         = curr.opportunityScore - prev.opportunityScore
  const regimeChanged = regime !== prev.regime
  const prevLabel     = REGIME_LABEL[prev.regime] ?? prev.regime
  const currLabel     = REGIME_LABEL[regime]       ?? regime

  // 1. EUPHORIA_WARNING — critical state regardless of delta
  if (curr.euphoriaScore >= EUPHORIA_MIN) {
    return {
      category:        'EUPHORIA_WARNING',
      severity:        'CRITICAL',
      prevOpportunity: prev.opportunityScore,
      currOpportunity: curr.opportunityScore,
      prevRegime:      prev.regime,
      currRegime:      regime,
      prevRegimeLabel: prevLabel,
      currRegimeLabel: currLabel,
      drivers:         topIndicators(groups, 'negative'),
    }
  }

  // 2. RARE_EVENT — multiple favorable signals simultaneously (historically rare)
  if (
    curr.opportunityScore  >= RARE_OPP_MIN &&
    curr.riskScore         <= RARE_RISK_MAX &&
    curr.capitulationScore >= RARE_CAP_MIN
  ) {
    return {
      category:        'RARE_EVENT',
      severity:        'HIGH',
      prevOpportunity: prev.opportunityScore,
      currOpportunity: curr.opportunityScore,
      prevRegime:      prev.regime,
      currRegime:      regime,
      prevRegimeLabel: prevLabel,
      currRegimeLabel: currLabel,
      drivers:         topIndicators(groups, 'positive'),
    }
  }

  // 3. REGIME_CHANGE — market regime transitioned
  if (regimeChanged) {
    const prevRank = REGIME_RANK[prev.regime] ?? 4
    const currRank = REGIME_RANK[regime]       ?? 4
    const improved = currRank < prevRank
    return {
      category:        'REGIME_CHANGE',
      severity:        'HIGH',
      prevOpportunity: prev.opportunityScore,
      currOpportunity: curr.opportunityScore,
      prevRegime:      prev.regime,
      currRegime:      regime,
      prevRegimeLabel: prevLabel,
      currRegimeLabel: currLabel,
      drivers:         topIndicators(groups, improved ? 'positive' : 'negative'),
    }
  }

  // 4. OPPORTUNITY_IMPROVED — meaningful score increase from meaningful level
  if (delta >= OPPORTUNITY_DELTA_MIN && curr.opportunityScore >= 50) {
    return {
      category:        'OPPORTUNITY_IMPROVED',
      severity:        'HIGH',
      prevOpportunity: prev.opportunityScore,
      currOpportunity: curr.opportunityScore,
      prevRegime:      prev.regime,
      currRegime:      regime,
      prevRegimeLabel: prevLabel,
      currRegimeLabel: currLabel,
      drivers:         topIndicators(groups, 'positive'),
    }
  }

  // 5. OPPORTUNITY_WORSENED — meaningful score drop from elevated level
  if (delta <= -OPPORTUNITY_DELTA_MIN && prev.opportunityScore >= 55) {
    return {
      category:        'OPPORTUNITY_WORSENED',
      severity:        'HIGH',
      prevOpportunity: prev.opportunityScore,
      currOpportunity: curr.opportunityScore,
      prevRegime:      prev.regime,
      currRegime:      regime,
      prevRegimeLabel: prevLabel,
      currRegimeLabel: currLabel,
      drivers:         topIndicators(groups, 'negative'),
    }
  }

  return null
}
