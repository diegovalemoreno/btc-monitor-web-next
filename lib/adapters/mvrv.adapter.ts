// ============================================================
// adapters/mvrv.adapter.ts
// MVRV ratio = market cap / realized cap ≈ currentPrice / realizedPrice.
// Computa localmente a partir de preço atual + realized price já buscado.
// Não consome API externa adicional.
//
// Regras (ratio):
//   < 1       → undervalued → +2
//   1 – 3     → fair        → +1
//   3 – 6     → elevated    →  0
//   > 6       → euphoria    → -2
// ============================================================

import { MvrvResult, MvrvValue } from "../types/indicator";

export function scoreMvrv(ratio: number): number {
  if (ratio < 1) return 2;
  if (ratio < 3) return 1;
  if (ratio < 6) return 0;
  return -2;
}

export function classifyMvrv(ratio: number): MvrvValue["classification"] {
  if (ratio < 1) return "undervalued";
  if (ratio < 3) return "fair";
  if (ratio < 6) return "elevated";
  return "euphoria";
}

const CLASSIFICATION_PT: Record<MvrvValue["classification"], string> = {
  undervalued: "subvalorizado",
  fair:        "neutro",
  elevated:    "elevado",
  euphoria:    "euforia",
};

export function buildMvrv(
  currentPrice: number,
  realizedPrice: number
): MvrvResult {
  if (!isFinite(currentPrice) || currentPrice <= 0) {
    return {
      status: "error",
      score: 0,
      summary: "indisponível (0) — preço atual indisponível",
      error: `Preço atual inválido: ${currentPrice}`,
    };
  }
  if (!isFinite(realizedPrice) || realizedPrice <= 0) {
    return {
      status: "error",
      score: 0,
      summary: "indisponível (0) — preço realizado indisponível",
      error: `Realized price inválido: ${realizedPrice}`,
    };
  }

  const ratio = currentPrice / realizedPrice;
  const score = scoreMvrv(ratio);
  const classification = classifyMvrv(ratio);
  const scoreLabel = score > 0 ? `+${score}` : String(score);

  return {
    status: "success",
    score,
    summary: `${ratio.toFixed(2)} — ${CLASSIFICATION_PT[classification]} (${scoreLabel})`,
    value: { ratio, classification },
  };
}
