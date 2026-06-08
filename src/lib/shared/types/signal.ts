export interface IndicatorScore {
  name: string
  score: number
  summary: string
}

export interface IndicatorGroup {
  key: string
  label: string
  score: number
  indicators: IndicatorScore[]
}
