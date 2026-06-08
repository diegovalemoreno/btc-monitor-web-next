import type { RiskProfile } from '@/lib/db/types'

export interface DcaRecommendation {
  recommendedAmount: number   // BRL, integer
  multiplier: number
  label: string
  score: number
}

const SCORE_BUCKETS: Array<{ max: number; multiplier: number; label: string }> = [
  { max: 20,  multiplier: 1.5, label: 'Capitulação — momento raro' },
  { max: 35,  multiplier: 1.3, label: 'Fundo de ciclo — oportunidade forte' },
  { max: 55,  multiplier: 1.1, label: 'Compra tática — condições favoráveis' },
  { max: 70,  multiplier: 1.0, label: 'Neutro — manter DCA padrão' },
  { max: 85,  multiplier: 0.7, label: 'Alta madura — reduzir aporte' },
  { max: 101, multiplier: 0.4, label: 'Euforia — preservar capital' },
]

const PROFILE_MODIFIER: Record<RiskProfile, number> = {
  CONSERVATIVE: 0.85,
  MODERATE:     1.00,
  AGGRESSIVE:   1.15,
}

export function buildRecommendation(
  score: number,
  monthlyAmountBrl: number,
  riskProfile: RiskProfile,
): DcaRecommendation {
  const bucket     = SCORE_BUCKETS.find(b => score < b.max) ?? SCORE_BUCKETS[SCORE_BUCKETS.length - 1]
  const modifier   = PROFILE_MODIFIER[riskProfile]
  const raw        = monthlyAmountBrl * bucket.multiplier * modifier
  const capped     = Math.min(raw, monthlyAmountBrl * 1.8)
  return {
    recommendedAmount: Math.round(capped),
    multiplier:        bucket.multiplier,
    label:             bucket.label,
    score,
  }
}
