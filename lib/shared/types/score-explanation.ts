// ============================================================
// shared/types/score-explanation.ts
// Tipos para explicação detalhada do score tático.
// ============================================================

export type DataQuality = 'fresh' | 'missing'
export type ContributionStatus = 'positive' | 'neutral' | 'negative' | 'unavailable'

export interface ScoreContribution {
  name: string               // PT display name, e.g. "MVRV"
  score: number              // raw score from indicator (-2 to +2)
  weight: number             // weight (1, 1.5, or 2)
  contribution: number       // score * weight (rounded 2dp)
  percentOfTotal: number     // |contribution| / sum(|contributions|) * 100
  status: ContributionStatus
  dataQuality: DataQuality
}

export interface TacticalScoreExplanation {
  rawScore: number           // opportunity score before smoothing (0-100)
  smoothedScore: number      // after EMA: raw*0.7 + prev*0.3 (0-100)
  previousScore: number | null
  delta: number | null       // smoothedScore - previousScore
  weightedSum: number        // sum of (score * weight) before normalization
  formulaVersion: string     // e.g. "v2.0"
  calculatedAt: string       // ISO 8601
  contributions: ScoreContribution[]     // all 19 base indicators, sorted by |contribution| desc
  topPositive: ScoreContribution[]       // top 3 positive contributors
  topNegative: ScoreContribution[]       // top 3 negative contributors
  warnings: string[]                     // e.g. "3 indicadores indisponíveis"
}
