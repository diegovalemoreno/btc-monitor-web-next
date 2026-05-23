// ============================================================
// domain/weights.ts
// Pesos por indicador. Aplicados em calculateTotalScore.
// 3 tiers — valuation/composite > derivativos/sentimento > técnica.
// ============================================================

export type IndicatorKey =
  | "fearGreed"
  | "weeklyCandle"
  | "fundingRate"
  | "sellerPressure"
  | "movingAverages"
  | "openInterest"
  | "mvrv"
  | "realizedPrice"
  | "hashRibbon"
  | "mayerMultiple"
  | "liquidations"
  | "liquidationHeatmap"
  | "etfFlow"
  | "piCycle"
  | "bollinger"
  | "dxy"
  | "longShortRatio"
  | "btcDominance"
  | "stablecoinRatio"
  | "marketRegime"
  | "compositeSignal";

export const WEIGHTS: Record<IndicatorKey, number> = {
  // Peso alto — valuation (on-chain + técnico clássico) + confluência
  mvrv:             2,
  realizedPrice:    2,
  mayerMultiple:    2,
  compositeSignal:  2,

  // Peso médio — derivativos / sentimento / regime / institucional
  fundingRate:      1.5,
  openInterest:     1.5,
  liquidations:     1.5,
  liquidationHeatmap: 1.5,
  fearGreed:        1.5,
  marketRegime:     1.5,
  etfFlow:          1.5,
  piCycle:          1.5,
  longShortRatio:   1.5,



  // Peso baixo — confirmação técnica isolada
  weeklyCandle:     1,
  movingAverages:   1,
  hashRibbon:       1,
  sellerPressure:   1,
  bollinger:        1,
  dxy:              1,
  btcDominance:     1,
  stablecoinRatio:  1,
};
