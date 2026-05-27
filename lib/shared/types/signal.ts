// ============================================================
// shared/types/signal.ts
// Tipos canônicos do Signal Engine.
// Todos os módulos de rules, playbooks, notifications e history
// dependem destes tipos — nunca do contrário.
// ============================================================

import type { TacticalScoreExplanation } from './score-explanation'

// ─── Regime de Mercado (9 valores) ───────────────────────────

export type MarketRegime =
  | "CAPITULATION_ZONE"
  | "TACTICAL_BUY_AGGRESSIVE"
  | "TACTICAL_BUY_MODERATE"
  | "TACTICAL_BUY_LIGHT"
  | "NEUTRAL"
  | "RISK_OFF"
  | "EXTREME_RISK"
  | "OVERLEVERAGED_MARKET"
  | "EUPHORIA_ZONE";

// ─── Nível de Risco ──────────────────────────────────────────

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "EXTREME";

// ─── Viés de Ação ────────────────────────────────────────────

export type ActionBias =
  | "DCA_NORMAL"
  | "TACTICAL_BUY_LIGHT"
  | "TACTICAL_BUY_MODERATE"
  | "TACTICAL_BUY_AGGRESSIVE"
  | "WAIT"
  | "RISK_OFF";

// ─── Playbook Tático ─────────────────────────────────────────

export interface TacticalPlaybook {
  allowed: string[];
  avoid: string[];
}

// ─── Regra Disparada ─────────────────────────────────────────

export interface TriggeredRule {
  name: string;
  reasons: string[];
}

// ─── Score por Indicador ─────────────────────────────────────

export interface IndicatorScore {
  name: string;
  score: number;
  summary: string;
}

// ─── Grupo de Indicadores ─────────────────────────────────────

export type IndicatorGroupKey =
  | "sentiment"
  | "derivatives"
  | "onchain"
  | "trend"
  | "macro"
  | "synthesis";

export interface IndicatorGroup {
  key: IndicatorGroupKey;
  label: string;
  score: number;
  indicators: IndicatorScore[];
}

// ─── Scores Dimensionais ──────────────────────────────────────

export interface DimensionScores {
  sentiment: number;
  derivatives: number;
  onchain: number;
  trend: number;
}

// ─── Sinal Tático Final ──────────────────────────────────────

export interface TacticalSignal {
  asset: "BTC";
  generatedAt: string;          // ISO 8601
  btcPrice: number | null;
  score: {
    raw: number;
    weighted: number;
  };
  regime: MarketRegime;
  riskLevel: RiskLevel;
  actionBias: ActionBias;
  indicators: IndicatorScore[];
  triggeredRules: TriggeredRule[];
  playbook: TacticalPlaybook;
  summary: string;              // texto completo formatado (compat. telegram)
  insights: string[];           // bullets de observação estruturados
  reading: string;              // leitura narrativa isolada
  dimensionScores: DimensionScores;
  indicatorGroups: IndicatorGroup[];
  explanation: TacticalScoreExplanation;
}
