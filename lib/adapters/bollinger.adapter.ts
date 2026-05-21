// ============================================================
// adapters/bollinger.adapter.ts
// Bollinger Band %B — posição do preço dentro das bandas
// Fonte: Binance klines diários (público, sem auth)
//
// %B = (preço - banda inferior) / (banda superior - banda inferior)
// %B < 0  → preço abaixo da banda inferior (oversold)
// %B > 1  → preço acima da banda superior (overbought)
// ============================================================

import { BollingerResult } from "../types/indicator";
import { fetchJson } from "../utils/http";

const BINANCE_BASE =
  process.env.BINANCE_BASE_URL ?? "https://data-api.binance.vision";

async function fetchDailyCloses(limit: number): Promise<number[]> {
  const url = `${BINANCE_BASE}/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=${limit}`;
  const klines = await fetchJson<[number, string, string, string, string, ...unknown[]][]>(url);
  return klines.map((k) => parseFloat(k[4]));
}

function stdDev(prices: number[], mean: number): number {
  const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
  return Math.sqrt(variance);
}

function scoreBollinger(percentB: number): number {
  if (percentB < 0)    return  2;  // abaixo da banda inferior
  if (percentB < 0.2)  return  1;  // próximo da banda inferior
  if (percentB > 1.0)  return -2;  // acima da banda superior
  if (percentB > 0.8)  return -1;  // próximo da banda superior
  return 0;                         // meio das bandas
}

export async function fetchBollinger(currentPrice: number): Promise<BollingerResult> {
  try {
    const closes = await fetchDailyCloses(20);

    const sma20   = closes.reduce((a, b) => a + b, 0) / closes.length;
    const std     = stdDev(closes, sma20);
    const upper   = sma20 + 2 * std;
    const lower   = sma20 - 2 * std;
    const bandwidth = upper - lower;
    const percentB  = bandwidth > 0 ? (currentPrice - lower) / bandwidth : 0.5;
    const score     = scoreBollinger(percentB);
    const scoreLabel = score > 0 ? `+${score}` : String(score);

    const zone =
      percentB < 0    ? "abaixo banda inf" :
      percentB < 0.2  ? "próximo banda inf" :
      percentB > 1.0  ? "acima banda sup" :
      percentB > 0.8  ? "próximo banda sup" :
      "meio das bandas";

    return {
      status: "success",
      score,
      summary: `%B ${(percentB * 100).toFixed(1)}% — ${zone} (${scoreLabel})`,
      value: {
        sma20,
        upper,
        lower,
        percentB,
        bandwidth,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[bollinger] Falha: ${message}`);
    return {
      status: "error",
      score: 0,
      summary: "indisponível (0) — falha ao buscar dados",
      error: message,
    };
  }
}
