// ============================================================
// adapters/etf-flows.adapter.ts
// Pressão institucional via ETFs de Bitcoin spot (IBIT, FBTC, GBTC, ARKB)
// Fonte: Yahoo Finance (pública, sem autenticação)
//
// Métrica: volume financeiro (USD) dos 4 maiores ETFs vs média 5d.
// Volume elevado + ETFs em alta → demanda institucional.
// Volume elevado + ETFs em baixa → distribuição institucional.
// ============================================================

import { EtfFlowResult } from "../types/indicator";
import { fetchJson } from "../utils/http";

const ETF_SYMBOLS = ["IBIT", "FBTC", "GBTC", "ARKB"];
const YF_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";

interface YahooChartResponse {
  chart: {
    result: Array<{
      indicators: {
        quote: Array<{
          close: (number | null)[];
          volume: (number | null)[];
        }>;
      };
    }>;
    error?: { message: string };
  };
}

async function fetchEtfDollarVolumes(symbol: string): Promise<number[]> {
  const url = `${YF_BASE}/${symbol}?interval=1d&range=6d`;
  const json = await fetchJson<YahooChartResponse>(url);

  const result = json?.chart?.result?.[0];
  if (!result) throw new Error(`[etf-flows] Sem dados para ${symbol}`);

  const quote = result.indicators.quote[0];
  const closes  = quote.close;
  const volumes = quote.volume;

  return closes.map((c, i) => {
    const v = volumes[i];
    if (c == null || v == null) return 0;
    return c * v;
  });
}

function scoreEtfFlow(volumeRatio: number, etfUp: boolean): number {
  if (volumeRatio >= 2.0) return etfUp ? 2 : -2;
  if (volumeRatio >= 1.5) return etfUp ? 1 : -1;
  return 0;
}

export async function fetchEtfFlow(): Promise<EtfFlowResult> {
  try {
    const allDollarVols = await Promise.all(
      ETF_SYMBOLS.map((sym) => fetchEtfDollarVolumes(sym))
    );

    // Soma diária de dollar volume entre todos os ETFs
    const dayCount = allDollarVols[0].length; // mínimo 6
    const totalByDay: number[] = Array(dayCount).fill(0);
    for (const etfVols of allDollarVols) {
      for (let i = 0; i < dayCount; i++) {
        totalByDay[i] += etfVols[i];
      }
    }

    const todayTotal   = totalByDay[dayCount - 1];
    const prev5d       = totalByDay.slice(0, dayCount - 1);
    const avg5d        = prev5d.reduce((a, b) => a + b, 0) / prev5d.length;
    const volumeRatio  = avg5d > 0 ? todayTotal / avg5d : 1;

    // Direção: retorno médio ponderado dos ETFs no último dia
    const todayReturns = allDollarVols.map((vols, idx) => {
      const prevClose = vols[dayCount - 2];
      const todayClose = vols[dayCount - 1];
      if (!prevClose) return 0;
      return (todayClose - prevClose) / prevClose;
    });
    const avgReturn = todayReturns.reduce((a, b) => a + b, 0) / todayReturns.length;
    const etfUp = avgReturn > 0;

    const score = scoreEtfFlow(volumeRatio, etfUp);
    const totalM = (todayTotal / 1e6).toFixed(0);
    const ratioLabel = volumeRatio.toFixed(2);
    const direction = etfUp ? "↑" : "↓";
    const scoreLabel = score > 0 ? `+${score}` : String(score);

    return {
      status: "success",
      score,
      summary: `$${totalM}M vol ETF ${direction} — ${ratioLabel}× média 5d (${scoreLabel})`,
      value: {
        totalDollarVolUsd: todayTotal,
        avg5dDollarVolUsd: avg5d,
        volumeRatio,
        etfUp,
        score,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[etf-flows] Falha: ${message}`);
    return {
      status: "error",
      score: 0,
      summary: "indisponível (0) — falha ao buscar ETFs",
      error: message,
    };
  }
}
