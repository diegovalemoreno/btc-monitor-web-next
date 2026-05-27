import { describe, it, expect } from 'vitest'
import { buildEvidences } from '@/components/dashboard/dimension/EvidencesList'
import type { IndicatorScore } from '@lib/shared/types/signal'

describe('buildEvidences', () => {
  it('returns empty array for no indicators', () => {
    expect(buildEvidences([])).toEqual([])
  })

  it('assigns ✓ to positive scores', () => {
    const indicators: IndicatorScore[] = [{ name: 'A', score: 2, summary: 'good' }]
    const result = buildEvidences(indicators)
    expect(result[0].symbol).toBe('✓')
    expect(result[0].name).toBe('A')
    expect(result[0].summary).toBe('good')
  })

  it('assigns ⚠ to negative scores', () => {
    const indicators: IndicatorScore[] = [{ name: 'A', score: -1, summary: 'bad' }]
    const result = buildEvidences(indicators)
    expect(result[0].symbol).toBe('⚠')
  })

  it('does not include neutral scores', () => {
    const indicators: IndicatorScore[] = [{ name: 'A', score: 0, summary: 'meh' }]
    const result = buildEvidences(indicators)
    expect(result).toHaveLength(0)
  })

  it('sorts positive by score descending', () => {
    const indicators: IndicatorScore[] = [
      { name: 'Low',  score: 1, summary: '' },
      { name: 'High', score: 2, summary: '' },
    ]
    const result = buildEvidences(indicators)
    expect(result[0].name).toBe('High')
    expect(result[1].name).toBe('Low')
  })

  it('sorts negative by score ascending (most negative first)', () => {
    const indicators: IndicatorScore[] = [
      { name: 'Mild',   score: -1, summary: '' },
      { name: 'Strong', score: -2, summary: '' },
    ]
    const result = buildEvidences(indicators)
    expect(result[0].name).toBe('Strong')
  })

  it('respects maxPositive limit', () => {
    const indicators: IndicatorScore[] = [
      { name: 'A', score: 2, summary: '' },
      { name: 'B', score: 1, summary: '' },
      { name: 'C', score: 1, summary: '' },
      { name: 'D', score: 1, summary: '' },
    ]
    const result = buildEvidences(indicators, 2, 2)
    expect(result.filter(e => e.symbol === '✓')).toHaveLength(2)
  })

  it('respects maxNegative limit', () => {
    const indicators: IndicatorScore[] = [
      { name: 'A', score: -1, summary: '' },
      { name: 'B', score: -2, summary: '' },
      { name: 'C', score: -1, summary: '' },
    ]
    const result = buildEvidences(indicators, 3, 1)
    expect(result.filter(e => e.symbol === '⚠')).toHaveLength(1)
  })

  it('outputs positive before negative', () => {
    const indicators: IndicatorScore[] = [
      { name: 'Neg', score: -1, summary: '' },
      { name: 'Pos', score:  2, summary: '' },
    ]
    const result = buildEvidences(indicators)
    expect(result[0].symbol).toBe('✓')
    expect(result[1].symbol).toBe('⚠')
  })
})
