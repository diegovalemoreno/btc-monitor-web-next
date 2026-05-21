// ============================================================
// types/indicator.ts
// Tipos canônicos dos indicadores.
// IndicatorResult<T> é o contrato único de qualquer adapter.
// ============================================================

export type IndicatorStatus = "success" | "error" | "unknown";

export interface IndicatorResult<T = unknown> {
  status: IndicatorStatus;
  value?: T;
  score?: number;
  summary?: string;
  error?: string;
}

// ─── Dados específicos de cada indicador ─────────────────────

export interface FearGreedValue {
  fearGreedValue: number;
  classification: string;
}

export interface WeeklyCandleValue {
  openPrice: number;
  currentPrice: number;
  changePercent: number;
}

export interface FundingRateValue {
  rate: number;
  symbol: string;
}

export interface SellerPressureValue {
  avgRatio: number;
  samples: number;
  pressure: "Normal" | "Moderada" | "Extrema";
}

export interface MovingAveragesValue {
  ma200d: number;
  ma50w: number;
  currentPrice: number;
  belowMa200d: boolean;
  belowMa50w: boolean;
}

export interface OpenInterestValue {
  currentUsd: number;
  previousUsd: number;
  changePercent: number;
  windowHours: number;
}

export interface MvrvValue {
  ratio: number;
  classification: "undervalued" | "fair" | "elevated" | "euphoria";
}

export interface RealizedPriceValue {
  realizedPrice: number;
  currentPrice: number;
  ratio: number;
  belowRealized: boolean;
}

export interface HashRibbonValue {
  ma30: number;
  ma60: number;
  state: "capitulation" | "recovery" | "neutral";
}

export interface MayerMultipleValue {
  multiple: number;
  ma200d: number;
  currentPrice: number;
  classification:
    | "deep-discount"
    | "discount"
    | "fair"
    | "elevated"
    | "top-zone";
}

export interface LiquidationsValue {
  longLiquidationsUsd: number;
  shortLiquidationsUsd: number;
  windowMinutes: number;
  source: string;
}

export type MarketRegime =
  | "capitulation"
  | "deleveraging"
  | "euphoria"
  | "neutral"
  | "healthy-trend";

export interface MarketRegimeValue {
  regime: MarketRegime;
  reasons: string[];
}

export type CompositeKind =
  | "bullish-capitulation"
  | "euphoria-risk"
  | "none";

export interface CompositeSignalValue {
  kind: CompositeKind;
  reasons: string[];
}

// ─── Aliases tipados por indicador ───────────────────────────

export type FearGreedResult       = IndicatorResult<FearGreedValue>;
export type WeeklyCandleResult    = IndicatorResult<WeeklyCandleValue>;
export type FundingRateResult     = IndicatorResult<FundingRateValue>;
export type SellerPressureResult  = IndicatorResult<SellerPressureValue>;
export type MovingAveragesResult  = IndicatorResult<MovingAveragesValue>;
export type OpenInterestResult    = IndicatorResult<OpenInterestValue>;
export type MvrvResult            = IndicatorResult<MvrvValue>;
export type RealizedPriceResult   = IndicatorResult<RealizedPriceValue>;
export type HashRibbonResult      = IndicatorResult<HashRibbonValue>;
export type MayerMultipleResult   = IndicatorResult<MayerMultipleValue>;
export type LiquidationsResult    = IndicatorResult<LiquidationsValue>;
export type MarketRegimeResult    = IndicatorResult<MarketRegimeValue>;
export type CompositeSignalResult = IndicatorResult<CompositeSignalValue>;

export interface EtfFlowValue {
  totalDollarVolUsd: number;
  avg5dDollarVolUsd: number;
  volumeRatio: number;
  etfUp: boolean;
  score: number;
}

export type EtfFlowResult = IndicatorResult<EtfFlowValue>;

export interface PiCycleValue {
  ma111: number;
  ma350: number;
  doubledMa350: number;
  ratio: number;
  gapPct: number;
  crossed: boolean;
}

export type PiCycleResult = IndicatorResult<PiCycleValue>;

export interface BollingerValue {
  sma20: number;
  upper: number;
  lower: number;
  percentB: number;
  bandwidth: number;
}

export type BollingerResult = IndicatorResult<BollingerValue>;

export interface DxyValue {
  current: number;
  change5d: number;
  score: number;
}

export type DxyResult = IndicatorResult<DxyValue>;

export interface LongShortRatioValue {
  ratio: number;
  longPct: number;
  shortPct: number;
}
export type LongShortRatioResult = IndicatorResult<LongShortRatioValue>;

export interface BtcDominanceValue {
  dominancePct: number;
}
export type BtcDominanceResult = IndicatorResult<BtcDominanceValue>;

export interface StablecoinRatioValue {
  ssr: number;
  btcMarketCap: number;
  stablecoinMarketCap: number;
}
export type StablecoinRatioResult = IndicatorResult<StablecoinRatioValue>;

// ─── Agregado de todos os indicadores ────────────────────────

export interface AllIndicators {
  btcPrice: number | null;
  fearGreed: FearGreedResult;
  weeklyCandle: WeeklyCandleResult;
  fundingRate: FundingRateResult;
  sellerPressure: SellerPressureResult;
  movingAverages: MovingAveragesResult;
  openInterest: OpenInterestResult;
  mvrv: MvrvResult;
  realizedPrice: RealizedPriceResult;
  hashRibbon: HashRibbonResult;
  mayerMultiple: MayerMultipleResult;
  liquidations: LiquidationsResult;
  etfFlow: EtfFlowResult;
  piCycle: PiCycleResult;
  bollinger: BollingerResult;
  dxy: DxyResult;
  longShortRatio: LongShortRatioResult;
  btcDominance: BtcDominanceResult;
  stablecoinRatio: StablecoinRatioResult;
  marketRegime: MarketRegimeResult;
  compositeSignal: CompositeSignalResult;
}

// ─── Score final ─────────────────────────────────────────────

export type ScoreClassification =
  | "Apenas DCA normal"
  | "Região moderadamente interessante"
  | "Compra tática"
  | "Compra tática agressiva"
  | "Região historicamente muito interessante";

export interface ScoreResult {
  rawTotal: number;
  weightedTotal: number;
  classification: ScoreClassification;
}

// ─── Tipo auxiliar Binance ───────────────────────────────────

export type BinanceKline = [
  number, // open time
  string, // open
  string, // high
  string, // low
  string, // close
  string, // volume
  number, // close time
  string, // quote asset volume
  number, // number of trades
  string, // taker buy base volume
  string, // taker buy quote volume
  string  // ignore
];
