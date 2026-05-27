export interface PricePoint {
  date:  string   // YYYY-MM-DD
  price: number   // BRL
}

export interface ContributionPoint {
  date:        string
  btcPriceBrl: number
  returnPct:   number
  amountBrl:   number
  btcAmount:   number
}

export interface HeatmapCell {
  year:      number
  month:     number  // 1–12
  returnPct: number
  date:      string
  amountBrl: number
}

export interface InsightData {
  bestContribution:  { date: string; returnPct: number; label: string }
  worstContribution: { date: string; returnPct: number; label: string }
  profitableCount:   number
  totalCount:        number
  dcaVsLumpSumPct:   number | null
}

export interface PatrimonioData {
  currentValue:      number
  totalInvested:     number
  totalReturn:       number   // percentage
  totalReturnBrl:    number   // R$ absolute
  avgPrice:          number
  totalBtc:          number
  contributionCount: number
  priceHistory:      PricePoint[]
  contributions:     ContributionPoint[]
  heatmap:           HeatmapCell[]
  insights:          InsightData
  currentBtcPrice:   number
}
