import { describe, it, expect } from 'vitest'
import { buildScoreExplanation } from '../score-explanation'
import type { IndicatorScore } from '../../shared/types/signal'

function makeIndicator(name: string, score: number, summary = 'ok'): IndicatorScore {
  return { name, score, summary }
}

const ALL_19: IndicatorScore[] = [
  makeIndicator('Medo & Ganância',     1),
  makeIndicator('Taxa de Funding',     -1),
  makeIndicator('Variação 7d',         0),
  makeIndicator('Open Interest',       1),
  makeIndicator('Liq. de Longs',       2),
  makeIndicator('MVRV',                2),
  makeIndicator('Preço Realizado',     1),
  makeIndicator('Mayer Multiple',      1),
  makeIndicator('Hash Ribbon',         1),
  makeIndicator('Pressão venda',       0),
  makeIndicator('Médias Móveis',       1),
  makeIndicator('ETF Institucional',   1),
  makeIndicator('Pi Cycle Top',        0),
  makeIndicator('Bollinger %B',        -1),
  makeIndicator('DXY (Dólar Index)',   0),
  makeIndicator('Long/Short Ratio',    0),
  makeIndicator('BTC Dominância',      1),
  makeIndicator('Heatmap Liquidações', 1),
  makeIndicator('Stablecoin Ratio',    0),
]

describe('buildScoreExplanation', () => {
  it('returns 19 contributions (excludes derived)', () => {
    const exp = buildScoreExplanation({ indicators: ALL_19, previousScore: null })
    expect(exp.contributions).toHaveLength(19)
  })

  it('contribution = score * weight', () => {
    const exp = buildScoreExplanation({ indicators: ALL_19, previousScore: null })
    for (const c of exp.contributions) {
      expect(c.contribution).toBeCloseTo(c.score * c.weight, 2)
    }
  })

  it('weightedSum matches sum of contributions', () => {
    const exp = buildScoreExplanation({ indicators: ALL_19, previousScore: null })
    const sum = exp.contributions.reduce((a, c) => a + c.contribution, 0)
    expect(exp.weightedSum).toBeCloseTo(sum, 1)
  })

  it('percentOfTotal sums to ~100', () => {
    const exp = buildScoreExplanation({ indicators: ALL_19, previousScore: null })
    const total = exp.contributions.reduce((a, c) => a + c.percentOfTotal, 0)
    expect(total).toBeCloseTo(100, 0)
  })

  it('NaN score is treated as 0 (unavailable), not negative', () => {
    const indicators = ALL_19.map(i =>
      i.name === 'Long/Short Ratio' ? { ...i, score: NaN } : i
    )
    const exp = buildScoreExplanation({ indicators, previousScore: null })
    const lsr = exp.contributions.find(c => c.name === 'Long/Short Ratio')!
    expect(lsr.contribution).toBe(0)
    expect(lsr.status).toBe('unavailable')
    expect(lsr.dataQuality).toBe('missing')
  })

  it('missing indicator (not in array) is treated as unavailable, not negative', () => {
    const indicators = ALL_19.filter(i => i.name !== 'MVRV')
    const exp = buildScoreExplanation({ indicators, previousScore: null })
    const mvrv = exp.contributions.find(c => c.name === 'MVRV')!
    expect(mvrv.contribution).toBe(0)
    expect(mvrv.status).toBe('unavailable')
  })

  it('is deterministic — same input produces same output', () => {
    const exp1 = buildScoreExplanation({ indicators: ALL_19, previousScore: null })
    const exp2 = buildScoreExplanation({ indicators: ALL_19, previousScore: null })
    expect(exp1.rawScore).toBe(exp2.rawScore)
    expect(exp1.weightedSum).toBe(exp2.weightedSum)
  })

  it('rawScore is within 0-100', () => {
    const exp = buildScoreExplanation({ indicators: ALL_19, previousScore: null })
    expect(exp.rawScore).toBeGreaterThanOrEqual(0)
    expect(exp.rawScore).toBeLessThanOrEqual(100)
  })

  it('applies EMA smoothing when previousScore provided', () => {
    const exp = buildScoreExplanation({ indicators: ALL_19, previousScore: 90 })
    expect(exp.smoothedScore).not.toBe(exp.rawScore)
    // smoothed = raw*0.7 + 90*0.3
    const expected = Math.round(exp.rawScore * 0.7 + 90 * 0.3)
    expect(exp.smoothedScore).toBe(expected)
  })

  it('smoothedScore equals rawScore when no previousScore', () => {
    const exp = buildScoreExplanation({ indicators: ALL_19, previousScore: null })
    expect(exp.smoothedScore).toBe(exp.rawScore)
  })

  it('delta is smoothedScore - previousScore', () => {
    const exp = buildScoreExplanation({ indicators: ALL_19, previousScore: 80 })
    expect(exp.delta).toBe(exp.smoothedScore - 80)
  })

  it('topPositive has positive contributions sorted desc', () => {
    const exp = buildScoreExplanation({ indicators: ALL_19, previousScore: null })
    const pos = exp.topPositive
    expect(pos.every(c => c.contribution > 0)).toBe(true)
    for (let i = 1; i < pos.length; i++) {
      expect(pos[i - 1].contribution).toBeGreaterThanOrEqual(pos[i].contribution)
    }
  })

  it('topNegative has negative contributions sorted asc', () => {
    const exp = buildScoreExplanation({ indicators: ALL_19, previousScore: null })
    const neg = exp.topNegative
    expect(neg.every(c => c.contribution < 0)).toBe(true)
    for (let i = 1; i < neg.length; i++) {
      expect(neg[i - 1].contribution).toBeLessThanOrEqual(neg[i].contribution)
    }
  })

  it('formulaVersion is v2.0', () => {
    const exp = buildScoreExplanation({ indicators: ALL_19, previousScore: null })
    expect(exp.formulaVersion).toBe('v2.0')
  })

  it('warns when indicators are unavailable', () => {
    const indicators = ALL_19.map(i =>
      i.name === 'MVRV' ? { ...i, score: NaN } : i
    )
    const exp = buildScoreExplanation({ indicators, previousScore: null })
    expect(exp.warnings.some(w => w.includes('MVRV') || w.includes('indisponív'))).toBe(true)
  })
})
