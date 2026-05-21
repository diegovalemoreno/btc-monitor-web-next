// ============================================================
// adapters/seller-pressure.adapter.ts
// Fonte: OKX v5 — /api/v5/rubik/stat/contracts/long-short-account-ratio
// Proxy de pressão vendedora via ratio long/short accounts (BTC).
// Thresholds:
//   - ratio < 0.90: sellers dominando        → +1
//   - ratio < 0.80: sellers esmagando         → +2
// ============================================================

import { SellerPressureResult } from "../types/indicator";
import { fetchJson } from "../utils/http";

const OKX_BASE = process.env.OKX_BASE_URL ?? "https://www.okx.com";

const CCY = "BTC";
const PERIOD = "5m";
const SAMPLES = 12;

const THRESHOLD_MODERATE = 0.9;
const THRESHOLD_EXTREME  = 0.8;

type OkxRatioPair = [string, string];

interface OkxRatioResponse {
  code: string;
  msg: string;
  data: OkxRatioPair[];
}

export function scoreSellerPressure(ratio: number): number {
  if (ratio < THRESHOLD_EXTREME)  return 2;
  if (ratio < THRESHOLD_MODERATE) return 1;
  return 0;
}

export async function fetchSellerPressure(): Promise<SellerPressureResult> {
  try {
    const url =
      `${OKX_BASE}/api/v5/rubik/stat/contracts/long-short-account-ratio` +
      `?ccy=${CCY}&period=${PERIOD}`;

    const data = await fetchJson<OkxRatioResponse>(url);

    if (data.code !== "0") {
      throw new Error(`OKX code ${data.code}: ${data.msg}`);
    }

    const entries = (data.data ?? []).slice(0, SAMPLES);
    if (entries.length === 0) {
      throw new Error("Resposta vazia da API long-short-account-ratio");
    }

    const ratios = entries.map(([, r]) => parseFloat(r));
    const avgRatio = ratios.reduce((s, r) => s + r, 0) / ratios.length;
    const score = scoreSellerPressure(avgRatio);

    const pressure =
      avgRatio < THRESHOLD_EXTREME  ? "Extrema"  :
      avgRatio < THRESHOLD_MODERATE ? "Moderada" :
      "Normal";

    const scoreLabel = score > 0 ? `+${score}` : "0";

    return {
      status: "success",
      score,
      summary: `Razão ${avgRatio.toFixed(3)} — ${pressure} (${scoreLabel})`,
      value: { avgRatio, samples: entries.length, pressure },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[seller-pressure] Falha: ${message}`);

    return {
      status: "error",
      score: 0,
      summary: "indisponível (0) — falha ao buscar dados",
      error: message,
    };
  }
}
