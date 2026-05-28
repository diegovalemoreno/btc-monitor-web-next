import type { DcaContributionRow } from '@/lib/db/types'
import type {
  PatrimonioData, PricePoint, ContributionPoint, EvolutionPoint,
  HeatmapCell, BestWorstEntry, InsightData,
} from './types'

export function colorForReturn(returnPct: number): string {
  if (returnPct < -5)  return '#7f1d1d'
  if (returnPct < 0)   return '#991b1b'
  if (returnPct < 25)  return '#166534'
  if (returnPct < 50)  return '#15803d'
  if (returnPct < 100) return '#16a34a'
  if (returnPct < 150) return '#22c55e'
  if (returnPct < 180) return '#4ade80'
  if (returnPct < 200) return '#86efac'
  return '#dcfce7'
}

export function textColorForReturn(returnPct: number): string {
  return returnPct < 100 ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.75)'
}

function isPurchase(c: DcaContributionRow): boolean {
  return Boolean(c.sats_purchased && c.sats_purchased > 0 && !c.notes?.includes('Venda'))
}

function formatMonthLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
}

export function buildContributionPoints(
  contributions: DcaContributionRow[],
  currentBtcPrice: number,
): ContributionPoint[] {
  return contributions.filter(isPurchase).map(c => {
    const btcPriceBrl = c.btc_price_brl ?? c.effective_price_brl ?? currentBtcPrice
    const returnPct   = ((currentBtcPrice - btcPriceBrl) / btcPriceBrl) * 100
    const btcAmount   = (c.sats_purchased ?? 0) / 1e8
    return { date: c.contribution_date, btcPriceBrl, returnPct, amountBrl: c.amount, btcAmount }
  })
}

export function buildHeatmapCells(
  contributions: DcaContributionRow[],
  currentBtcPrice: number,
): HeatmapCell[] {
  return buildContributionPoints(contributions, currentBtcPrice).map(cp => {
    const d = new Date(cp.date + 'T00:00:00')
    return { year: d.getFullYear(), month: d.getMonth() + 1, returnPct: cp.returnPct, date: cp.date, amountBrl: cp.amountBrl }
  })
}

export function buildEvolution(
  contributions: DcaContributionRow[],
  priceHistory: PricePoint[],
): EvolutionPoint[] {
  const purchases = contributions.filter(isPurchase).sort((a, b) =>
    a.contribution_date.localeCompare(b.contribution_date)
  )
  if (purchases.length === 0) return []

  const firstDate = purchases[0].contribution_date

  const aportesByDate = new Map<string, number>()
  for (const c of purchases) {
    aportesByDate.set(c.contribution_date, (aportesByDate.get(c.contribution_date) ?? 0) + c.amount)
  }

  let cumulativeBtc = 0
  let idx = 0

  return priceHistory
    .filter(p => p.date >= firstDate)
    .map(p => {
      while (idx < purchases.length && purchases[idx].contribution_date <= p.date) {
        cumulativeBtc += (purchases[idx].sats_purchased ?? 0) / 1e8
        idx++
      }
      return {
        date:       p.date,
        ts:         new Date(p.date + 'T00:00:00').getTime(),
        patrimonio: Math.round(cumulativeBtc * p.price),
        btcPrice:   p.price,
        aporte:     aportesByDate.get(p.date) ?? null,
      }
    })
}

export function buildBestWorst(
  contributions: DcaContributionRow[],
  currentBtcPrice: number,
  n = 3,
): { best: BestWorstEntry[]; worst: BestWorstEntry[] } {
  const points = buildContributionPoints(contributions, currentBtcPrice)
  if (points.length === 0) return { best: [], worst: [] }

  const sorted = [...points].sort((a, b) => b.returnPct - a.returnPct)
  return {
    best:  sorted.slice(0, n).map(p => ({ label: formatMonthLabel(p.date), returnPct: p.returnPct })),
    worst: sorted.slice(-n).reverse().map(p => ({ label: formatMonthLabel(p.date), returnPct: p.returnPct })),
  }
}

export function computeInsights(
  contributions: DcaContributionRow[],
  currentBtcPrice: number,
): InsightData {
  const points = buildContributionPoints(contributions, currentBtcPrice)
  const empty: InsightData = {
    bestContribution:  { date: '', returnPct: 0, label: '—' },
    worstContribution: { date: '', returnPct: 0, label: '—' },
    profitableCount: 0, totalCount: 0, dcaVsLumpSumPct: null,
  }
  if (points.length === 0) return empty

  const sorted          = [...points].sort((a, b) => b.returnPct - a.returnPct)
  const best            = sorted[0]
  const worst           = sorted[sorted.length - 1]
  const profitableCount = points.filter(p => p.returnPct > 0).length

  const totalInvested = points.reduce((s, p) => s + p.amountBrl, 0)
  const totalBtc      = points.reduce((s, p) => s + p.btcAmount, 0)
  const dcaAvgPrice   = totalBtc > 0 ? totalInvested / totalBtc : null
  const byDate        = [...points].sort((a, b) => a.date.localeCompare(b.date))
  const oldestPrice   = byDate[0]?.btcPriceBrl ?? null

  let dcaVsLumpSumPct: number | null = null
  if (dcaAvgPrice && oldestPrice && points.length > 1) {
    const dcaReturn  = (currentBtcPrice - dcaAvgPrice) / dcaAvgPrice * 100
    const lumpReturn = (currentBtcPrice - oldestPrice) / oldestPrice * 100
    dcaVsLumpSumPct  = parseFloat((dcaReturn - lumpReturn).toFixed(1))
  }

  return {
    bestContribution:  { date: best.date,  returnPct: best.returnPct,  label: formatMonthLabel(best.date) },
    worstContribution: { date: worst.date, returnPct: worst.returnPct, label: formatMonthLabel(worst.date) },
    profitableCount,
    totalCount: points.length,
    dcaVsLumpSumPct,
  }
}

export function computePatrimonio(
  contributions: DcaContributionRow[],
  priceHistory: PricePoint[],
  currentBtcPrice: number,
): PatrimonioData {
  const purchases      = contributions.filter(isPurchase)
  const totalInvested  = purchases.reduce((s, c) => s + c.amount, 0)
  const totalSats      = purchases.reduce((s, c) => s + (c.sats_purchased ?? 0), 0)
  const totalBtc       = totalSats / 1e8
  const currentValue   = totalBtc * currentBtcPrice
  const avgPrice       = totalBtc > 0 ? totalInvested / totalBtc : 0
  const totalReturn    = totalInvested > 0 ? ((currentValue - totalInvested) / totalInvested) * 100 : 0
  const totalReturnBrl = currentValue - totalInvested
  const { best: bestPeriods, worst: worstPeriods } = buildBestWorst(purchases, currentBtcPrice)

  return {
    currentValue,
    totalInvested,
    totalReturn,
    totalReturnBrl,
    avgPrice,
    totalBtc,
    contributionCount: purchases.length,
    priceHistory,
    evolution:   buildEvolution(purchases, priceHistory),
    insights:    computeInsights(purchases, currentBtcPrice),
    bestPeriods,
    worstPeriods,
    currentBtcPrice,
  }
}
