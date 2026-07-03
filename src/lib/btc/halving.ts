const NEXT_HALVING_BLOCK = 1_050_000
const PREV_HALVING_BLOCK = 840_000
const HALVING_EPOCH_BLOCKS = 210_000
const AVG_BLOCK_SECONDS = 600

export { NEXT_HALVING_BLOCK }

export interface HalvingEstimate {
  nextHalvingBlock: number
  remainingBlocks:  number
  estimatedDate:    string
  epochProgressPct: number
}

export function computeHalvingEstimate(currentHeight: number, now: Date = new Date()): HalvingEstimate {
  const remainingBlocks = Math.max(0, NEXT_HALVING_BLOCK - currentHeight)
  const estimatedMs = now.getTime() + remainingBlocks * AVG_BLOCK_SECONDS * 1000
  const rawProgressPct = ((currentHeight - PREV_HALVING_BLOCK) / HALVING_EPOCH_BLOCKS) * 100
  const epochProgressPct = Math.min(100, Math.max(0, rawProgressPct))

  return {
    nextHalvingBlock: NEXT_HALVING_BLOCK,
    remainingBlocks,
    estimatedDate: new Date(estimatedMs).toISOString(),
    epochProgressPct: parseFloat(epochProgressPct.toFixed(2)),
  }
}
