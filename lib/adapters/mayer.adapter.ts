// ============================================================
// adapters/mayer.adapter.ts
// Mayer Multiple = preço atual / MM200d.
// Criado por Trace Mayer. 2.4 é a "magic threshold" — zona
// historicamente associada a topos de bull market.
//
// Função pura: deriva da MM200d já calculada pelo
// moving-averages.adapter. Sem chamada externa adicional.
//
// Regras:
//   M < 0.8       → deep-discount → +2
//   0.8 ≤ M < 1.2 → discount      → +1
//   1.2 ≤ M < 2.4 → fair          →  0
//   M ≥ 2.4       → top-zone      → -2
// ============================================================

import {
  MayerMultipleResult,
  MayerMultipleValue,
} from "../types/indicator";

export function scoreMayer(multiple: number): number {
  if (multiple < 0.8) return 2;
  if (multiple < 1.2) return 1;
  if (multiple < 2.4) return 0;
  return -2;
}

export function classifyMayer(
  multiple: number
): MayerMultipleValue["classification"] {
  if (multiple < 0.8) return "deep-discount";
  if (multiple < 1.2) return "discount";
  if (multiple < 2.4) return "fair";
  return "top-zone";
}

const CLASSIFICATION_PT: Record<
  MayerMultipleValue["classification"],
  string
> = {
  "deep-discount": "descontado profundo",
  discount:        "descontado",
  fair:            "neutro",
  elevated:        "elevado",
  "top-zone":      "zona de topo",
};

export function buildMayer(
  currentPrice: number,
  ma200d: number
): MayerMultipleResult {
  if (!isFinite(currentPrice) || currentPrice <= 0) {
    return {
      status: "error",
      score: 0,
      summary: "indisponível (0) — preço atual indisponível",
      error: `Preço atual inválido: ${currentPrice}`,
    };
  }
  if (!isFinite(ma200d) || ma200d <= 0) {
    return {
      status: "error",
      score: 0,
      summary: "indisponível (0) — MM200d indisponível",
      error: `MM200d inválida: ${ma200d}`,
    };
  }

  const multiple = currentPrice / ma200d;
  const classification = classifyMayer(multiple);
  const score = scoreMayer(multiple);
  const scoreLabel = score > 0 ? `+${score}` : String(score);

  return {
    status: "success",
    score,
    summary: `${multiple.toFixed(2)} — ${CLASSIFICATION_PT[classification]} (${scoreLabel})`,
    value: { multiple, ma200d, currentPrice, classification },
  };
}
