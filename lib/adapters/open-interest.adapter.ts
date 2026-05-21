// ============================================================
// adapters/open-interest.adapter.ts
// Fonte: OKX v5 — /api/v5/rubik/stat/contracts/open-interest-volume
//
// Adapter retorna apenas dados crus (currentUsd, previousUsd,
// changePercent, windowHours). Score = 0 aqui. Scoring contextual
// (preço + funding) é aplicado em score-engine via
// scoreOpenInterestContextual().
// ============================================================

import { OpenInterestResult } from "../types/indicator";
import { fetchJson } from "../utils/http";

const OKX_BASE = process.env.OKX_BASE_URL ?? "https://www.okx.com";

const CCY = "BTC";
const PERIOD = "1H";
const WINDOW_HOURS = 24;

type OkxOiPair = [string, string, string]; // [ts_ms, oi_usd, vol_usd]

interface OkxOiResponse {
  code: string;
  msg: string;
  data: OkxOiPair[];
}

export async function fetchOpenInterest(): Promise<OpenInterestResult> {
  try {
    const url =
      `${OKX_BASE}/api/v5/rubik/stat/contracts/open-interest-volume` +
      `?ccy=${CCY}&period=${PERIOD}`;
    const data = await fetchJson<OkxOiResponse>(url);

    if (data.code !== "0") {
      throw new Error(`OKX code ${data.code}: ${data.msg}`);
    }

    // OKX retorna mais recente primeiro
    const entries = data.data ?? [];
    if (entries.length < WINDOW_HOURS + 1) {
      throw new Error(
        `Histórico insuficiente: ${entries.length} amostras, precisa ${WINDOW_HOURS + 1}`
      );
    }

    const currentUsd  = parseFloat(entries[0][1]);
    const previousUsd = parseFloat(entries[WINDOW_HOURS][1]);

    if (!isFinite(currentUsd) || !isFinite(previousUsd) || previousUsd === 0) {
      throw new Error("Valores de OI inválidos");
    }

    const changePercent = ((currentUsd - previousUsd) / previousUsd) * 100;
    const sign = changePercent >= 0 ? "+" : "";

    return {
      status: "success",
      score: 0,
      summary: `${sign}${changePercent.toFixed(2)}% em ${WINDOW_HOURS}h`,
      value: { currentUsd, previousUsd, changePercent, windowHours: WINDOW_HOURS },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[open-interest] Falha: ${message}`);

    return {
      status: "error",
      score: 0,
      summary: "indisponível (0) — falha ao buscar dados",
      error: message,
    };
  }
}
