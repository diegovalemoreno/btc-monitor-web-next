// ============================================================
// adapters/dxy.adapter.ts
// Dollar Index (DXY) — correlação inversa com Bitcoin
// Fonte: Yahoo Finance (DX-Y.NYB), público, sem auth
//
// DXY subindo = dólar forte = pressão vendedora em BTC.
// DXY caindo = dólar fraco = ambiente favorável para BTC.
// ============================================================

import { DxyResult } from "../types/indicator";
import { fetchJson } from "../utils/http";

const YF_URL = "https://query1.finance.yahoo.com/v8/finance/chart/DX-Y.NYB?interval=1d&range=10d";

interface YahooChartResponse {
  chart: {
    result: Array<{
      indicators: { quote: Array<{ close: (number | null)[] }> };
    }>;
  };
}

function scoreDxy(change5d: number): number {
  if (change5d <= -2)   return  2;  // DXY caindo forte → muito favorável
  if (change5d <= -0.5) return  1;  // DXY caindo → favorável
  if (change5d <   0.5) return  0;  // lateral → neutro
  if (change5d <   2)   return -1;  // DXY subindo → desfavorável
  return -2;                         // DXY subindo forte → muito desfavorável
}

export async function fetchDxy(): Promise<DxyResult> {
  try {
    const json = await fetchJson<YahooChartResponse>(YF_URL);
    const closes = json.chart.result[0].indicators.quote[0].close.filter((c): c is number => c !== null);

    if (closes.length < 6) throw new Error("Dados insuficientes para DXY");

    const current = closes[closes.length - 1];
    const prev5d  = closes[closes.length - 6];
    const change5d = ((current - prev5d) / prev5d) * 100;
    const score    = scoreDxy(change5d);
    const scoreLabel = score > 0 ? `+${score}` : String(score);
    const dir = change5d >= 0 ? "+" : "";

    return {
      status: "success",
      score,
      summary: `DXY ${current.toFixed(2)} (${dir}${change5d.toFixed(2)}% em 5d) (${scoreLabel})`,
      value: { current, change5d, score },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[dxy] Falha: ${message}`);
    return {
      status: "error",
      score: 0,
      summary: "indisponível (0) — falha ao buscar DXY",
      error: message,
    };
  }
}
