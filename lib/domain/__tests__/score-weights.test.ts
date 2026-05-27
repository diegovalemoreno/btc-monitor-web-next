import { describe, it, expect } from 'vitest'
import { BASE_WEIGHTS } from '../score-weights'

describe('BASE_WEIGHTS', () => {
  it('has exactly 19 entries', () => {
    expect(Object.keys(BASE_WEIGHTS)).toHaveLength(19)
  })

  it('does not include derived indicators', () => {
    expect(BASE_WEIGHTS['Regime de Mercado']).toBeUndefined()
    expect(BASE_WEIGHTS['Sinais Compostos']).toBeUndefined()
  })

  it('all weights are 1, 1.5 or 2', () => {
    for (const w of Object.values(BASE_WEIGHTS)) {
      expect([1, 1.5, 2]).toContain(w)
    }
  })

  it('max possible weighted sum >= 30 (needed for formula calibration)', () => {
    const maxSum = Object.values(BASE_WEIGHTS).reduce((acc, w) => acc + 2 * w, 0)
    expect(maxSum).toBeGreaterThanOrEqual(30)
  })
})
