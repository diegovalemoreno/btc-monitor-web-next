import { describe, it, expect } from 'vitest'
import { buildRecommendation } from '../recommendation'

describe('buildRecommendation', () => {
  it('score 15 → multiplier 1.5, label capitulação', () => {
    const r = buildRecommendation(15, 1000, 'MODERATE')
    expect(r.multiplier).toBe(1.5)
    expect(r.recommendedAmount).toBe(1500)
    expect(r.label).toMatch(/Capitulação/)
  })

  it('score 45 → multiplier 1.1', () => {
    const r = buildRecommendation(45, 1000, 'MODERATE')
    expect(r.multiplier).toBe(1.1)
    expect(r.recommendedAmount).toBe(1100)
  })

  it('score 60 → multiplier 1.0', () => {
    const r = buildRecommendation(60, 1000, 'MODERATE')
    expect(r.multiplier).toBe(1.0)
    expect(r.recommendedAmount).toBe(1000)
  })

  it('score 90 → multiplier 0.4', () => {
    const r = buildRecommendation(90, 1000, 'MODERATE')
    expect(r.multiplier).toBe(0.4)
    expect(r.recommendedAmount).toBe(400)
  })

  it('CONSERVATIVE reduces amount by 15%', () => {
    const r = buildRecommendation(45, 1000, 'CONSERVATIVE')
    expect(r.recommendedAmount).toBeCloseTo(935, 0)
  })

  it('AGGRESSIVE increases amount by 15%', () => {
    const r = buildRecommendation(45, 1000, 'AGGRESSIVE')
    expect(r.recommendedAmount).toBeCloseTo(1265, 0)
  })

  it('never exceeds 1.8× monthly', () => {
    const r = buildRecommendation(0, 1000, 'AGGRESSIVE')
    expect(r.recommendedAmount).toBeLessThanOrEqual(1800)
  })

  it('rounds to nearest integer BRL', () => {
    const r = buildRecommendation(45, 333, 'MODERATE')
    expect(Number.isInteger(r.recommendedAmount)).toBe(true)
  })
})
