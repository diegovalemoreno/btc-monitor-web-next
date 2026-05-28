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

export interface EvolutionPoint {
  date:       string
  ts:         number
  patrimonio: number
  btcPrice:   number
  aporte:     number | null
}

export interface HeatmapCell {
  year:      number
  month:     number  // 1–12
  returnPct: number
  date:      string
  amountBrl: number
}

export interface BestWorstEntry {
  label:     string
  returnPct: number
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
  evolution:         EvolutionPoint[]
  insights:          InsightData
  bestPeriods:       BestWorstEntry[]
  worstPeriods:      BestWorstEntry[]
  currentBtcPrice:   number
}
