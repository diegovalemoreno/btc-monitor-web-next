// ============================================================
// adapters/fear-greed.adapter.ts
// Fonte: Alternative.me Crypto Fear & Greed Index
// ============================================================

import { FearGreedResult } from "../types/indicator";
import { scoreFearGreed } from "../domain/score-engine";
import { fetchJson } from "../utils/http";

const BASE_URL =
  process.env.FEAR_GREED_URL ?? "https://api.alternative.me/fng/";

interface FearGreedApiResponse {
  data: Array<{
    value: string;
    value_classification: string;
    timestamp: string;
  }>;
}

const CLASSIFICATION_PT: Record<string, string> = {
  "Extreme Fear": "Medo Extremo",
  "Fear":         "Medo",
  "Neutral":      "Neutro",
  "Greed":        "Ganância",
  "Extreme Greed": "Ganância Extrema",
};

function translateClassification(en: string): string {
  return CLASSIFICATION_PT[en] ?? en;
}

export async function fetchFearGreed(): Promise<FearGreedResult> {
  try {
    const json = await fetchJson<FearGreedApiResponse>(
      `${BASE_URL}?limit=1&format=json`
    );

    const entry = json?.data?.[0];
    if (!entry) throw new Error("Resposta inesperada da API Fear & Greed");

    const value = parseInt(entry.value, 10);
    const classification = translateClassification(entry.value_classification);
    const score = scoreFearGreed(value);
    const scoreLabel = score > 0 ? `+${score}` : "0";

    return {
      status: "success",
      score,
      summary: `${value} — ${classification} (${scoreLabel})`,
      value: { fearGreedValue: value, classification },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[fear-greed] Falha: ${message}`);

    return {
      status: "error",
      score: 0,
      summary: "indisponível (0) — falha ao buscar dados",
      error: message,
    };
  }
}
