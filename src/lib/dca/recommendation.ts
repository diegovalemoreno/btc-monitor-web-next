import type { RiskProfile } from '@/lib/db/types'

export interface DcaRecommendation {
  recommendedAmount: number   // BRL, integer
  multiplier: number
  label: string
  score: number
}

// Ordered highest-first: find() returns first bucket where score >= min
// High score = many positive indicators firing = buying opportunity
const SCORE_BUCKETS: Array<{ min: number; multiplier: number; label: string }> = [
  { min: 65, multiplier: 1.5, label: 'Oportunidade Única — momento raro' },
  { min: 50, multiplier: 1.3, label: 'Oportunidade Forte — acumular mais' },
  { min: 35, multiplier: 1.1, label: 'Compra Tática — condições favoráveis' },
  { min: 20, multiplier: 1.0, label: 'Neutro — manter DCA padrão' },
  { min: 10, multiplier: 0.7, label: 'Mercado Aquecido — reduzir aporte' },
  { min:  0, multiplier: 0.4, label: 'Euforia / Péssimo — preservar capital' },
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
  const bucket     = SCORE_BUCKETS.find(b => score >= b.min) ?? SCORE_BUCKETS[SCORE_BUCKETS.length - 1]
  const modifier   = PROFILE_MODIFIER[riskProfile]
  const raw        = monthlyAmountBrl * bucket.multiplier * modifier
  // cap at 1.8× to avoid suggesting more than 80% above monthly in extreme markets
  const capped     = Math.min(raw, monthlyAmountBrl * 1.8)
  return {
    recommendedAmount: Math.round(capped),
    multiplier:        bucket.multiplier,
    label:             bucket.label,
    score,
  }
}
