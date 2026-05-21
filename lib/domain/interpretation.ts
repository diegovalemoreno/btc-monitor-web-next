// ============================================================
// domain/interpretation.ts
// Gera interpretação contextual em prosa a partir dos indicadores
// e do regime de mercado. Não é recomendação financeira.
// ============================================================

import {
  AllIndicators,
  MarketRegime,
  CompositeKind,
  ScoreResult,
} from "../types/indicator";

interface Bullets {
  observations: string[];
  reading: string;
}

function valuationLine(ind: AllIndicators): string | null {
  if (ind.mvrv.status !== "success" || !ind.mvrv.value) return null;
  const { ratio, classification } = ind.mvrv.value;
  if (classification === "undervalued") {
    return `valuation historicamente descontado (MVRV ${ratio.toFixed(2)})`;
  }
  if (classification === "fair") {
    return `valuation em zona neutra (MVRV ${ratio.toFixed(2)})`;
  }
  if (classification === "elevated") {
    return `valuation elevado (MVRV ${ratio.toFixed(2)})`;
  }
  return `valuation em zona de euforia (MVRV ${ratio.toFixed(2)})`;
}

function deleverageLine(ind: AllIndicators): string | null {
  if (ind.openInterest.status !== "success" || !ind.openInterest.value) return null;
  const pct = ind.openInterest.value.changePercent;
  if (pct < -15) return `desalavancagem agressiva (OI ${pct.toFixed(1)}%)`;
  if (pct < -5)  return `desalavancagem parcial (OI ${pct.toFixed(1)}%)`;
  if (pct > 15)  return `crescimento agressivo de alavancagem (OI +${pct.toFixed(1)}%)`;
  if (pct > 5)   return `expansão moderada de alavancagem (OI +${pct.toFixed(1)}%)`;
  return null;
}

function liquidationLine(ind: AllIndicators): string | null {
  if (ind.liquidations.status !== "success" || !ind.liquidations.value) return null;
  const { longLiquidationsUsd, shortLiquidationsUsd } = ind.liquidations.value;
  if (longLiquidationsUsd <= 0 && shortLiquidationsUsd <= 0) return null;
  const ratio = longLiquidationsUsd / Math.max(shortLiquidationsUsd, 1);
  if (ratio > 5 && longLiquidationsUsd > 20_000_000) {
    return "flush significativo de longs";
  }
  if (ratio > 3) return "capitulação relevante de derivativos";
  if (ratio > 1) return "capitulação moderada de derivativos";
  return null;
}

function sentimentLine(ind: AllIndicators): string | null {
  if (ind.fearGreed.status !== "success" || !ind.fearGreed.value) return null;
  const v = ind.fearGreed.value.fearGreedValue;
  if (v < 15) return "medo extremo";
  if (v < 25) return "medo elevado";
  if (v > 75) return "euforia generalizada";
  if (v > 60) return "ganância dominante";
  return "sentimento neutro";
}

function fundingLine(ind: AllIndicators): string | null {
  if (ind.fundingRate.status !== "success" || !ind.fundingRate.value) return null;
  const r = ind.fundingRate.value.rate;
  if (r < -0.0001) return "funding negativo (short bias)";
  if (r > 0.0003)  return "funding extremamente positivo (long bias)";
  if (r > 0.0001)  return "funding levemente positivo";
  return null;
}

function noEuphoriaLine(ind: AllIndicators): string | null {
  if (ind.fearGreed.status !== "success" || !ind.fearGreed.value) return null;
  if (ind.fundingRate.status !== "success" || !ind.fundingRate.value) return null;
  const fg = ind.fearGreed.value.fearGreedValue;
  const fr = ind.fundingRate.value.rate;
  if (fg < 60 && fr < 0.0002) return "ausência de euforia";
  return null;
}

function reading(
  regime: MarketRegime,
  composite: CompositeKind,
  classification: ScoreResult["classification"]
): string {
  if (composite === "bullish-capitulation") {
    return "Confluência de sinais raramente vista. Historicamente esse tipo de ambiente foi favorável para acumulação de longo prazo.";
  }
  if (composite === "euphoria-risk") {
    return "Confluência de sinais de aquecimento extremo. Histórico sugere cautela com alocações táticas adicionais.";
  }
  if (regime === "capitulation") {
    return "Mercado em capitulação. Ambiente historicamente favorável para acumulação.";
  }
  if (regime === "deleveraging") {
    return "Limpeza de alavancagem em curso. Ambiente favorável para continuidade de DCA e possível compra tática.";
  }
  if (regime === "euphoria") {
    return "Mercado em euforia. Histórico sugere manter DCA padrão e evitar alocações táticas adicionais.";
  }
  if (regime === "healthy-trend") {
    return "Tendência saudável sem extremos. Manter DCA padrão.";
  }
  if (classification === "Apenas DCA normal") {
    return "Nenhuma assimetria histórica relevante. Manter DCA padrão.";
  }
  return "Sinais mistos. DCA padrão com viés para acumulação conforme classificação acima.";
}

export function buildInterpretation(
  indicators: AllIndicators,
  score: ScoreResult,
  regime: MarketRegime,
  composite: CompositeKind
): Bullets {
  const observations = [
    valuationLine(indicators),
    deleverageLine(indicators),
    liquidationLine(indicators),
    sentimentLine(indicators),
    fundingLine(indicators),
    noEuphoriaLine(indicators),
  ].filter((s): s is string => s !== null);

  return {
    observations,
    reading: reading(regime, composite, score.classification),
  };
}

export function formatInterpretation(b: Bullets): string {
  const lines: string[] = [];
  if (b.observations.length > 0) {
    lines.push("Mercado apresenta:");
    for (const o of b.observations) lines.push(`- ${o};`);
    lines.push("");
  }
  lines.push("Leitura:");
  lines.push(b.reading);
  return lines.join("\n");
}
