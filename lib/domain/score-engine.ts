// ============================================================
// domain/score-engine.ts
// Consolida scores ponderados de todos os indicadores e classifica.
// Indicadores com status != "success" contribuem 0.
// Inclui scoring contextual de OI (cruza preço + funding).
// ============================================================

import {
  AllIndicators,
  IndicatorResult,
  OpenInterestValue,
  ScoreClassification,
  ScoreResult,
} from "../types/indicator";
import { IndicatorKey, WEIGHTS } from "./weights";

function safeScore(r: IndicatorResult): number {
  if (r.status !== "success") return 0;
  return r.score ?? 0;
}

// ─── Scoring contextual de Open Interest ─────────────────────
//
// Regras:
//   preço cai + OI cai forte (<-10%)   → +2
//   preço cai + OI despenca (<-15%)    → +3
//   preço sobe + OI sobe agressivo     → -1
//   preço lateral + OI sobe muito      → -2
// ─────────────────────────────────────────────────────────────

export function scoreOpenInterestContextual(
  oi: OpenInterestValue,
  weeklyChangePct: number | null,
  fundingRate: number | null
): number {
  const oiPct = oi.changePercent;

  const priceFalls   = weeklyChangePct !== null && weeklyChangePct < -3;
  const priceRises   = weeklyChangePct !== null && weeklyChangePct > 3;
  const priceLateral = weeklyChangePct !== null && !priceFalls && !priceRises;

  // Cenário positivo — desalavancagem
  if (priceFalls && oiPct <= -15) return 3;
  if (priceFalls && oiPct <= -10) return 2;

  // Funding negativo + OI descendo = limpeza saudável mesmo sem queda forte
  if (fundingRate !== null && fundingRate < 0 && oiPct <= -10) return 2;

  // Cenário negativo — excesso de alavancagem
  if (priceLateral && oiPct >= 10) return -2;
  if (priceRises && oiPct >= 15) return -1;

  // Fallback: queda de OI sem confluência ainda tem leve peso positivo
  if (oiPct <= -20) return 2;
  if (oiPct <= -10) return 1;

  return 0;
}

// Função pura: recebe os indicadores e devolve um novo OpenInterestResult
// com score e summary contextuais. Não muta nenhum input.
export function withOpenInterestContext(indicators: AllIndicators) {
  const oi = indicators.openInterest;
  if (oi.status !== "success" || !oi.value) return oi;

  const weekly =
    indicators.weeklyCandle.status === "success" && indicators.weeklyCandle.value
      ? indicators.weeklyCandle.value.changePercent
      : null;
  const funding =
    indicators.fundingRate.status === "success" && indicators.fundingRate.value
      ? indicators.fundingRate.value.rate
      : null;

  const newScore = scoreOpenInterestContextual(oi.value, weekly, funding);
  const sign = oi.value.changePercent >= 0 ? "+" : "";
  const scoreLabel = newScore > 0 ? `+${newScore}` : String(newScore);

  let context = "";
  if (newScore >= 2) context = "com desalavancagem";
  else if (newScore <= -1) context = "excesso de alavancagem";

  return {
    ...oi,
    score: newScore,
    summary: `${sign}${oi.value.changePercent.toFixed(2)}%${context ? " " + context : ""} (${scoreLabel})`,
  };
}

export function calculateTotalScore(indicators: AllIndicators): ScoreResult {
  const perIndicator: Record<IndicatorKey, IndicatorResult> = {
    fearGreed:       indicators.fearGreed,
    weeklyCandle:    indicators.weeklyCandle,
    fundingRate:     indicators.fundingRate,
    sellerPressure:  indicators.sellerPressure,
    movingAverages:  indicators.movingAverages,
    openInterest:    indicators.openInterest,
    mvrv:            indicators.mvrv,
    realizedPrice:   indicators.realizedPrice,
    hashRibbon:      indicators.hashRibbon,
    mayerMultiple:   indicators.mayerMultiple,
    liquidations:    indicators.liquidations,
    etfFlow:         indicators.etfFlow,
    piCycle:         indicators.piCycle,
    bollinger:       indicators.bollinger,
    dxy:             indicators.dxy,
    longShortRatio:  indicators.longShortRatio,
    btcDominance:    indicators.btcDominance,
    stablecoinRatio: indicators.stablecoinRatio,
    marketRegime:    indicators.marketRegime,
    compositeSignal: indicators.compositeSignal,
    liquidationHeatmap: indicators.liquidationHeatmap,
  };

  let rawTotal = 0;
  let weightedTotal = 0;
  for (const key of Object.keys(perIndicator) as IndicatorKey[]) {
    const s = safeScore(perIndicator[key]);
    rawTotal += s;
    weightedTotal += s * WEIGHTS[key];
  }

  const weightedRounded = Math.round(weightedTotal);

  return {
    rawTotal,
    weightedTotal: weightedRounded,
    classification: classify(weightedRounded),
  };
}

export function classify(score: number): ScoreClassification {
  if (score >= 12) return "Região historicamente muito interessante";
  if (score >= 9)  return "Compra tática agressiva";
  if (score >= 6)  return "Compra tática";
  if (score >= 3)  return "Região moderadamente interessante";
  return "Apenas DCA normal";
}

// ─── Regras individuais expostas para testes ─────────────────

export function scoreFearGreed(value: number): number {
  if (value <= 24) return 2;
  if (value <= 45) return 1;
  if (value <= 60) return 0;
  if (value <= 75) return -1;
  return -2;
}

export function scoreWeeklyChange(changePercent: number): number {
  if (changePercent < -20) return 2;
  if (changePercent < -10) return 1;
  return 0;
}

export function scoreFundingRate(rate: number): number {
  if (rate < -0.0001)  return 2;   // < -0.01%
  if (rate <= 0.0001)  return 0;   // -0.01% a 0.01%
  if (rate <= 0.0003)  return -1;  // 0.01% a 0.03%
  return -2;                        // > 0.03%
}

export function scoreMovingAverages(
  belowMa200d: boolean,
  belowMa50w:  boolean,
  belowMa50d:  boolean,
): number {
  let score = 0;
  if (belowMa200d) score += 1;
  if (belowMa50w)  score += 1;
  if (belowMa50d)  score += 1;
  return score;
}
