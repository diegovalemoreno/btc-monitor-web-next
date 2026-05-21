// ============================================================
// signal-engine/pipeline.ts
// Orquestra o fluxo completo do Signal Engine.
// raw indicators → score → composite rules → regime → playbook → TacticalSignal
// ============================================================

import { gatherReport } from "../cli/index";
import { evaluateCompositeRules } from "../rules/composite-rules";
import { classifyRegime, riskLevelForRegime, actionBiasForRegime } from "../rules/regime-classifier";
import { selectPlaybook } from "../playbooks/playbook-selector";
import { buildInterpretation, formatInterpretation } from "../domain/interpretation";
import {
  TacticalSignal,
  IndicatorScore,
  IndicatorGroup,
  IndicatorGroupKey,
  DimensionScores,
} from "../shared/types/signal";
import { AllIndicators } from "../types/indicator";

// ─── Mapeamento de indicadores por grupo ─────────────────────

const INDICATOR_GROUPS: Array<{
  key: IndicatorGroupKey;
  label: string;
  names: string[];
}> = [
  {
    key: "sentiment",
    label: "Sentimento",
    names: ["Medo & Ganância", "Long/Short Ratio", "BTC Dominância"],
  },
  {
    key: "derivatives",
    label: "Derivativos",
    names: ["Taxa de Funding", "Open Interest", "Liq. de Longs", "Stablecoin Ratio"],
  },
  {
    key: "onchain",
    label: "On-chain",
    names: ["MVRV", "Preço Realizado", "Hash Ribbon", "Pressão venda", "ETF Institucional"],
  },
  {
    key: "trend",
    label: "Tendência",
    names: ["Médias Móveis", "Variação 7d", "Bollinger %B", "Mayer Multiple", "Pi Cycle Top"],
  },
  {
    key: "macro",
    label: "Macro",
    names: ["DXY (Dólar Index)"],
  },
  {
    key: "synthesis",
    label: "Síntese",
    names: ["Regime de Mercado", "Sinais Compostos"],
  },
];

function buildIndicatorGroups(scores: IndicatorScore[]): IndicatorGroup[] {
  const byName = new Map(scores.map((s) => [s.name, s]));
  return INDICATOR_GROUPS.map((g) => {
    const indicators = g.names
      .map((n) => byName.get(n))
      .filter((x): x is IndicatorScore => x !== undefined);
    const score = indicators.reduce((acc, i) => acc + i.score, 0);
    return { key: g.key, label: g.label, score, indicators };
  });
}

function buildDimensionScores(groups: IndicatorGroup[]): DimensionScores {
  const byKey = new Map(groups.map((g) => [g.key, g]));
  return {
    sentiment:   byKey.get("sentiment")?.score   ?? 0,
    derivatives: byKey.get("derivatives")?.score ?? 0,
    onchain:     byKey.get("onchain")?.score     ?? 0,
    trend:       byKey.get("trend")?.score       ?? 0,
  };
}

function indicatorsToScores(ind: AllIndicators): IndicatorScore[] {
  const entries: Array<[string, { score?: number; summary?: string; status: string }]> = [
    ["Medo & Ganância",   ind.fearGreed],
    ["Taxa de Funding",   ind.fundingRate],
    ["Variação 7d",       ind.weeklyCandle],
    ["Open Interest",     ind.openInterest],
    ["Liq. de Longs",     ind.liquidations],
    ["MVRV",              ind.mvrv],
    ["Preço Realizado",   ind.realizedPrice],
    ["Mayer Multiple",    ind.mayerMultiple],
    ["Hash Ribbon",       ind.hashRibbon],
    ["Pressão venda",     ind.sellerPressure],
    ["Médias Móveis",     ind.movingAverages],
    ["ETF Institucional", ind.etfFlow],
    ["Pi Cycle Top",      ind.piCycle],
    ["Bollinger %B",      ind.bollinger],
    ["DXY (Dólar Index)", ind.dxy],
    ["Long/Short Ratio",  ind.longShortRatio],
    ["BTC Dominância",    ind.btcDominance],
    ["Stablecoin Ratio",  ind.stablecoinRatio],
    ["Regime de Mercado", ind.marketRegime],
    ["Sinais Compostos",  ind.compositeSignal],
  ];

  return entries.map(([name, r]) => ({
    name,
    score: r.status === "success" ? (r.score ?? 0) : 0,
    summary: r.summary ?? "indisponível",
  }));
}

export async function runSignalEngine(): Promise<TacticalSignal> {
  const { btcPrice, indicators, score } = await gatherReport();

  const triggeredRules = evaluateCompositeRules(indicators);
  const regime         = classifyRegime(score.weightedTotal, triggeredRules);
  const playbook       = selectPlaybook(regime);

  const regimeKind    = indicators.marketRegime.value?.regime ?? "neutral";
  const compositeKind = indicators.compositeSignal.value?.kind ?? "none";
  const interp        = buildInterpretation(indicators, score, regimeKind, compositeKind);
  const summary       = formatInterpretation(interp);

  const scoresList      = indicatorsToScores(indicators);
  const indicatorGroups = buildIndicatorGroups(scoresList);
  const dimensionScores = buildDimensionScores(indicatorGroups);

  return {
    asset:            "BTC",
    generatedAt:      new Date().toISOString(),
    btcPrice,
    score:            { raw: score.rawTotal, weighted: score.weightedTotal },
    regime,
    riskLevel:        riskLevelForRegime(regime),
    actionBias:       actionBiasForRegime(regime),
    indicators:       scoresList,
    triggeredRules,
    playbook,
    summary,
    insights:         interp.observations,
    reading:          interp.reading,
    dimensionScores,
    indicatorGroups,
  };
}
