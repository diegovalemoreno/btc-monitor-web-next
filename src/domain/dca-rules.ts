// ================================================================
// domain/dca-rules.ts
// Pure, testable DCA action determination.
// Risk always overrides opportunity (safety first).
// Profile caps the maximum allowed action.
// ================================================================

import type { SnapshotScores } from './snapshot-scores'
import type { DcaAction, Confidence, RiskProfile } from '@/lib/db/types'

export interface DcaDecision {
  action:     DcaAction
  confidence: Confidence
  rationale:  string
}

const PROFILE_CAP: Record<RiskProfile, DcaAction[]> = {
  CONSERVATIVE: ['WAIT', 'REDUCED_DCA', 'NORMAL_DCA'],
  MODERATE:     ['WAIT', 'REDUCED_DCA', 'NORMAL_DCA', 'REINFORCED_DCA'],
  AGGRESSIVE:   ['WAIT', 'REDUCED_DCA', 'NORMAL_DCA', 'REINFORCED_DCA', 'AGGRESSIVE_DCA'],
}

const ACTION_RANK: Record<DcaAction, number> = {
  WAIT:           0,
  REDUCED_DCA:    1,
  NORMAL_DCA:     2,
  REINFORCED_DCA: 3,
  AGGRESSIVE_DCA: 4,
}

function capByProfile(action: DcaAction, profile: RiskProfile): DcaAction {
  const allowed = PROFILE_CAP[profile]
  if (allowed.includes(action)) return action
  // Walk down until we find an allowed action
  const sorted = (Object.keys(ACTION_RANK) as DcaAction[])
    .sort((a, b) => ACTION_RANK[b] - ACTION_RANK[a])
  for (const a of sorted) {
    if (ACTION_RANK[a] <= ACTION_RANK[action] && allowed.includes(a)) return a
  }
  return 'NORMAL_DCA'
}

export function determineDcaAction(
  scores:  SnapshotScores,
  profile: RiskProfile
): DcaDecision {
  const { opportunityScore, riskScore, convictionScore, euphoriaScore } = scores

  // ── Risk overrides (checked first) ───────────────────────────

  if (euphoriaScore >= 80 || riskScore >= 85) {
    return {
      action:     'WAIT',
      confidence: 'HIGH',
      rationale:  `Risco extremo (risco ${riskScore}/100, euforia ${euphoriaScore}/100). Aguardar reversão antes de aportar.`,
    }
  }

  if (riskScore >= 75) {
    return {
      action:     'REDUCED_DCA',
      confidence: 'HIGH',
      rationale:  `Risco elevado (${riskScore}/100). Reduzir tamanho do aporte — manter apenas DCA mínimo.`,
    }
  }

  // ── Opportunity rules ─────────────────────────────────────────

  // spec: AGGRESSIVE_DCA
  if (opportunityScore >= 80 && riskScore <= 50 && convictionScore >= 70) {
    const action    = capByProfile('AGGRESSIVE_DCA', profile)
    const confidence: Confidence = convictionScore >= 80 ? 'HIGH' : 'MEDIUM'
    return {
      action,
      confidence,
      rationale: action === 'AGGRESSIVE_DCA'
        ? `Oportunidade excepcional (score ${opportunityScore}/100, convicção ${convictionScore}/100). Aportar integralmente incluindo reserva.`
        : `Oportunidade forte (score ${opportunityScore}/100), mas perfil ${profile} limita aporte a ${action}.`,
    }
  }

  // spec: REINFORCED_DCA
  if (opportunityScore >= 65 && riskScore <= 60) {
    const action    = capByProfile('REINFORCED_DCA', profile)
    const confidence: Confidence = opportunityScore >= 75 ? 'HIGH' : 'MEDIUM'
    return {
      action,
      confidence,
      rationale: action === 'REINFORCED_DCA'
        ? `Boa janela de compra (score ${opportunityScore}/100). Aumentar aporte além do DCA padrão.`
        : `Janela favorável (score ${opportunityScore}/100), perfil ${profile} limita aporte a ${action}.`,
    }
  }

  // spec: NORMAL_DCA
  if (opportunityScore >= 40 && opportunityScore < 65) {
    return {
      action:     'NORMAL_DCA',
      confidence: 'MEDIUM',
      rationale:  `Mercado neutro (score ${opportunityScore}/100). Manter cadência de DCA regular.`,
    }
  }

  // Low opportunity + moderate risk → still DCA normally
  if (riskScore < 65) {
    return {
      action:     'NORMAL_DCA',
      confidence: 'LOW',
      rationale:  `Sem oportunidade clara (score ${opportunityScore}/100), mas sem risco elevado. DCA normal.`,
    }
  }

  // Default: risk is moderate-high, no clear opportunity
  return {
    action:     'WAIT',
    confidence: 'MEDIUM',
    rationale:  `Contexto desfavorável (risco ${riskScore}/100, oportunidade ${opportunityScore}/100). Aguardar melhor janela.`,
  }
}
