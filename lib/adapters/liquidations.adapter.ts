// ============================================================
// adapters/liquidations.adapter.ts
// Fonte: OKX v5 — /api/v5/public/liquidation-orders
// Agrega liquidações recentes em SWAP BTC-USDT (até 100 entries).
//
// Regras (longs vs shorts):
//   ratio long/short > 1  → +1 (longs sendo limpos)
//   ratio > 3             → +2 (muito acima)
//   ratio > 5 + > $20M    → +3 (evento extremo)
//
// Falha graciosa: se OKX recusar / mudar contrato, retorna unknown.
// Estrutura pronta pra integração futura com outras fontes.
// ============================================================

import { LiquidationsResult } from "../types/indicator";
import { fetchJson } from "../utils/http";

const OKX_BASE = process.env.OKX_BASE_URL ?? "https://www.okx.com";

const INST_TYPE = "SWAP";
const INST_FAMILY = "BTC-USDT";
const LIMIT = 100;
const WINDOW_MINUTES = 60;

// OKX BTC-USDT-SWAP usa ctVal = 0.01 BTC por contrato (linear, USDT-margined).
// Notional USD = numContracts × 0.01 × bkPx. Sem isso, sz é tratado
// erroneamente como quantidade em BTC e a notional fica ~100x inflada.
const CONTRACT_VALUE_BTC = 0.01;

interface OkxLiqDetail {
  side: string;     // 'buy' / 'sell'
  posSide?: string; // 'long' / 'short' (modo netted pode vir vazio)
  sz: string;       // tamanho em contratos
  bkPx: string;     // bankruptcy price
  bkLoss: string;
  ts: string;       // ms
}

interface OkxLiqEntry {
  instId: string;
  details: OkxLiqDetail[];
}

interface OkxLiqResponse {
  code: string;
  msg: string;
  data: OkxLiqEntry[];
}

export function scoreLiquidations(
  longsUsd: number,
  shortsUsd: number
): number {
  if (longsUsd <= 0 && shortsUsd <= 0) return 0;
  const ratio = longsUsd / Math.max(shortsUsd, 1);
  const totalLongs = longsUsd;

  if (ratio > 5 && totalLongs > 20_000_000) return 3;
  if (ratio > 3) return 2;
  if (ratio > 1) return 1;
  return 0;
}

export async function fetchLiquidations(): Promise<LiquidationsResult> {
  try {
    const url =
      `${OKX_BASE}/api/v5/public/liquidation-orders` +
      `?instType=${INST_TYPE}&instFamily=${INST_FAMILY}` +
      `&state=filled&limit=${LIMIT}`;

    const resp = await fetchJson<OkxLiqResponse>(url);

    if (resp.code !== "0") {
      throw new Error(`OKX code ${resp.code}: ${resp.msg}`);
    }

    const cutoffMs = Date.now() - WINDOW_MINUTES * 60_000;
    let longsUsd = 0;
    let shortsUsd = 0;

    for (const entry of resp.data ?? []) {
      for (const detail of entry.details ?? []) {
        const ts = parseInt(detail.ts, 10);
        if (!isFinite(ts) || ts < cutoffMs) continue;

        const contracts = parseFloat(detail.sz);
        const bkPx = parseFloat(detail.bkPx);
        if (!isFinite(contracts) || !isFinite(bkPx)) continue;

        const usd = contracts * CONTRACT_VALUE_BTC * bkPx;
        const sideHint = (detail.posSide || detail.side || "").toLowerCase();

        // posSide 'long' = posição long foi liquidada
        // sem posSide, 'sell' (mercado vendeu pra fechar long) → long liquidado
        if (sideHint === "long" || sideHint === "sell") {
          longsUsd += usd;
        } else if (sideHint === "short" || sideHint === "buy") {
          shortsUsd += usd;
        }
      }
    }

    const score = scoreLiquidations(longsUsd, shortsUsd);
    const scoreLabel = score > 0 ? `+${score}` : "0";

    const summary =
      longsUsd === 0 && shortsUsd === 0
        ? `sem dados na janela de ${WINDOW_MINUTES}min (${scoreLabel})`
        : `L $${fmtM(longsUsd)} · S $${fmtM(shortsUsd)} (${scoreLabel})`;

    return {
      status: "success",
      score,
      summary,
      value: {
        longLiquidationsUsd: longsUsd,
        shortLiquidationsUsd: shortsUsd,
        windowMinutes: WINDOW_MINUTES,
        source: "OKX",
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[liquidations] Falha: ${message}`);

    return {
      status: "error",
      score: 0,
      summary: "indisponível (0) — falha ao buscar dados",
      error: message,
    };
  }
}

function fmtM(usd: number): string {
  if (usd >= 1_000_000) return `${(usd / 1_000_000).toFixed(1)}M`;
  if (usd >= 1_000) return `${(usd / 1_000).toFixed(1)}K`;
  return usd.toFixed(0);
}
