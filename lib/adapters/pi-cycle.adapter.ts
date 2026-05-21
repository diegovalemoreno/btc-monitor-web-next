// ============================================================
// adapters/pi-cycle.adapter.ts
// Pi Cycle Top Indicator — 111DMA vs 2×350DMA
// Fonte: Binance klines diários (público, sem auth)
//
// Historicamente, 111DMA cruzando acima de 2×350DMA coincide
// com topos de ciclo BTC (2013, 2017, 2021).
// Quanto mais próximo do cruzamento, maior o risco de topo.
// ============================================================

import { PiCycleResult } from "../types/indicator";
import { fetchJson } from "../utils/http";
import { formatUSD } from "../utils/date";

const BINANCE_BASE =
  process.env.BINANCE_BASE_URL ?? "https://data-api.binance.vision";

async function fetchDailyCloses(limit: number): Promise<number[]> {
  const url = `${BINANCE_BASE}/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=${limit}`;
  const klines = await fetchJson<[number, string, string, string, string, ...unknown[]][]>(url);
  return klines.map((k) => parseFloat(k[4]));
}

function average(prices: number[]): number {
  return prices.reduce((a, b) => a + b, 0) / prices.length;
}

function scorePiCycle(ma111: number, doubledMa350: number): number {
  const ratio = ma111 / doubledMa350;
  if (ratio >= 1.0)  return -2; // cruzamento ativo — topo histórico
  if (ratio >= 0.95) return -1; // dentro de 5% — alerta de topo
  if (ratio >= 0.80) return  0; // zona neutra
  return 1;                      // longe do cruzamento — seguro
}

export async function fetchPiCycle(currentPrice: number): Promise<PiCycleResult> {
  try {
    const closes = await fetchDailyCloses(350);

    const ma111     = average(closes.slice(-111));
    const ma350     = average(closes.slice(-350));
    const doubled   = ma350 * 2;
    const ratio     = ma111 / doubled;
    const gapPct    = ((doubled - ma111) / doubled) * 100;
    const crossed   = ma111 >= doubled;
    const score     = scorePiCycle(ma111, doubled);
    const scoreLabel = score > 0 ? `+${score}` : String(score);

    const state = crossed
      ? "CRUZAMENTO ATIVO"
      : gapPct < 5
        ? "próximo do cruzamento"
        : "longe do cruzamento";

    return {
      status: "success",
      score,
      summary: `111DMA $${formatUSD(ma111)} vs 2×350DMA $${formatUSD(doubled)} — ${state} (${scoreLabel})`,
      value: {
        ma111,
        ma350,
        doubledMa350: doubled,
        ratio,
        gapPct,
        crossed,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[pi-cycle] Falha: ${message}`);
    return {
      status: "error",
      score: 0,
      summary: "indisponível (0) — falha ao buscar dados",
      error: message,
    };
  }
}
