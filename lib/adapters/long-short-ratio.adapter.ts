// ============================================================
// adapters/long-short-ratio.adapter.ts
// Proporção de contas compradas vs vendidas.
// Fonte primária: Binance Futures (bloqueada em Vercel/US).
// Fallback 1: Bybit (retorna 403 de IPs Vercel).
// Fallback 2: OKX (público, sem geo-restrição conhecida).
//
// Ratio > 1.5 = mercado lotado de longs = risco de queda.
// Ratio < 0.7 = mercado lotado de shorts = contrário bullish.
// ============================================================

import { LongShortRatioResult } from "../types/indicator";
import { fetchJson } from "../utils/http";

const BINANCE_URL = "https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=BTCUSDT&period=1h&limit=1";
const BYBIT_URL   = "https://api.bybit.com/v5/market/account-ratio?category=linear&symbol=BTCUSDT&period=1h&limit=1";
const OKX_URL     = "https://www.okx.com/api/v5/rubik/stat/contracts/long-short-account-ratio?ccy=BTC&period=1H&limit=1";

interface BinanceLSResponse {
  longShortRatio: string;
  longAccount:    string;
  shortAccount:   string;
}

interface BybitLSResponse {
  retCode: number;
  result: {
    list: Array<{
      buyRatio:  string;
      sellRatio: string;
    }>;
  };
}

interface OkxLSResponse {
  code: string;
  data: Array<{
    ts:             string;
    longShortRatio: string;
  }>;
}

function scoreLongShort(ratio: number): number {
  if (ratio > 1.8)  return -2;
  if (ratio > 1.5)  return -1;
  if (ratio < 0.56) return  2;
  if (ratio < 0.70) return  1;
  return 0;
}

function buildResult(ratio: number, longPct: number, shortPct: number): LongShortRatioResult {
  const score      = scoreLongShort(ratio);
  const scoreLabel = score > 0 ? `+${score}` : String(score);
  return {
    status: "success",
    score,
    summary: `${ratio.toFixed(2)} (${longPct.toFixed(1)}% longs / ${shortPct.toFixed(1)}% shorts) (${scoreLabel})`,
    value: { ratio, longPct, shortPct },
  };
}

async function fromBinance(): Promise<LongShortRatioResult> {
  const data  = await fetchJson<BinanceLSResponse[]>(BINANCE_URL);
  const entry = data[0];
  if (!entry) throw new Error("Sem dados Binance");

  const ratio    = parseFloat(entry.longShortRatio);
  const longPct  = parseFloat(entry.longAccount)  * 100;
  const shortPct = parseFloat(entry.shortAccount) * 100;
  return buildResult(ratio, longPct, shortPct);
}

async function fromBybit(): Promise<LongShortRatioResult> {
  const data = await fetchJson<BybitLSResponse>(BYBIT_URL);
  if (data.retCode !== 0) throw new Error(`Bybit retCode ${data.retCode}`);

  const entry = data.result?.list?.[0];
  if (!entry) throw new Error("Sem dados Bybit");

  const longPct  = parseFloat(entry.buyRatio)  * 100;
  const shortPct = parseFloat(entry.sellRatio) * 100;
  const ratio    = longPct / shortPct;
  return buildResult(ratio, longPct, shortPct);
}

async function fromOkx(): Promise<LongShortRatioResult> {
  const data = await fetchJson<OkxLSResponse>(OKX_URL);
  if (data.code !== "0") throw new Error(`OKX code ${data.code}`);

  const entry = data.data?.[0];
  if (!entry) throw new Error("Sem dados OKX");

  const ratio    = parseFloat(entry.longShortRatio);
  const longPct  = (ratio / (1 + ratio)) * 100;
  const shortPct = 100 - longPct;
  return buildResult(ratio, longPct, shortPct);
}

export async function fetchLongShortRatio(): Promise<LongShortRatioResult> {
  try {
    return await fromBinance();
  } catch (binanceErr) {
    const binanceMsg = binanceErr instanceof Error ? binanceErr.message : String(binanceErr);
    console.warn(`[long-short-ratio] Binance falhou (${binanceMsg}), tentando Bybit...`);
    try {
      return await fromBybit();
    } catch (bybitErr) {
      const bybitMsg = bybitErr instanceof Error ? bybitErr.message : String(bybitErr);
      console.warn(`[long-short-ratio] Bybit falhou (${bybitMsg}), tentando OKX...`);
      try {
        return await fromOkx();
      } catch (okxErr) {
        const message = okxErr instanceof Error ? okxErr.message : String(okxErr);
        console.warn(`[long-short-ratio] todas as fontes falharam: ${message}`);
        return { status: "error", score: 0, summary: "indisponível (0)", error: message };
      }
    }
  }
}
