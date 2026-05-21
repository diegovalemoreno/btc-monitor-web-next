// ============================================================
// domain/recommendation.ts
// Texto de classificação e disclaimer
// ============================================================

import { ScoreClassification } from "../types/indicator";

export const DISCLAIMER =
  "Este resultado não é recomendação financeira. Use apenas como apoio ao seu plano de DCA.";

export function getClassificationEmoji(c: ScoreClassification): string {
  switch (c) {
    case "Região historicamente muito interessante":
      return "🚀";
    case "Compra tática agressiva":
      return "🔥";
    case "Compra tática":
      return "📈";
    case "Região moderadamente interessante":
      return "🟡";
    default:
      return "🔵";
  }
}
