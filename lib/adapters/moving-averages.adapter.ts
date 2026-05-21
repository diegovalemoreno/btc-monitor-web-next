// ============================================================
// adapters/moving-averages.adapter.ts
// Fonte: Binance Spot mirror — candles históricos
// Calcula MA200 dias e MA50 semanas
// ============================================================

import { MovingAveragesResult, BinanceKline } from "../types/indicator";
import { scoreMovingAverages } from "../domain/score-engine";
import { fetchJson } from "../utils/http";
import { formatUSD } from "../utils/date";

// data-api.binance.vision: mirror público sem geo-block (US/GH Actions).
const BINANCE_BASE =
  process.env.BINANCE_BASE_URL ?? "https://data-api.binance.vision";

const SYMBOL = "BTCUSDT";

function average(prices: number[]): number {
  return prices.reduce((sum, p) => sum + p, 0) / prices.length;
}

async function fetchClosePrices(
  interval: string,
  limit: number
): Promise<number[]> {
  const url = `${BINANCE_BASE}/api/v3/klines?symbol=${SYMBOL}&interval=${interval}&limit=${limit}`;
  const klines = await fetchJson<BinanceKline[]>(url);
  return klines.map((k) => parseFloat(k[4]));
}

export async function fetchMovingAverages(
  currentPrice: number
): Promise<MovingAveragesResult> {
  try {
    const dailyPrices = await fetchClosePrices("1d", 200);
    const ma200d = average(dailyPrices);

    const weeklyPrices = await fetchClosePrices("1w", 50);
    const ma50w = average(weeklyPrices);

    const belowMa200d = currentPrice < ma200d;
    const belowMa50w  = currentPrice < ma50w;
    const score = scoreMovingAverages(belowMa200d, belowMa50w);

    const parts = [
      `MM 200d $${formatUSD(ma200d)} ${belowMa200d ? "abaixo" : "acima"}`,
      `MM 50s $${formatUSD(ma50w)} ${belowMa50w ? "abaixo" : "acima"}`,
    ];

    return {
      status: "success",
      score,
      summary: parts.join(" | ") + ` (+${score})`,
      value: {
        ma200d,
        ma50w,
        currentPrice,
        belowMa200d,
        belowMa50w,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[moving-averages] Falha: ${message}`);

    return {
      status: "error",
      score: 0,
      summary: "indisponível (0) — falha ao buscar dados",
      error: message,
    };
  }
}
