import { describe, it, expect } from 'vitest'
import { computeConsensus } from '@/components/dashboard/dimension/ConsensusBars'
import type { IndicatorScore } from '@lib/shared/types/signal'

describe('computeConsensus', () => {
  it('returns zeros for empty array', () => {
    expect(computeConsensus([])).toEqual({ bullish: 0, neutral: 0, bearish: 0 })
  })

  it('counts positive scores as bullish, negative as bearish', () => {
    const indicators: IndicatorScore[] = [
      { name: 'A', score:  2, summary: '' },
      { name: 'B', score:  1, summary: '' },
      { name: 'C', score: -1, summary: '' },
      { name: 'D', score:  0, summary: '' },
    ]
    const r = computeConsensus(indicators)
    expect(r.bullish).toBe(50)
    expect(r.bearish).toBe(25)
    expect(r.neutral).toBe(25)
  })

  it('bullish + neutral + bearish always sums to 100', () => {
    const indicators: IndicatorScore[] = [
      { name: 'A', score:  2, summary: '' },
      { name: 'B', score:  1, summary: '' },
      { name: 'C', score: -1, summary: '' },
    ]
    const { bullish, neutral, bearish } = computeConsensus(indicators)
    expect(bullish + neutral + bearish).toBe(100)
  })

  it('all bullish → 100% bullish, 0% others', () => {
    const indicators: IndicatorScore[] = [
      { name: 'A', score: 2, summary: '' },
      { name: 'B', score: 1, summary: '' },
    ]
    const r = computeConsensus(indicators)
    expect(r.bullish).toBe(100)
    expect(r.neutral).toBe(0)
    expect(r.bearish).toBe(0)
  })

  it('all neutral → 0% bullish and bearish', () => {
    const indicators: IndicatorScore[] = [
      { name: 'A', score: 0, summary: '' },
      { name: 'B', score: 0, summary: '' },
    ]
    const r = computeConsensus(indicators)
    expect(r.bullish).toBe(0)
    expect(r.bearish).toBe(0)
    expect(r.neutral).toBe(100)
  })
})
