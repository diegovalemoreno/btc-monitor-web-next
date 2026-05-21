// ============================================================
// adapters/btc-dominance.adapter.ts
// Dominância do BTC no mercado cripto total (CoinGecko free)
//
// Alta dominância (>60%) = BTC season = contexto favorável.
// Baixa dominância (<45%) = alt season = fase tardia de ciclo.
// ============================================================

import { BtcDominanceResult } from "../types/indicator";
import { fetchJson } from "../utils/http";

const URL = "https://api.coingecko.com/api/v3/global";

interface CoinGeckoGlobal {
  data: {
    market_cap_percentage: Record<string, number>;
    total_market_cap: Record<string, number>;
  };
}

function scoreDominance(pct: number): number {
  if (pct > 60)  return  1; // BTC season — contexto favorável
  if (pct > 45)  return  0; // neutro
  if (pct > 40)  return -1; // alt season — ciclo tardio
  return -2;                  // dominância extremamente baixa — topo de ciclo
}

export async function fetchBtcDominance(): Promise<BtcDominanceResult> {
  try {
    const json = await fetchJson<CoinGeckoGlobal>(URL);
    const pct   = json.data.market_cap_percentage["btc"];
    if (pct == null) throw new Error("Dominância BTC ausente na resposta");

    const score      = scoreDominance(pct);
    const scoreLabel = score > 0 ? `+${score}` : String(score);

    return {
      status: "success",
      score,
      summary: `BTC dominância ${pct.toFixed(1)}% (${scoreLabel})`,
      value: { dominancePct: pct },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[btc-dominance] Falha: ${message}`);
    return { status: "error", score: 0, summary: "indisponível (0)", error: message };
  }
}
