import { describe, it, expect } from 'vitest'
import { buildWhyNow } from '../why-now'
import type { IndicatorGroup } from '@/lib/shared/types/signal'

const mockGroups = (indicators: Array<{ name: string; score: number; summary: string }>): IndicatorGroup[] => [
  { key: 'sentiment', label: 'Sentimento', score: 0, indicators },
]

describe('buildWhyNow', () => {
  it('returns at most 4 items', () => {
    const groups = mockGroups([
      { name: 'Mayer Multiple',    score: 2,  summary: '0.87' },
      { name: 'MVRV',              score: 2,  summary: '1.2' },
      { name: 'Preço Realizado',   score: 1,  summary: 'abaixo' },
      { name: 'Medo & Ganância',   score: 2,  summary: '22' },
      { name: 'BTC Dominância',    score: 1,  summary: 'subindo' },
    ])
    expect(buildWhyNow(groups).length).toBeLessThanOrEqual(4)
  })

  it('prioritizes Mayer Multiple over lower-priority indicators', () => {
    const groups = mockGroups([
      { name: 'BTC Dominância',  score: 2, summary: 'subindo' },
      { name: 'Mayer Multiple',  score: 2, summary: '0.87' },
    ])
    const items = buildWhyNow(groups)
    expect(items[0].indicatorName).toBe('Mayer Multiple')
  })

  it('skips indicators with score 0 (neutral — not relevant to DCA timing)', () => {
    const groups = mockGroups([
      { name: 'Mayer Multiple', score: 0, summary: '1.2' },
      { name: 'MVRV',           score: 2, summary: '1.1' },
    ])
    const items = buildWhyNow(groups)
    expect(items.find(i => i.indicatorName === 'Mayer Multiple')).toBeUndefined()
    expect(items.find(i => i.indicatorName === 'MVRV')).toBeDefined()
  })

  it('includes negative indicators (warn when market is expensive)', () => {
    const groups = mockGroups([
      { name: 'Medo & Ganância', score: -2, summary: '82' },
    ])
    const items = buildWhyNow(groups)
    expect(items[0].isPositive).toBe(false)
  })

  it('sets isPositive true for score > 0', () => {
    const groups = mockGroups([
      { name: 'MVRV', score: 1, summary: '1.2' },
    ])
    const items = buildWhyNow(groups)
    expect(items[0].isPositive).toBe(true)
  })
})
