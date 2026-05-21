// ============================================================
// adapters/stablecoin-ratio.adapter.ts
// Stablecoin Supply Ratio (SSR) — poder de compra nas laterais
// Fonte: CoinGecko free API (sem auth)
//
// SSR = market cap BTC / market cap total de stablecoins.
// SSR baixo = muito dinheiro em stablecoin esperando para comprar.
// SSR alto = pouco poder de compra disponível.
// ============================================================

import { StablecoinRatioResult } from "../types/indicator";
import { fetchJson } from "../utils/http";

const URL =
  "https://api.coingecko.com/api/v3/simple/price" +
  "?ids=bitcoin,tether,usd-coin,dai,first-digital-usd" +
  "&vs_currencies=usd&include_market_cap=true";

interface CoinGeckoPrice {
  [id: string]: { usd: number; usd_market_cap: number };
}

function scoreSSR(ssr: number): number {
  if (ssr < 2)  return  2; // enorme poder de compra estável
  if (ssr < 4)  return  1; // significativo poder de compra
  if (ssr < 8)  return  0; // neutro
  if (ssr < 12) return -1; // poder de compra limitado
  return -2;                // muito pouco poder de compra
}

export async function fetchStablecoinRatio(): Promise<StablecoinRatioResult> {
  try {
    const data = await fetchJson<CoinGeckoPrice>(URL);

    const btcMcap = data["bitcoin"]?.usd_market_cap;
    if (!btcMcap) throw new Error("Market cap BTC ausente");

    const stableIds = ["tether", "usd-coin", "dai", "first-digital-usd"];
    const stableMcap = stableIds.reduce((sum, id) => {
      return sum + (data[id]?.usd_market_cap ?? 0);
    }, 0);

    if (stableMcap === 0) throw new Error("Market cap stablecoins zero");

    const ssr        = btcMcap / stableMcap;
    const score      = scoreSSR(ssr);
    const scoreLabel = score > 0 ? `+${score}` : String(score);
    const stableB    = (stableMcap / 1e9).toFixed(0);

    return {
      status: "success",
      score,
      summary: `SSR ${ssr.toFixed(2)} — $${stableB}B em stablecoins (${scoreLabel})`,
      value: { ssr, btcMarketCap: btcMcap, stablecoinMarketCap: stableMcap },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[stablecoin-ratio] Falha: ${message}`);
    return { status: "error", score: 0, summary: "indisponível (0)", error: message };
  }
}
