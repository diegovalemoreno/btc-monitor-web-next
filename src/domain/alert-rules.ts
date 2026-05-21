// ================================================================
// domain/alert-rules.ts
// Pure, testable rule functions. No side effects, no DB calls.
// ================================================================

import type { SnapshotScores } from './snapshot-scores'
import type { MarketRegime } from '@lib/shared/types/signal'
import type { AlertType, Severity, RiskProfile } from '@/lib/db/types'

export interface EvaluatedAlert {
  type:       AlertType
  severity:   Severity
  title:      string
  message:    string
  minProfile: RiskProfile  // CONSERVATIVE < MODERATE < AGGRESSIVE
}

type RuleEvaluator = (
  scores:         SnapshotScores,
  regime:         MarketRegime,
  previousRegime: string | undefined
) => EvaluatedAlert | null

// ── AGGRESSIVE_OPPORTUNITY ────────────────────────────────────
// spec: opportunityScore >= 75 && riskScore <= 55 && convictionScore >= 60

export const evalAggressiveOpportunity: RuleEvaluator = (scores) => {
  if (scores.opportunityScore >= 75 && scores.riskScore <= 55 && scores.convictionScore >= 60) {
    return {
      type:       'AGGRESSIVE_OPPORTUNITY',
      severity:   'HIGH',
      title:      'Oportunidade agressiva detectada',
      message:    `Score de oportunidade ${scores.opportunityScore}/100 com risco controlado (${scores.riskScore}/100). Convicção on-chain: ${scores.convictionScore}/100.`,
      minProfile: 'MODERATE',
    }
  }
  return null
}

// ── TACTICAL_OPPORTUNITY ─────────────────────────────────────

export const evalTacticalOpportunity: RuleEvaluator = (scores) => {
  if (
    scores.opportunityScore >= 55 &&
    scores.opportunityScore < 75 &&
    scores.riskScore < 65
  ) {
    return {
      type:       'TACTICAL_OPPORTUNITY',
      severity:   'MEDIUM',
      title:      'Janela tática identificada',
      message:    `Score de oportunidade ${scores.opportunityScore}/100. Contexto favorável para aportes táticos.`,
      minProfile: 'AGGRESSIVE',
    }
  }
  return null
}

// ── HIGH_RISK ─────────────────────────────────────────────────
// spec: riskScore >= 75 && euphoriaScore >= 60

export const evalHighRisk: RuleEvaluator = (scores) => {
  if (scores.riskScore >= 75 && scores.euphoriaScore >= 60) {
    return {
      type:       'HIGH_RISK',
      severity:   'HIGH',
      title:      'Risco elevado — cautela recomendada',
      message:    `Risco ${scores.riskScore}/100, euforia ${scores.euphoriaScore}/100. Considere reduzir exposição.`,
      minProfile: 'CONSERVATIVE',
    }
  }
  return null
}

// ── EUPHORIA_WARNING ──────────────────────────────────────────

export const evalEuphoriaWarning: RuleEvaluator = (scores, regime) => {
  if (scores.euphoriaScore >= 80 || regime === 'EUPHORIA_ZONE') {
    return {
      type:       'EUPHORIA_WARNING',
      severity:   'CRITICAL',
      title:      'Zona de euforia — risco de topo',
      message:    `Euforia ${scores.euphoriaScore}/100. Regime: ${regime}. Zona historicamente perigosa para novas compras.`,
      minProfile: 'CONSERVATIVE',
    }
  }
  return null
}

// ── CAPITULATION_SIGNAL ───────────────────────────────────────
// spec: capitulationScore >= 70

export const evalCapitulationSignal: RuleEvaluator = (scores) => {
  if (scores.capitulationScore >= 70) {
    return {
      type:       'CAPITULATION_SIGNAL',
      severity:   'HIGH',
      title:      'Sinal de capitulação',
      message:    `Capitulação ${scores.capitulationScore}/100. Indicadores apontam possível fundo de ciclo.`,
      minProfile: 'CONSERVATIVE',
    }
  }
  return null
}

// ── DELEVERAGING_SIGNAL ───────────────────────────────────────

export const evalDeleveragingSignal: RuleEvaluator = (scores, regime) => {
  if (regime === 'OVERLEVERAGED_MARKET' || (scores.riskScore >= 70 && scores.euphoriaScore >= 50)) {
    return {
      type:       'DELEVERAGING_SIGNAL',
      severity:   'MEDIUM',
      title:      'Sinal de desalavancagem',
      message:    `Mercado com excesso de alavancagem (risco ${scores.riskScore}/100). Risco de liquidações em cascata.`,
      minProfile: 'MODERATE',
    }
  }
  return null
}

// ── REGIME_CHANGE ─────────────────────────────────────────────

const BULLISH_REGIMES = new Set([
  'CAPITULATION_ZONE',
  'TACTICAL_BUY_AGGRESSIVE',
  'TACTICAL_BUY_MODERATE',
])

export const evalRegimeChange: RuleEvaluator = (_, regime, previousRegime) => {
  if (!previousRegime || previousRegime === regime) return null
  const isPositive = BULLISH_REGIMES.has(regime)
  return {
    type:       'REGIME_CHANGE',
    severity:   isPositive ? 'HIGH' : 'MEDIUM',
    title:      'Mudança de regime de mercado',
    message:    `Regime alterado de ${previousRegime} para ${regime}.`,
    minProfile: 'MODERATE',
  }
}

// ── Aggregator ────────────────────────────────────────────────

export const ALERT_RULES: RuleEvaluator[] = [
  evalEuphoriaWarning,       // highest priority first
  evalHighRisk,
  evalDeleveragingSignal,
  evalCapitulationSignal,
  evalAggressiveOpportunity,
  evalTacticalOpportunity,
  evalRegimeChange,
]
