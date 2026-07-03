import { describe, it, expect } from 'vitest'
import { computeHalvingEstimate, NEXT_HALVING_BLOCK } from '../halving'

describe('computeHalvingEstimate', () => {
  it('exports the correct next halving block', () => {
    expect(NEXT_HALVING_BLOCK).toBe(1_050_000)
  })

  it('at the start of the epoch, has full blocks remaining and 0% progress', () => {
    const now = new Date('2024-04-20T00:00:00.000Z')
    const result = computeHalvingEstimate(840_000, now)

    expect(result.nextHalvingBlock).toBe(1_050_000)
    expect(result.remainingBlocks).toBe(210_000)
    expect(result.epochProgressPct).toBe(0)
    expect(result.estimatedDate).toBe(new Date(now.getTime() + 210_000 * 600 * 1000).toISOString())
  })

  it('halfway through the epoch, has half blocks remaining and 50% progress', () => {
    const now = new Date('2026-01-01T00:00:00.000Z')
    const result = computeHalvingEstimate(945_000, now)

    expect(result.remainingBlocks).toBe(105_000)
    expect(result.epochProgressPct).toBe(50)
  })

  it('at the halving block, has 0 blocks remaining and 100% progress', () => {
    const now = new Date('2028-04-01T00:00:00.000Z')
    const result = computeHalvingEstimate(1_050_000, now)

    expect(result.remainingBlocks).toBe(0)
    expect(result.epochProgressPct).toBe(100)
    expect(result.estimatedDate).toBe(now.toISOString())
  })

  it('clamps remaining blocks and progress once past the halving block', () => {
    const now = new Date('2028-05-01T00:00:00.000Z')
    const result = computeHalvingEstimate(1_060_000, now)

    expect(result.remainingBlocks).toBe(0)
    expect(result.epochProgressPct).toBe(100)
  })
})
