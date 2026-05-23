// ============================================================
// adapters/liquidation-heatmap.adapter.ts
// Fonte: Coinglass free-tier API (coinglassSecret header).
// Estima volume de liquidações acima vs abaixo do preço atual.
//
// Score:
//   volumeAbove >> volumeBelow → squeeze potencial (+1 a +3)
//   volumeBelow >> volumeAbove → cascata risk (−1 a −2)
//   balanceado                 → 0
//
// Fallback: se COINGLASS_API_KEY ausente ou API falhar → score 0.
// ⚠️  Verificar endpoint exato em https://coinglass.com/api após obter key.
// ============================================================

import { LiquidationHeatmapResult } from "../types/indicator";

const COINGLASS_BASE    = "https://open-api.coinglass.com";
const TIMEOUT_MS        = 8_000;

interface CoinglassHeatmapEntry {
  price:  number;
  amount: number;
}

interface CoinglassHeatmapResponse {
  code: string;
  msg:  string;
  data: CoinglassHeatmapEntry[] | null;
}

function scoreBias(volumeAbove: number, volumeBelow: number): number {
  if (volumeAbove <= 0 && volumeBelow <= 0) return 0;

  const ratioAbove = volumeAbove / Math.max(volumeBelow, 1);
  const ratioBelow = volumeBelow / Math.max(volumeAbove, 1);

  if (ratioAbove > 3)   return 3;
  if (ratioAbove > 1.5) return 2;
  if (ratioAbove > 1.1) return 1;
  if (ratioBelow > 3)   return -2;
  if (ratioBelow > 1.5) return -1;
  return 0;
}

function fmtM(usd: number): string {
  if (usd >= 1_000_000_000) return `$${(usd / 1_000_000_000).toFixed(1)}B`;
  if (usd >= 1_000_000)     return `$${(usd / 1_000_000).toFixed(1)}M`;
  if (usd >= 1_000)         return `$${(usd / 1_000).toFixed(1)}K`;
  return `$${usd.toFixed(0)}`;
}

async function fetchWithTimeout(url: string, apiKey: string): Promise<CoinglassHeatmapResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: {
        coinglassSecret: apiKey,
        Accept: "application/json",
      },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return await res.json() as CoinglassHeatmapResponse;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchLiquidationHeatmap(
  currentPrice: number
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
    // ⚠️  Verificar parâmetros exatos na documentação Coinglass após obter key.
    const url  = `${COINGLASS_BASE}/public/v2/liquidation_chart?symbol=BTC&timeType=all`;
    const resp = await fetchWithTimeout(url, apiKey);

    if (resp.code !== "0" || !resp.data?.length) {
      throw new Error(`Coinglass code ${resp.code}: ${resp.msg ?? "no data"}`);
    }

    let volumeAboveUsd = 0;
    let volumeBelowUsd = 0;

    for (const entry of resp.data) {
      if (!isFinite(entry.price) || !isFinite(entry.amount)) continue;
      if (entry.price > currentPrice) {
        volumeAboveUsd += entry.amount;
      } else {
        volumeBelowUsd += entry.amount;
      }
    }

    const ratio = volumeAboveUsd / Math.max(volumeBelowUsd, 1);
    const score = scoreBias(volumeAboveUsd, volumeBelowUsd);
    const scoreLabel = score > 0 ? `+${score}` : `${score}`;

    const bias: "squeeze" | "cascade" | "neutral" =
      score > 0 ? "squeeze" : score < 0 ? "cascade" : "neutral";

    const biasLabel =
      bias === "squeeze" ? "squeeze potencial" :
      bias === "cascade" ? "risco cascata" : "neutro";

    return {
      status: "success",
      score,
      summary: `Acima ${fmtM(volumeAboveUsd)} · Abaixo ${fmtM(volumeBelowUsd)} → ${biasLabel} (${scoreLabel})`,
      value: {
        volumeAboveUsd,
        volumeBelowUsd,
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
