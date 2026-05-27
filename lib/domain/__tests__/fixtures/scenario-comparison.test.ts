import { describe, it, expect } from 'vitest'
import { buildScoreExplanation } from '../../score-explanation'
import { SCENARIO_A_INDICATORS, SCENARIO_A_EXPECTED_RAW_RANGE } from './scenario-a'
import { SCENARIO_B_INDICATORS, SCENARIO_B_EXPECTED_RAW_RANGE } from './scenario-b'

describe('Scenario fixtures', () => {
  it('Scenario A raw score is in expected range (~90)', () => {
    const exp = buildScoreExplanation({ indicators: SCENARIO_A_INDICATORS, previousScore: null })
    const [min, max] = SCENARIO_A_EXPECTED_RAW_RANGE
    expect(exp.rawScore).toBeGreaterThanOrEqual(min)
    expect(exp.rawScore).toBeLessThanOrEqual(max)
  })

  it('Scenario B raw score is in expected range (~83)', () => {
    const exp = buildScoreExplanation({ indicators: SCENARIO_B_INDICATORS, previousScore: null })
    const [min, max] = SCENARIO_B_EXPECTED_RAW_RANGE
    expect(exp.rawScore).toBeGreaterThanOrEqual(min)
    expect(exp.rawScore).toBeLessThanOrEqual(max)
  })

  it('Scenario B score is lower than Scenario A (weakened signals)', () => {
    const expA = buildScoreExplanation({ indicators: SCENARIO_A_INDICATORS, previousScore: null })
    const expB = buildScoreExplanation({ indicators: SCENARIO_B_INDICATORS, previousScore: null })
    expect(expB.rawScore).toBeLessThan(expA.rawScore)
  })

  it('Scenario B with smoothing from A gives delta in expected range', () => {
    const expA = buildScoreExplanation({ indicators: SCENARIO_A_INDICATORS, previousScore: null })
    const expB = buildScoreExplanation({ indicators: SCENARIO_B_INDICATORS, previousScore: expA.rawScore })
    // Smoothed B should be between A and raw B (EMA dampens)
    expect(expB.smoothedScore).toBeLessThan(expA.rawScore)
    expect(expB.smoothedScore).toBeGreaterThan(expB.rawScore)
    // Delta should be small-to-moderate negative (not a crash)
    expect(expB.delta).toBeLessThan(0)
    expect(expB.delta!).toBeGreaterThan(-20)
  })

  it('delta is explained by specific indicator changes', () => {
    const expA = buildScoreExplanation({ indicators: SCENARIO_A_INDICATORS, previousScore: null })
    const expB = buildScoreExplanation({ indicators: SCENARIO_B_INDICATORS, previousScore: expA.rawScore })

    // In scenario B, 3 indicators changed:
    // Variação 7d: 1 -> 0 (weight 1, contribution -1)
    // Long/Short Ratio: 1 -> 0 (weight 1.5, contribution -1.5)
    // Heatmap Liquidações: 1 -> 0 (weight 1.5, contribution -1.5)
    // Total expected change in weighted sum: -4

    const variacaoA = expA.contributions.find(c => c.name === 'Variação 7d')!
    const variacaoB = expB.contributions.find(c => c.name === 'Variação 7d')!
    expect(variacaoB.contribution).toBeLessThan(variacaoA.contribution)

    // WeightedSum should be lower in B
    expect(expB.weightedSum).toBeLessThan(expA.weightedSum)
  })
})
