// ============================================================
// adapters/binance-price.adapter.ts
// Fonte: Binance Spot mirror (data-api.binance.vision) — preço + candle semanal
// ============================================================

import { WeeklyCandleResult, BinanceKline } from "../types/indicator";
import { scoreWeeklyChange } from "../domain/score-engine";
import { fetchJson } from "../utils/http";

// data-api.binance.vision: mirror público sem geo-block (US/GH Actions).
const BINANCE_BASE =
  process.env.BINANCE_BASE_URL ?? "https://data-api.binance.vision";

const SYMBOL = "BTCUSDT";

interface BinanceTickerPrice {
  symbol: string;
  price: string;
}

export async function fetchBtcCurrentPrice(): Promise<number | null> {
  try {
    const data = await fetchJson<BinanceTickerPrice>(
      `${BINANCE_BASE}/api/v3/ticker/price?symbol=${SYMBOL}`
    );
    return parseFloat(data.price);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[binance-price] Falha ao buscar preço: ${message}`);
    return null;
  }
}

export async function fetchWeeklyCandle(
  currentPrice: number
): Promise<WeeklyCandleResult> {
  try {
    const url = `${BINANCE_BASE}/api/v3/klines?symbol=${SYMBOL}&interval=1w&limit=2`;
    const klines = await fetchJson<BinanceKline[]>(url);

    if (!klines || klines.length < 1) {
      throw new Error("Nenhum candle retornado");
    }

    const latestKline = klines[klines.length - 1];
    const openPrice = parseFloat(latestKline[1]);
    const changePercent = ((currentPrice - openPrice) / openPrice) * 100;
    const score = scoreWeeklyChange(changePercent);

    const sign = score > 0 ? `+${score}` : "0";
    const abs = changePercent >= 0 ? "+" : "";

    return {
      status: "success",
      score,
      summary: `${abs}${changePercent.toFixed(2)}% (${sign})`,
      value: { openPrice, currentPrice, changePercent },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[binance-price] Falha ao buscar candle semanal: ${message}`);

    return {
      status: "error",
      score: 0,
      summary: "indisponível (0) — falha ao buscar dados",
      error: message,
    };
  }
}
