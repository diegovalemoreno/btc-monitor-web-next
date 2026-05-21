// ============================================================
// domain/composite-signals.ts
// Detecta confluência de indicadores. Indicadores isolados geram
// muito ruído — só vale como sinal forte quando convergem.
//
// Sinais:
//   bullish-capitulation → +3
//   euphoria-risk        → -3
//   none                 →  0
// ============================================================

import {
  AllIndicators,
  CompositeKind,
  CompositeSignalResult,
} from "../types/indicator";

interface CompositeContext {
  fearGreed: number | null;
  fundingRate: number | null;
  oiChangePct: number | null;
  longLiqsUsd: number | null;
  mvrvRatio: number | null;
  belowMa200d: boolean | null;
  belowMa50w: boolean | null;
}

function ctxFromIndicators(ind: AllIndicators): CompositeContext {
  const get = <T>(r: { status: string; value?: T }): T | null =>
    r.status === "success" && r.value !== undefined ? r.value : null;

  const fg = get(ind.fearGreed);
  const fr = get(ind.fundingRate);
  const oi = get(ind.openInterest);
  const lq = get(ind.liquidations);
  const mv = get(ind.mvrv);
  const ma = get(ind.movingAverages);

  return {
    fearGreed:   fg?.fearGreedValue ?? null,
    fundingRate: fr?.rate ?? null,
    oiChangePct: oi?.changePercent ?? null,
    longLiqsUsd: lq?.longLiquidationsUsd ?? null,
    mvrvRatio:   mv?.ratio ?? null,
    belowMa200d: ma?.belowMa200d ?? null,
    belowMa50w:  ma?.belowMa50w ?? null,
  };
}

export function detectComposite(ctx: CompositeContext): {
  kind: CompositeKind;
  reasons: string[];
} {
  // Bullish Capitulation: medo + funding neg + OI down + longs liq + MVRV under
  const bcReasons: string[] = [];
  if (ctx.fearGreed !== null && ctx.fearGreed < 25) bcReasons.push("medo extremo");
  if (ctx.fundingRate !== null && ctx.fundingRate < 0) bcReasons.push("funding negativo");
  if (ctx.oiChangePct !== null && ctx.oiChangePct < -10) bcReasons.push("OI despencando");
  if (ctx.longLiqsUsd !== null && ctx.longLiqsUsd > 10_000_000) bcReasons.push("longs liquidados");
  if (ctx.mvrvRatio !== null && ctx.mvrvRatio < 1.5) bcReasons.push("MVRV subvalorizado");

  if (bcReasons.length >= 4) {
    return { kind: "bullish-capitulation", reasons: bcReasons };
  }

  // Euphoria Risk: funding very high + OI up + greed extreme + above MAs
  const erReasons: string[] = [];
  if (ctx.fundingRate !== null && ctx.fundingRate > 0.0003) erReasons.push("funding alto");
  if (ctx.oiChangePct !== null && ctx.oiChangePct > 15) erReasons.push("OI subindo");
  if (ctx.fearGreed !== null && ctx.fearGreed > 75) erReasons.push("greed extremo");
  if (ctx.belowMa200d === false && ctx.belowMa50w === false) erReasons.push("preço distante das médias");
  if (ctx.mvrvRatio !== null && ctx.mvrvRatio > 3) erReasons.push("MVRV em euforia");

  if (erReasons.length >= 3) {
    return { kind: "euphoria-risk", reasons: erReasons };
  }

  return { kind: "none", reasons: [] };
}

export function scoreComposite(kind: CompositeKind): number {
  switch (kind) {
    case "bullish-capitulation": return 3;
    case "euphoria-risk":        return -3;
    case "none":                 return 0;
  }
}

const COMPOSITE_LABELS: Record<CompositeKind, string> = {
  "bullish-capitulation": "Capitulação Otimista",
  "euphoria-risk":        "Risco de Euforia",
  none:                   "Sem confluência",
};

export function buildCompositeSignal(
  indicators: AllIndicators
): CompositeSignalResult {
  const ctx = ctxFromIndicators(indicators);
  const { kind, reasons } = detectComposite(ctx);
  const score = scoreComposite(kind);
  const scoreLabel = score > 0 ? `+${score}` : String(score);

  return {
    status: "success",
    score,
    summary: `${COMPOSITE_LABELS[kind]} (${scoreLabel})`,
    value: { kind, reasons },
  };
}
