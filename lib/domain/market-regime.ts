// ============================================================
// domain/market-regime.ts
// Detecta regime de mercado a partir de indicadores já coletados.
// Não consome API externa — pura derivação.
//
// Regimes:
//   capitulation   → +3
//   deleveraging   → +2
//   healthy-trend  → +1
//   neutral        →  0
//   euphoria       → -2
// ============================================================

import {
  AllIndicators,
  MarketRegime,
  MarketRegimeResult,
} from "../types/indicator";

interface RegimeContext {
  fearGreed: number | null;
  fundingRate: number | null;
  oiChangePct: number | null;
  weeklyChangePct: number | null;
  mvrvRatio: number | null;
  hashRibbonState: "capitulation" | "recovery" | "neutral" | null;
  belowMa200d: boolean | null;
  belowMa50w: boolean | null;
  longLiqsUsd: number | null;
}

function ctxFromIndicators(ind: AllIndicators): RegimeContext {
  const get = <T>(r: { status: string; value?: T }): T | null =>
    r.status === "success" && r.value !== undefined ? r.value : null;

  const fg = get(ind.fearGreed);
  const fr = get(ind.fundingRate);
  const oi = get(ind.openInterest);
  const wc = get(ind.weeklyCandle);
  const mv = get(ind.mvrv);
  const hr = get(ind.hashRibbon);
  const ma = get(ind.movingAverages);
  const lq = get(ind.liquidations);

  return {
    fearGreed:       fg?.fearGreedValue ?? null,
    fundingRate:     fr?.rate ?? null,
    oiChangePct:     oi?.changePercent ?? null,
    weeklyChangePct: wc?.changePercent ?? null,
    mvrvRatio:       mv?.ratio ?? null,
    hashRibbonState: hr?.state ?? null,
    belowMa200d:     ma?.belowMa200d ?? null,
    belowMa50w:      ma?.belowMa50w ?? null,
    longLiqsUsd:     lq?.longLiquidationsUsd ?? null,
  };
}

export function detectRegime(ctx: RegimeContext): {
  regime: MarketRegime;
  reasons: string[];
} {
  const reasons: string[] = [];

  // 1. Capitulation — múltiplas condições de stress
  const fgVeryLow = ctx.fearGreed !== null && ctx.fearGreed < 20;
  const weeklyDeep = ctx.weeklyChangePct !== null && ctx.weeklyChangePct < -15;
  const fundingNeg = ctx.fundingRate !== null && ctx.fundingRate < 0;
  const mvrvUnder = ctx.mvrvRatio !== null && ctx.mvrvRatio < 1.5;
  const hashCap = ctx.hashRibbonState === "capitulation";
  const bigLongLiqs = ctx.longLiqsUsd !== null && ctx.longLiqsUsd > 10_000_000;

  const capSignals =
    Number(fgVeryLow) + Number(weeklyDeep) + Number(fundingNeg) +
    Number(mvrvUnder) + Number(hashCap) + Number(bigLongLiqs);

  if (capSignals >= 3) {
    if (fgVeryLow) reasons.push("medo extremo");
    if (weeklyDeep) reasons.push("queda semanal severa");
    if (fundingNeg) reasons.push("funding negativo");
    if (mvrvUnder) reasons.push("MVRV subvalorizado");
    if (hashCap) reasons.push("hash ribbon em capitulação");
    if (bigLongLiqs) reasons.push("longs liquidados");
    return { regime: "capitulation", reasons };
  }

  // 2. Deleveraging — OI despencando independente do preço
  if (ctx.oiChangePct !== null && ctx.oiChangePct < -15) {
    reasons.push(`OI ${ctx.oiChangePct.toFixed(1)}%`);
    if (bigLongLiqs) reasons.push("longs liquidados");
    return { regime: "deleveraging", reasons };
  }

  // 3. Euphoria — funding muito alto + greed extremo + preço acima das médias
  const fundingHigh = ctx.fundingRate !== null && ctx.fundingRate > 0.0003;
  const fgExtreme = ctx.fearGreed !== null && ctx.fearGreed > 75;
  const aboveMA = ctx.belowMa200d === false && ctx.belowMa50w === false;
  const mvrvEuph = ctx.mvrvRatio !== null && ctx.mvrvRatio > 3;

  const euphSignals =
    Number(fundingHigh) + Number(fgExtreme) + Number(aboveMA) + Number(mvrvEuph);

  if (euphSignals >= 3) {
    if (fundingHigh) reasons.push("funding alto");
    if (fgExtreme) reasons.push("ganância extrema");
    if (aboveMA) reasons.push("preço acima das médias");
    if (mvrvEuph) reasons.push("MVRV em euforia");
    return { regime: "euphoria", reasons };
  }

  // 4. Healthy-trend — preço acima das médias + funding moderado + greed neutro
  const fundingModerate =
    ctx.fundingRate !== null && ctx.fundingRate >= 0 && ctx.fundingRate <= 0.0002;
  const fgNeutral = ctx.fearGreed !== null && ctx.fearGreed >= 40 && ctx.fearGreed <= 70;

  if (aboveMA && fundingModerate && fgNeutral) {
    reasons.push("preço acima das médias");
    reasons.push("funding moderado");
    reasons.push("sentimento neutro");
    return { regime: "healthy-trend", reasons };
  }

  return { regime: "neutral", reasons: ["sem confluência clara"] };
}

export function scoreRegime(regime: MarketRegime): number {
  switch (regime) {
    case "capitulation":  return 3;
    case "deleveraging":  return 2;
    case "healthy-trend": return 1;
    case "neutral":       return 0;
    case "euphoria":      return -2;
  }
}

const REGIME_LABELS: Record<MarketRegime, string> = {
  capitulation:  "Capitulação",
  deleveraging:  "Desalavancagem",
  "healthy-trend": "Tendência saudável",
  neutral:       "Neutro",
  euphoria:      "Euforia",
};

export function buildMarketRegime(indicators: AllIndicators): MarketRegimeResult {
  const ctx = ctxFromIndicators(indicators);
  const { regime, reasons } = detectRegime(ctx);
  const score = scoreRegime(regime);
  const scoreLabel = score > 0 ? `+${score}` : String(score);

  return {
    status: "success",
    score,
    summary: `${REGIME_LABELS[regime]} (${scoreLabel})`,
    value: { regime, reasons },
  };
}
