import { describe, it, expect } from 'vitest'
import { detectTacticalPatterns } from '../tactical-patterns'
import type { IndicatorGroup } from '@/lib/shared/types/signal'

function makeSignal(score: number, indicators: Array<{ name: string; score: number }>) {
  const group: IndicatorGroup = {
    key: 'sentiment',
    label: 'S',
    score: 0,
    indicators: indicators.map(i => ({ ...i, summary: '' })),
  }
  return { indicatorGroups: [group], explanation: { smoothedScore: score } }
}

describe('detectTacticalPatterns', () => {
  it('returns empty array when no pattern fires', () => {
    const signal = makeSignal(60, [{ name: 'Medo & Ganância', score: -1 }])
    expect(detectTacticalPatterns(signal as any)).toHaveLength(0)
  })

  it('detects Capitulação com Pânico when score<20, fear score=2, funding score>=1', () => {
    const signal = makeSignal(18, [
      { name: 'Medo & Ganância', score: 2 },
      { name: 'Taxa de Funding', score: 2 },
    ])
    const patterns = detectTacticalPatterns(signal as any)
    expect(patterns.some(p => p.name === 'Capitulação com Pânico')).toBe(true)
  })

  it('detects Acumulação Profunda when Mayer>=1, MVRV>=1, score<35', () => {
    const signal = makeSignal(30, [
      { name: 'Mayer Multiple', score: 2 },
      { name: 'MVRV', score: 1 },
    ])
    const patterns = detectTacticalPatterns(signal as any)
    expect(patterns.some(p => p.name === 'Acumulação Profunda')).toBe(true)
  })

  it('does not fire Acumulação Profunda when score>=35', () => {
    const signal = makeSignal(40, [
      { name: 'Mayer Multiple', score: 2 },
      { name: 'MVRV', score: 1 },
    ])
    const patterns = detectTacticalPatterns(signal as any)
    expect(patterns.some(p => p.name === 'Acumulação Profunda')).toBe(false)
  })

  it('fired pattern includes firedConditions, occurrences, avgReturn12m', () => {
    const signal = makeSignal(18, [
      { name: 'Medo & Ganância', score: 2 },
      { name: 'Taxa de Funding', score: 2 },
    ])
    const [p] = detectTacticalPatterns(signal as any)
    expect(p.firedConditions.length).toBeGreaterThan(0)
    expect(typeof p.occurrences).toBe('number')
    expect(typeof p.avgReturn12m).toBe('number')
  })
})
