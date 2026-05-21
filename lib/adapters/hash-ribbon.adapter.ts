// ============================================================
// adapters/hash-ribbon.adapter.ts
// Fonte: mempool.space — /api/v1/mining/hashrate/3y
// Calcula MA30d vs MA60d do hashrate.
//
// Regras:
//   MA30 < MA60                          → "capitulation" → +1
//   MA30 cruzou de volta acima MA60      → "recovery"     → +2
//                                           (proxy: estado anterior era capitulation)
//   demais                                → "neutral"      → 0
//
// Como capturamos um snapshot, usamos heurística:
//   - capitulation se MA30 < MA60 hoje
//   - recovery se MA30 ≥ MA60 hoje E ≤ 14 dias atrás estava em capitulation
// ============================================================

import { HashRibbonResult, HashRibbonValue } from "../types/indicator";
import { fetchJson } from "../utils/http";

const BASE =
  process.env.MEMPOOL_SPACE_URL ?? "https://mempool.space";

interface MempoolHashrateEntry {
  timestamp: number;
  avgHashrate: number;
}

interface MempoolHashrateResponse {
  hashrates: MempoolHashrateEntry[];
}

const RECOVERY_LOOKBACK_DAYS = 14;

function movingAverage(values: number[], window: number): number {
  if (values.length < window) return NaN;
  const slice = values.slice(values.length - window);
  return slice.reduce((s, v) => s + v, 0) / window;
}

export function scoreHashRibbon(state: HashRibbonValue["state"]): number {
  if (state === "recovery")     return 2;
  if (state === "capitulation") return 1;
  return 0;
}

const STATE_PT: Record<HashRibbonValue["state"], string> = {
  capitulation: "capitulação",
  recovery:     "recuperação",
  neutral:      "neutro",
};

export async function fetchHashRibbon(): Promise<HashRibbonResult> {
  try {
    const data = await fetchJson<MempoolHashrateResponse>(
      `${BASE}/api/v1/mining/hashrate/3y`
    );

    const series = (data.hashrates ?? [])
      .map((h) => h.avgHashrate)
      .filter((v) => isFinite(v) && v > 0);

    if (series.length < 60) {
      throw new Error(`Histórico insuficiente: ${series.length} amostras`);
    }

    const ma30 = movingAverage(series, 30);
    const ma60 = movingAverage(series, 60);

    if (!isFinite(ma30) || !isFinite(ma60)) {
      throw new Error("MA inválida");
    }

    let state: HashRibbonValue["state"];
    if (ma30 < ma60) {
      state = "capitulation";
    } else {
      // Olha N dias atrás: se naquele momento ma30 < ma60, agora é "recovery"
      const lookbackEnd = series.length - RECOVERY_LOOKBACK_DAYS;
      if (lookbackEnd >= 60) {
        const past = series.slice(0, lookbackEnd);
        const pastMa30 = movingAverage(past, 30);
        const pastMa60 = movingAverage(past, 60);
        state = pastMa30 < pastMa60 ? "recovery" : "neutral";
      } else {
        state = "neutral";
      }
    }

    const score = scoreHashRibbon(state);
    const scoreLabel = score > 0 ? `+${score}` : "0";

    return {
      status: "success",
      score,
      summary: `MM30/MM60 → ${STATE_PT[state]} (${scoreLabel})`,
      value: { ma30, ma60, state },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[hash-ribbon] Falha: ${message}`);

    return {
      status: "error",
      score: 0,
      summary: "indisponível (0) — falha ao buscar dados",
      error: message,
    };
  }
}
