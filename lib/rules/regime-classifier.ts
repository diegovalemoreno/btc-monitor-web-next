// ============================================================
// rules/regime-classifier.ts
// Classifica MarketRegime (9 valores) a partir do score ponderado
// e das regras compostas disparadas.
//
// Prioridade: EUPHORIA_ZONE > OVERLEVERAGED_MARKET > CAPITULATION_ZONE > score
// ============================================================

import { MarketRegime, RiskLevel, ActionBias, TriggeredRule } from "../shared/types/signal";

export function classifyRegime(
  weightedScore: number,
  triggeredRules: TriggeredRule[]
): MarketRegime {
  const ruleNames = new Set(triggeredRules.map((r) => r.name));

  if (ruleNames.has("EUPHORIA_ZONE"))        return "EUPHORIA_ZONE";
  if (ruleNames.has("OVERLEVERAGED_MARKET")) return "OVERLEVERAGED_MARKET";
  if (ruleNames.has("CAPITULATION_ZONE"))    return "CAPITULATION_ZONE";

  if (weightedScore <= -5)  return "EXTREME_RISK";
  if (weightedScore <= -2)  return "RISK_OFF";
  if (weightedScore <= 1)   return "NEUTRAL";
  if (weightedScore <= 4)   return "TACTICAL_BUY_LIGHT";
  if (weightedScore <= 7)   return "TACTICAL_BUY_MODERATE";
  if (weightedScore <= 10)  return "TACTICAL_BUY_AGGRESSIVE";
  return "CAPITULATION_ZONE";
}

export function riskLevelForRegime(regime: MarketRegime): RiskLevel {
  switch (regime) {
    case "EXTREME_RISK":          return "EXTREME";
    case "RISK_OFF":              return "HIGH";
    case "OVERLEVERAGED_MARKET":  return "HIGH";
    case "EUPHORIA_ZONE":         return "HIGH";
    case "NEUTRAL":               return "MEDIUM";
    case "TACTICAL_BUY_LIGHT":    return "MEDIUM";
    case "TACTICAL_BUY_MODERATE": return "MEDIUM";
    case "TACTICAL_BUY_AGGRESSIVE": return "LOW";
    case "CAPITULATION_ZONE":     return "MEDIUM";
  }
}

export function actionBiasForRegime(regime: MarketRegime): ActionBias {
  switch (regime) {
    case "EXTREME_RISK":          return "WAIT";
    case "RISK_OFF":              return "RISK_OFF";
    case "OVERLEVERAGED_MARKET":  return "WAIT";
    case "EUPHORIA_ZONE":         return "WAIT";
    case "NEUTRAL":               return "DCA_NORMAL";
    case "TACTICAL_BUY_LIGHT":    return "TACTICAL_BUY_LIGHT";
    case "TACTICAL_BUY_MODERATE": return "TACTICAL_BUY_MODERATE";
    case "TACTICAL_BUY_AGGRESSIVE": return "TACTICAL_BUY_AGGRESSIVE";
    case "CAPITULATION_ZONE":     return "TACTICAL_BUY_AGGRESSIVE";
  }
}
