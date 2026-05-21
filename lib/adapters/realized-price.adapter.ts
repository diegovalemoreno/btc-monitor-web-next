// ============================================================
// adapters/realized-price.adapter.ts
// Fonte: bitcoin-data.com — /api/v1/realized-price/last
// Custo médio on-chain do BTC. Free, sem auth.
//
// Regras:
//   preço atual < realized price        → +2 (zona histórica forte)
//   preço até 10% acima do realized     → +1 (próximo)
//   acima disso                          → 0
// ============================================================

import { RealizedPriceResult } from "../types/indicator";
import { fetchJson } from "../utils/http";

const BASE =
  process.env.BITCOIN_DATA_URL ?? "https://bitcoin-data.com";

interface RealizedPriceApiResponse {
  d: string;
  unixTs: number;
  realizedPrice: number;
}

export function scoreRealizedPrice(ratio: number): number {
  if (ratio < 1.0)  return 2;
  if (ratio < 1.1)  return 1;
  return 0;
}

export async function fetchRealizedPrice(
  currentPrice: number
): Promise<RealizedPriceResult> {
  try {
    if (!isFinite(currentPrice) || currentPrice <= 0) {
      throw new Error(`Preço atual inválido: ${currentPrice}`);
    }

    const data = await fetchJson<RealizedPriceApiResponse>(
      `${BASE}/api/v1/realized-price/last`
    );

    const realizedPrice = data.realizedPrice;
    if (typeof realizedPrice !== "number" || realizedPrice <= 0) {
      throw new Error(`Realized price inválido: ${realizedPrice}`);
    }

    const ratio = currentPrice / realizedPrice;
    const belowRealized = currentPrice < realizedPrice;
    const score = scoreRealizedPrice(ratio);
    const scoreLabel = score > 0 ? `+${score}` : "0";

    const label = belowRealized
      ? "abaixo do preço realizado"
      : ratio < 1.1
        ? "próximo ao preço realizado"
        : "acima do preço realizado";

    return {
      status: "success",
      score,
      summary: `PR=$${realizedPrice.toFixed(0)} · razão ${ratio.toFixed(2)} — ${label} (${scoreLabel})`,
      value: { realizedPrice, currentPrice, ratio, belowRealized },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[realized-price] Falha: ${message}`);

    return {
      status: "error",
      score: 0,
      summary: "indisponível (0) — falha ao buscar dados",
      error: message,
    };
  }
}
