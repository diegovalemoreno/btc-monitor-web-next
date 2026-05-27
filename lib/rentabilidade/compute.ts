import type { DcaContributionRow } from '@/lib/db/types'
import type {
  PatrimonioData, PricePoint, ContributionPoint, HeatmapCell, InsightData,
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

  const sorted       = [...points].sort((a, b) => b.returnPct - a.returnPct)
  const best         = sorted[0]
  const worst        = sorted[sorted.length - 1]
  const profitableCount = points.filter(p => p.returnPct > 0).length

  const totalInvested = points.reduce((s, p) => s + p.amountBrl, 0)
  const totalBtc      = points.reduce((s, p) => s + p.btcAmount, 0)
  const dcaAvgPrice   = totalBtc > 0 ? totalInvested / totalBtc : null
  const byDate        = [...points].sort((a, b) => a.date.localeCompare(b.date))
  const oldestPrice   = byDate[0]?.btcPriceBrl ?? null

  let dcaVsLumpSumPct: number | null = null
  if (dcaAvgPrice && oldestPrice && points.length > 1) {
    const dcaReturn   = (currentBtcPrice - dcaAvgPrice) / dcaAvgPrice * 100
    const lumpReturn  = (currentBtcPrice - oldestPrice) / oldestPrice * 100
    dcaVsLumpSumPct   = parseFloat((dcaReturn - lumpReturn).toFixed(1))
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
  const purchases     = contributions.filter(isPurchase)
  const totalInvested = purchases.reduce((s, c) => s + c.amount, 0)
  const totalSats     = purchases.reduce((s, c) => s + (c.sats_purchased ?? 0), 0)
  const totalBtc      = totalSats / 1e8
  const currentValue  = totalBtc * currentBtcPrice
  const avgPrice      = totalBtc > 0 ? totalInvested / totalBtc : 0
  const totalReturn   = totalInvested > 0 ? ((currentValue - totalInvested) / totalInvested) * 100 : 0
  const totalReturnBrl = currentValue - totalInvested

  return {
    currentValue,
    totalInvested,
    totalReturn,
    totalReturnBrl,
    avgPrice,
    totalBtc,
    contributionCount: purchases.length,
    priceHistory,
    contributions: buildContributionPoints(purchases, currentBtcPrice),
    heatmap:       buildHeatmapCells(purchases, currentBtcPrice),
    insights:      computeInsights(purchases, currentBtcPrice),
    currentBtcPrice,
  }
}
