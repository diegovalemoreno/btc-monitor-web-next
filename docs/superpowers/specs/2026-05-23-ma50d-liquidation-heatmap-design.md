# Design: MA50d + Liquidation Heatmap

**Date:** 2026-05-23  
**Status:** Approved

---

## Overview

Two new indicators added to the signal engine:

1. **MA50d** — extend existing "Médias Móveis" indicator with 50-day moving average
2. **Heatmap Liquidações** — new indicator using Coinglass free-tier API to score liquidation cluster imbalance

---

## Indicator 1: MA50d

### What changes

Extend `moving-averages.adapter.ts` to fetch 50 daily candles alongside the existing 200d and 50w fetches. All three fetches run in `Promise.all` — no additional latency cost.

### Type changes (`lib/types/indicator.ts`)

```ts
// MovingAveragesValue gains two fields:
ma50d:      number
belowMa50d: boolean
```

### Scoring (`lib/domain/score-engine.ts`)

`scoreMovingAverages` gains a third parameter `belowMa50d: boolean`. Adds +1 when true. Max score rises from 2 → 3.

```
belowMa200d → +1
belowMa50w  → +1
belowMa50d  → +1  (new)
```

### Summary format

`MM 50d $X abaixo | MM 200d $X acima | MM 50s $X abaixo`

### Display (`src/components/dashboard/IndicatorGroups.tsx`)

Tooltip for "Médias Móveis" updated to mention MA50d:

> MM 50 dias: média móvel de curto/médio prazo. Preço abaixo = zona de desconto tático. Abaixo das três médias = sinal de compra mais forte.

---

## Indicator 2: Heatmap Liquidações

### Data source

**Coinglass API** (free tier) — requires `COINGLASS_API_KEY` env var.

Endpoint: `GET https://open-api.coinglass.com/public/v2/liquidation_chart?symbol=BTC&interval=12h`  
⚠️ Verificar endpoint exato na documentação da Coinglass após obter a API key — URL e parâmetros podem diferir conforme versão da API (v1/v2/v3).

Response: array of `{ price: number, amount: number }` representing estimated liquidation volume at each price level.

### New file: `lib/adapters/liquidation-heatmap.adapter.ts`

Algorithm:
1. Fetch price-level liquidation data from Coinglass
2. Separate into two buckets: `above` (price > current) and `below` (price < current)
3. Sum top-3 cluster volumes for each side
4. Score:

| Condition | Score |
|-----------|-------|
| `volumeAbove / volumeBelow > 3` | +3 (strong squeeze fuel) |
| `volumeAbove / volumeBelow > 1.5` | +2 |
| `volumeAbove / volumeBelow > 1.1` | +1 |
| Balanced (ratio 0.9–1.1) | 0 |
| `volumeBelow / volumeAbove > 1.5` | −1 (moderate cascade risk) |
| `volumeBelow / volumeAbove > 3` | −2 (high cascade risk) |

Summary format: `Acima $Xm · Abaixo $Xm → squeeze/cascata/neutro (+N)`

Fallback: if `COINGLASS_API_KEY` is absent or API errors → `status: "error"`, score 0, pipeline unaffected.

### New type (`lib/types/indicator.ts`)

```ts
export interface LiquidationHeatmapValue {
  volumeAboveUsd: number
  volumeBelowUsd: number
  ratio:          number
  bias:           'squeeze' | 'cascade' | 'neutral'
  source:         'coinglass'
}
export type LiquidationHeatmapResult = IndicatorResult<LiquidationHeatmapValue>
```

`AllIndicators` gains: `liquidationHeatmap: LiquidationHeatmapResult`

### Pipeline integration (`lib/signal-engine/pipeline.ts`)

- `indicatorsToScores`: add `["Heatmap Liquidações", ind.liquidationHeatmap]`
- `INDICATOR_GROUPS`: add `"Heatmap Liquidações"` to `derivatives` group

### CLI integration (`lib/cli/index.ts`)

- Import `fetchLiquidationHeatmap` from new adapter
- Add to `Promise.all` in `gatherReport()`, passing `btcPrice`
- Add to `indicators` object
- Add `row("Heatmap Liquidações", indicators.liquidationHeatmap)` to CLI output

### Dashboard tooltip (`src/components/dashboard/IndicatorGroups.tsx`)

```
Heatmap Liquidações: estima onde estão concentradas as liquidações forçadas por faixa de preço.

Grande cluster ACIMA = shorts alavancados em risco → potencial squeeze de alta.
Grande cluster ABAIXO = longs alavancados em risco → risco de cascata de queda.
Balanceado = sem pressão direcional clara.
```

### Environment variable

`COINGLASS_API_KEY` — add to:
- `.env.local.example`
- Vercel production (via `vercel env add`)
- Documented in README if exists

---

## Files changed

| File | Change |
|------|--------|
| `lib/types/indicator.ts` | Extend `MovingAveragesValue`; add `LiquidationHeatmapValue`, `LiquidationHeatmapResult`; add `liquidationHeatmap` to `AllIndicators` |
| `lib/adapters/moving-averages.adapter.ts` | Add MA50d fetch + `belowMa50d` derivation |
| `lib/domain/score-engine.ts` | Extend `scoreMovingAverages` with `belowMa50d` param |
| `lib/adapters/liquidation-heatmap.adapter.ts` | New file — Coinglass fetch + cluster scoring |
| `lib/cli/index.ts` | Add `fetchLiquidationHeatmap` to `Promise.all` + output row |
| `lib/signal-engine/pipeline.ts` | Add to `indicatorsToScores` + `INDICATOR_GROUPS.derivatives` |
| `src/components/dashboard/IndicatorGroups.tsx` | Update MA tooltip + add heatmap tooltip |
| `.env.local.example` | Add `COINGLASS_API_KEY=` |

---

## Out of scope

- Visualização gráfica do heatmap (seria um componente separado)
- Ajuste de pesos globais do score total (pode ser feito em iteração futura)
- Alertas baseados em heatmap (pode ser adicionado a `alert-rules.ts` depois)
