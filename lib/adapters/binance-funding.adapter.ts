// ============================================================
// adapters/binance-funding.adapter.ts
// Fonte: OKX v5 — Funding Rate do BTC-USDT-SWAP (perpetual).
// Nome do arquivo preservado por compat; provider é OKX.
// ============================================================

import { FundingRateResult } from "../types/indicator";
import { scoreFundingRate } from "../domain/score-engine";
import { fetchJson } from "../utils/http";

const OKX_BASE = process.env.OKX_BASE_URL ?? "https://www.okx.com";

const INST_ID = "BTC-USDT-SWAP";

interface OkxFundingEntry {
  instId: string;
  fundingRate: string;
  fundingTime: string;
}

interface OkxFundingResponse {
  code: string;
  msg: string;
  data: OkxFundingEntry[];
}

export async function fetchFundingRate(): Promise<FundingRateResult> {
  try {
    const url = `${OKX_BASE}/api/v5/public/funding-rate?instId=${INST_ID}`;
    const data = await fetchJson<OkxFundingResponse>(url);

    if (data.code !== "0") {
      throw new Error(`OKX code ${data.code}: ${data.msg}`);
    }

    const entry = data.data?.[0];
    if (!entry) {
      throw new Error("Nenhum dado de funding retornado");
    }

    const rate = parseFloat(entry.fundingRate);
    const score = scoreFundingRate(rate);
    const ratePercent = (rate * 100).toFixed(4);
    const scoreLabel = score > 0 ? `+${score}` : "0";

    return {
      status: "success",
      score,
      summary: `${ratePercent}% (${scoreLabel})`,
      value: { rate, symbol: INST_ID },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[okx-funding] Falha: ${message}`);

    return {
      status: "error",
      score: 0,
      summary: "indisponível (0) — falha ao buscar dados",
      error: message,
    };
  }
}
