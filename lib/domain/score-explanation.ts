// lib/domain/score-explanation.ts
import { BASE_WEIGHTS } from './score-weights'
import type { IndicatorScore } from '../shared/types/signal'
import type {
  TacticalScoreExplanation,
  ScoreContribution,
  ContributionStatus,
  DataQuality,
} from '../shared/types/score-explanation'

const FORMULA_VERSION = 'v2.0'
const FORMULA_CENTER    = 30
const FORMULA_HALF_RANGE = 60

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

function opportunityFromWeighted(w: number): number {
  return clamp(Math.round((w + FORMULA_CENTER) / FORMULA_HALF_RANGE * 100), 0, 100)
}

function statusFor(score: number, quality: DataQuality): ContributionStatus {
  if (quality === 'missing') return 'unavailable'
  if (score > 0) return 'positive'
  if (score < 0) return 'negative'
  return 'neutral'
}

interface BuildOptions {
  indicators:    IndicatorScore[]
  previousScore: number | null
}

export function buildScoreExplanation({
  indicators,
  previousScore,
}: BuildOptions): TacticalScoreExplanation {
  const byName = new Map(indicators.map(i => [i.name, i]))

  let weightedSum = 0
  let totalAbsContrib = 0

  const rawContribs: Array<{
    name: string
    score: number
    weight: number
    contribution: number
    status: ContributionStatus
    dataQuality: DataQuality
  }> = []

  for (const [name, weight] of Object.entries(BASE_WEIGHTS)) {
    const ind = byName.get(name)
    const quality: DataQuality = (!ind || !Number.isFinite(ind.score)) ? 'missing' : 'fresh'
    const score = quality === 'missing' ? 0 : ind!.score
    const contribution = parseFloat((score * weight).toFixed(2))

    weightedSum += contribution
    totalAbsContrib += Math.abs(contribution)

    rawContribs.push({
      name,
      score,
      weight,
      contribution,
      status: statusFor(score, quality),
      dataQuality: quality,
    })
  }

  const contributions: ScoreContribution[] = rawContribs
    .map(c => ({
      ...c,
      percentOfTotal: totalAbsContrib > 0
        ? parseFloat((Math.abs(c.contribution) / totalAbsContrib * 100).toFixed(1))
        : 0,
    }))
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))

  const rawScore = opportunityFromWeighted(weightedSum)

  const smoothedScore = previousScore !== null
    ? clamp(Math.round(rawScore * 0.7 + previousScore * 0.3), 0, 100)
    : rawScore

  const delta = previousScore !== null ? smoothedScore - previousScore : null

  const topPositive = contributions
    .filter(c => c.contribution > 0)
    .slice(0, 3)

  const topNegative = contributions
    .filter(c => c.contribution < 0)
    .sort((a, b) => a.contribution - b.contribution)
    .slice(0, 3)

  const missingNames = contributions
    .filter(c => c.dataQuality === 'missing')
    .map(c => c.name)

  const warnings: string[] = missingNames.length > 0
    ? [`${missingNames.length} indicador(es) indisponível(is): ${missingNames.join(', ')}`]
    : []

  return {
    rawScore,
    smoothedScore,
    previousScore,
    delta,
    weightedSum: parseFloat(weightedSum.toFixed(2)),
    formulaVersion: FORMULA_VERSION,
    calculatedAt: new Date().toISOString(),
    contributions,
    topPositive,
    topNegative,
    warnings,
  }
}
