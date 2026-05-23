// ============================================================
// adapters/liquidation-heatmap.adapter.ts
// Fonte: Coinglass v4 API — /api/futures/liquidation/history
// Agrega últimos 7 períodos de liquidações BTC (long vs short).
//
// Score:
//   shorts liquidados >> longs → squeeze ativo (+1 a +3)
//   longs liquidados >> shorts → cascata de venda (−1 a −2)
//   balanceado                 → 0
//
// Fallback: se COINGLASS_API_KEY ausente ou API falhar → score 0.
// ============================================================

import { LiquidationHeatmapResult } from "../types/indicator";

const COINGLASS_BASE = "https://open-api-v4.coinglass.com";
const TIMEOUT_MS     = 8_000;
const WINDOW_PERIODS = 7;

interface CoinglassLiqEntry {
  time:                 number;
  long_liquidation_usd:  string;
  short_liquidation_usd: string;
}

interface CoinglassLiqResponse {
  code: string;
  msg:  string;
  data: CoinglassLiqEntry[] | null;
}

function scoreBias(shortsUsd: number, longsUsd: number): number {
  if (shortsUsd <= 0 && longsUsd <= 0) return 0;

  const ratioShorts = shortsUsd / Math.max(longsUsd, 1);
  const ratioLongs  = longsUsd  / Math.max(shortsUsd, 1);

  if (ratioShorts > 3)   return 3;
  if (ratioShorts > 1.5) return 2;
  if (ratioShorts > 1.1) return 1;
  if (ratioLongs  > 3)   return -2;
  if (ratioLongs  > 1.5) return -1;
  return 0;
}

function fmtM(usd: number): string {
  if (usd >= 1_000_000_000) return `$${(usd / 1_000_000_000).toFixed(1)}B`;
  if (usd >= 1_000_000)     return `$${(usd / 1_000_000).toFixed(1)}M`;
  if (usd >= 1_000)         return `$${(usd / 1_000).toFixed(1)}K`;
  return `$${usd.toFixed(0)}`;
}

async function fetchWithTimeout(url: string, apiKey: string): Promise<CoinglassLiqResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: {
        "CG-API-KEY": apiKey,
        Accept:        "application/json",
      },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return await res.json() as CoinglassLiqResponse;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchLiquidationHeatmap(
  _currentPrice: number
): Promise<LiquidationHeatmapResult> {
  const apiKey = process.env.COINGLASS_API_KEY;

  if (!apiKey) {
    return {
      status:  "error",
      score:   0,
      summary: "indisponível (0) — COINGLASS_API_KEY não configurada",
      error:   "COINGLASS_API_KEY not set",
    };
  }

  try {
    const url  = `${COINGLASS_BASE}/api/futures/liquidation/history?symbol=BTC&interval=1d`;
    const resp = await fetchWithTimeout(url, apiKey);

    if (resp.code !== "0" || !resp.data?.length) {
      throw new Error(`Coinglass code ${resp.code}: ${resp.msg ?? "no data"}`);
    }

    // Últimos N períodos
    const recent = resp.data.slice(-WINDOW_PERIODS);

    let shortsUsd = 0;
    let longsUsd  = 0;

    for (const entry of recent) {
      const s = parseFloat(entry.short_liquidation_usd);
      const l = parseFloat(entry.long_liquidation_usd);
      if (isFinite(s)) shortsUsd += s;
      if (isFinite(l)) longsUsd  += l;
    }

    const ratio      = shortsUsd / Math.max(longsUsd, 1);
    const score      = scoreBias(shortsUsd, longsUsd);
    const scoreLabel = score > 0 ? `+${score}` : `${score}`;

    const bias: "squeeze" | "cascade" | "neutral" =
      score > 0 ? "squeeze" : score < 0 ? "cascade" : "neutral";

    const biasLabel =
      bias === "squeeze" ? "squeeze ativo" :
      bias === "cascade" ? "cascata longs" : "neutro";

    return {
      status: "success",
      score,
      summary: `Shorts liq ${fmtM(shortsUsd)} · Longs liq ${fmtM(longsUsd)} → ${biasLabel} (${scoreLabel})`,
      value: {
        volumeAboveUsd: shortsUsd,
        volumeBelowUsd: longsUsd,
        ratio,
        bias,
        source: "coinglass",
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[liquidation-heatmap] Falha: ${message}`);
    return {
      status:  "error",
      score:   0,
      summary: "indisponível (0) — falha ao buscar dados",
      error:   message,
    };
  }
}
