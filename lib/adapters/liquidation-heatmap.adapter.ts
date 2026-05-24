// adapters/liquidation-heatmap.adapter.ts
// Desabilitado: endpoint Coinglass requer plano pago. Retorna score neutro.

import { LiquidationHeatmapResult } from "../types/indicator";

export async function fetchLiquidationHeatmap(
  _currentPrice: number
): Promise<LiquidationHeatmapResult> {
  return {
    status:  "error",
    score:   0,
    summary: "indisponível (0) — fonte de dados não disponível no plano atual",
    error:   "disabled",
  };
}
