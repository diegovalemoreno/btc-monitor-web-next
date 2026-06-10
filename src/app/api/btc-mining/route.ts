import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface HashrateEntry { timestamp: number; avgHashrate: number }
interface DifficultyEntry { timestamp: number; difficulty: number }
interface HashrateResponse { hashrates: HashrateEntry[]; difficulty: DifficultyEntry[]; currentHashrate: number; currentDifficulty: number }
interface DifficultyAdjustment {
  progressPercent:   number
  difficultyChange:  number
  remainingBlocks:   number
  estimatedRetargetDate: number
}

export async function GET() {
  try {
    const [hrRes, adjRes] = await Promise.all([
      fetch('https://mempool.space/api/v1/mining/hashrate/1w', { next: { revalidate: 300 } }),
      fetch('https://mempool.space/api/v1/difficulty-adjustment',  { next: { revalidate: 300 } }),
    ])

    if (!hrRes.ok || !adjRes.ok) throw new Error('mempool.space indisponível')

    const hrData:  HashrateResponse    = await hrRes.json()
    const adjData: DifficultyAdjustment = await adjRes.json()

    const rates = hrData.hashrates
    if (rates.length < 2) throw new Error('Dados de hashrate insuficientes')

    const currentEhs = hrData.currentHashrate / 1e18
    const weekAgoEhs = rates.length > 0 ? rates[0].avgHashrate / 1e18 : currentEhs
    const changePct  = weekAgoEhs > 0 ? ((currentEhs - weekAgoEhs) / weekAgoEhs) * 100 : 0

    const diffT = hrData.currentDifficulty ? hrData.currentDifficulty / 1e12 : null

    return NextResponse.json({
      hashrateEhs:      parseFloat(currentEhs.toFixed(1)),
      hashrate7dPct:    parseFloat(changePct.toFixed(1)),
      difficultyT:      diffT ? parseFloat(diffT.toFixed(2)) : null,
      nextAdjustPct:    parseFloat(adjData.difficultyChange.toFixed(1)),
      remainingBlocks:  adjData.remainingBlocks,
      epochProgressPct: parseFloat(adjData.progressPercent.toFixed(1)),
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 503 })
  }
}
