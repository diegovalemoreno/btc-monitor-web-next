# MA50d + Liquidation Heatmap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add MA50d to the existing "Médias Móveis" indicator and introduce a new "Heatmap Liquidações" indicator sourced from the Coinglass free-tier API.

**Architecture:** MA50d extends the existing Binance kline fetch (parallel, no latency cost) and adds one boolean to the scoring chain. The heatmap adapter fetches Coinglass liquidation cluster data, scores the volumeAbove/volumeBelow ratio, and slots into the `derivatives` group using the same `IndicatorResult` contract used by every other adapter.

**Tech Stack:** TypeScript, Next.js App Router, Binance public kline API, Coinglass free-tier API (`coinglassSecret` header auth), no test framework (use `npm run type-check` + CLI smoke test as verification).

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `lib/types/indicator.ts` | Modify | Extend `MovingAveragesValue`; add heatmap types; extend `AllIndicators` |
| `lib/domain/weights.ts` | Modify | Add `liquidationHeatmap` to `IndicatorKey` + `WEIGHTS` |
| `lib/domain/score-engine.ts` | Modify | Extend `scoreMovingAverages`; add `liquidationHeatmap` to `calculateTotalScore` |
| `lib/adapters/moving-averages.adapter.ts` | Modify | Add MA50d fetch + `belowMa50d` derivation |
| `lib/adapters/liquidation-heatmap.adapter.ts` | Create | Coinglass fetch, cluster bucketing, score −2…+3 |
| `lib/cli/index.ts` | Modify | Import + call heatmap adapter; add to `Promise.all`, `indicators`, CLI row |
| `lib/signal-engine/pipeline.ts` | Modify | Add heatmap to `indicatorsToScores` + `INDICATOR_GROUPS.derivatives` |
| `src/components/dashboard/IndicatorGroups.tsx` | Modify | Update MA tooltip; add heatmap tooltip |
| `.env.local.example` | Modify | Add `COINGLASS_API_KEY=` |

---

## Task 1: Extend types

**Files:**
- Modify: `lib/types/indicator.ts`

- [ ] **Step 1: Extend `MovingAveragesValue`**

In `lib/types/indicator.ts`, replace:

```ts
export interface MovingAveragesValue {
  ma200d: number;
  ma50w: number;
  currentPrice: number;
  belowMa200d: boolean;
  belowMa50w: boolean;
}
```

with:

```ts
export interface MovingAveragesValue {
  ma50d:       number;
  ma200d:      number;
  ma50w:       number;
  currentPrice: number;
  belowMa50d:  boolean;
  belowMa200d: boolean;
  belowMa50w:  boolean;
}
```

- [ ] **Step 2: Add liquidation heatmap types**

After `export type StablecoinRatioResult = IndicatorResult<StablecoinRatioValue>;`, add:

```ts
export interface LiquidationHeatmapValue {
  volumeAboveUsd: number;
  volumeBelowUsd: number;
  ratio:          number;
  bias:           'squeeze' | 'cascade' | 'neutral';
  source:         'coinglass';
}
export type LiquidationHeatmapResult = IndicatorResult<LiquidationHeatmapValue>;
```

- [ ] **Step 3: Add `liquidationHeatmap` to `AllIndicators`**

In the `AllIndicators` interface, add after `stablecoinRatio`:

```ts
  liquidationHeatmap: LiquidationHeatmapResult;
```

- [ ] **Step 4: Type-check**

```bash
npm run type-check
```

Expected: errors only in files that reference `AllIndicators` or `MovingAveragesValue` (not yet updated). That's expected — continue.

- [ ] **Step 5: Commit**

```bash
git add lib/types/indicator.ts
git commit -m "feat(types): add MA50d fields and LiquidationHeatmap types"
```

---

## Task 2: Update weights

**Files:**
- Modify: `lib/domain/weights.ts`

- [ ] **Step 1: Add `liquidationHeatmap` to `IndicatorKey`**

Replace:

```ts
export type IndicatorKey =
  | "fearGreed"
  | "weeklyCandle"
  | "fundingRate"
  | "sellerPressure"
  | "movingAverages"
  | "openInterest"
  | "mvrv"
  | "realizedPrice"
  | "hashRibbon"
  | "mayerMultiple"
  | "liquidations"
  | "etfFlow"
  | "piCycle"
  | "bollinger"
  | "dxy"
  | "longShortRatio"
  | "btcDominance"
  | "stablecoinRatio"
  | "marketRegime"
  | "compositeSignal";
```

with:

```ts
export type IndicatorKey =
  | "fearGreed"
  | "weeklyCandle"
  | "fundingRate"
  | "sellerPressure"
  | "movingAverages"
  | "openInterest"
  | "mvrv"
  | "realizedPrice"
  | "hashRibbon"
  | "mayerMultiple"
  | "liquidations"
  | "liquidationHeatmap"
  | "etfFlow"
  | "piCycle"
  | "bollinger"
  | "dxy"
  | "longShortRatio"
  | "btcDominance"
  | "stablecoinRatio"
  | "marketRegime"
  | "compositeSignal";
```

- [ ] **Step 2: Add weight for `liquidationHeatmap`**

In the `WEIGHTS` object, after `liquidations: 1.5,` add:

```ts
  liquidationHeatmap: 1.5,
```

- [ ] **Step 3: Commit**

```bash
git add lib/domain/weights.ts
git commit -m "feat(weights): add liquidationHeatmap indicator key and weight 1.5"
```

---

## Task 3: Extend score-engine

**Files:**
- Modify: `lib/domain/score-engine.ts`

- [ ] **Step 1: Update `scoreMovingAverages` signature**

Replace:

```ts
export function scoreMovingAverages(
  belowMa200d: boolean,
  belowMa50w: boolean
): number {
  let score = 0;
  if (belowMa200d) score += 1;
  if (belowMa50w)  score += 1;
  return score;
}
```

with:

```ts
export function scoreMovingAverages(
  belowMa200d: boolean,
  belowMa50w:  boolean,
  belowMa50d:  boolean,
): number {
  let score = 0;
  if (belowMa200d) score += 1;
  if (belowMa50w)  score += 1;
  if (belowMa50d)  score += 1;
  return score;
}
```

- [ ] **Step 2: Add `liquidationHeatmap` to `calculateTotalScore`**

In `calculateTotalScore`, in the `perIndicator` object, add after `compositeSignal`:

```ts
    liquidationHeatmap: indicators.liquidationHeatmap,
```

- [ ] **Step 3: Type-check**

```bash
npm run type-check
```

Expected: errors in `moving-averages.adapter.ts` (scoreMovingAverages call needs new param) and `cli/index.ts` (AllIndicators missing liquidationHeatmap). Continue.

- [ ] **Step 4: Commit**

```bash
git add lib/domain/score-engine.ts
git commit -m "feat(score): extend scoreMovingAverages with belowMa50d; wire liquidationHeatmap to calculateTotalScore"
```

---

## Task 4: Extend moving-averages adapter

**Files:**
- Modify: `lib/adapters/moving-averages.adapter.ts`

- [ ] **Step 1: Replace `fetchMovingAverages` body**

Replace the entire function body to fetch MA50d in parallel:

```ts
export async function fetchMovingAverages(
  currentPrice: number
): Promise<MovingAveragesResult> {
  try {
    const [dailyPrices200, weeklyPrices50, dailyPrices50] = await Promise.all([
      fetchClosePrices("1d", 200),
      fetchClosePrices("1w", 50),
      fetchClosePrices("1d", 50),
    ]);

    const ma200d = average(dailyPrices200);
    const ma50w  = average(weeklyPrices50);
    const ma50d  = average(dailyPrices50);

    const belowMa200d = currentPrice < ma200d;
    const belowMa50w  = currentPrice < ma50w;
    const belowMa50d  = currentPrice < ma50d;

    const score = scoreMovingAverages(belowMa200d, belowMa50w, belowMa50d);

    const parts = [
      `MM 50d $${formatUSD(ma50d)} ${belowMa50d ? "abaixo" : "acima"}`,
      `MM 200d $${formatUSD(ma200d)} ${belowMa200d ? "abaixo" : "acima"}`,
      `MM 50s $${formatUSD(ma50w)} ${belowMa50w ? "abaixo" : "acima"}`,
    ];

    return {
      status: "success",
      score,
      summary: parts.join(" | ") + ` (+${score})`,
      value: {
        ma50d,
        ma200d,
        ma50w,
        currentPrice,
        belowMa50d,
        belowMa200d,
        belowMa50w,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[moving-averages] Falha: ${message}`);

    return {
      status: "error",
      score: 0,
      summary: "indisponível (0) — falha ao buscar dados",
      error: message,
    };
  }
}
```

- [ ] **Step 2: Type-check**

```bash
npm run type-check
```

Expected: no errors in this file. Remaining errors in cli/index.ts (AllIndicators still missing liquidationHeatmap).

- [ ] **Step 3: Commit**

```bash
git add lib/adapters/moving-averages.adapter.ts
git commit -m "feat(indicators): add MA50d to moving-averages adapter"
```

---

## Task 5: Create liquidation-heatmap adapter

**Files:**
- Create: `lib/adapters/liquidation-heatmap.adapter.ts`

- [ ] **Step 1: Create the adapter**

Note: `lib/utils/http.ts` uses Node's `https.get` and does NOT support custom headers. Use global `fetch` (available in Next.js / Node 18+) directly for the Coinglass request.

Create `lib/adapters/liquidation-heatmap.adapter.ts` with the following content:

```ts
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
```

- [ ] **Step 3: Type-check**

```bash
npm run type-check
```

Expected: no errors in this file.

- [ ] **Step 4: Commit**

```bash
git add lib/adapters/liquidation-heatmap.adapter.ts
git commit -m "feat(adapters): add Coinglass liquidation heatmap adapter"
```

---

## Task 6: Integrate into CLI

**Files:**
- Modify: `lib/cli/index.ts`

- [ ] **Step 1: Add import**

At the top of `lib/cli/index.ts`, after the last `import ... from "../adapters/..."` line, add:

```ts
import { fetchLiquidationHeatmap } from "../adapters/liquidation-heatmap.adapter";
```

Also add `LiquidationHeatmapResult` to the types import block:

```ts
import {
  // ... existing types ...
  LiquidationHeatmapResult,
} from "../types/indicator";
```

- [ ] **Step 2: Add to `Promise.all`**

In `gatherReport()`, the `Promise.all` currently ends with `stablecoinRatio`. Add `liquidationHeatmap` at the end of the array (inside the `Promise.all`) and destructure it:

```ts
const [
  fearGreed,
  weeklyCandle,
  fundingRate,
  sellerPressure,
  movingAverages,
  openInterest,
  realizedPrice,
  hashRibbon,
  liquidations,
  etfFlow,
  piCycle,
  bollinger,
  dxy,
  longShortRatio,
  btcDominance,
  stablecoinRatio,
  liquidationHeatmap,          // ← new
] = await Promise.all([
  // ... existing calls unchanged ...
  priceForCalc > 0
    ? fetchLiquidationHeatmap(priceForCalc)
    : Promise.resolve<LiquidationHeatmapResult>({
        status: "error",
        score: 0,
        summary: "indisponível (0) — preço indisponível",
        error: "preço indisponível",
      }),
]);
```

- [ ] **Step 3: Add to `indicators` object**

In the `indicators: AllIndicators = { ... }` block, add after `stablecoinRatio`:

```ts
    liquidationHeatmap,
```

- [ ] **Step 4: Add CLI output row**

In `runMonitor()`, after `push(row("Stablecoin Ratio", indicators.stablecoinRatio));`, add:

```ts
  push(row("Heatmap Liquidações",  indicators.liquidationHeatmap));
```

- [ ] **Step 5: Type-check**

```bash
npm run type-check
```

Expected: zero errors.

- [ ] **Step 6: Commit**

```bash
git add lib/cli/index.ts
git commit -m "feat(cli): wire liquidationHeatmap into gatherReport and CLI output"
```

---

## Task 7: Pipeline integration

**Files:**
- Modify: `lib/signal-engine/pipeline.ts`

- [ ] **Step 1: Add to `indicatorsToScores`**

In `indicatorsToScores`, after `["BTC Dominância", ind.btcDominance]`, add:

```ts
    ["Heatmap Liquidações", ind.liquidationHeatmap],
```

- [ ] **Step 2: Add to `INDICATOR_GROUPS`**

In the `INDICATOR_GROUPS` array, find the `derivatives` entry:

```ts
  {
    key: "derivatives",
    label: "Derivativos",
    names: ["Taxa de Funding", "Open Interest", "Liq. de Longs", "Stablecoin Ratio"],
  },
```

Add `"Heatmap Liquidações"`:

```ts
  {
    key: "derivatives",
    label: "Derivativos",
    names: ["Taxa de Funding", "Open Interest", "Liq. de Longs", "Stablecoin Ratio", "Heatmap Liquidações"],
  },
```

- [ ] **Step 3: Type-check**

```bash
npm run type-check
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add lib/signal-engine/pipeline.ts
git commit -m "feat(pipeline): add Heatmap Liquidações to derivatives group"
```

---

## Task 8: Dashboard tooltips

**Files:**
- Modify: `src/components/dashboard/IndicatorGroups.tsx`

- [ ] **Step 1: Update MA tooltip**

In `INDICATOR_TOOLTIP`, find `'Médias Móveis'` and replace its value with:

```ts
  'Médias Móveis':     'Posição do preço em relação às médias de 50 dias (curto prazo), 200 dias (médio prazo) e 50 semanas (longo prazo).\n\nAbaixo das três médias = zona historicamente barata, rara em ciclos de alta.\nAbaixo da MM50d = desconto tático de curto prazo.\nAcima de todas = mercado aquecido, cuidado com entradas grandes.',
```

- [ ] **Step 2: Add heatmap tooltip**

In `INDICATOR_TOOLTIP`, add after the last entry:

```ts
  'Heatmap Liquidações': 'Estima onde estão concentradas as liquidações forçadas por faixa de preço.\n\nGrande cluster ACIMA = shorts alavancados em risco → potencial squeeze de alta.\nGrande cluster ABAIXO = longs alavancados em risco → risco de cascata de queda.\nBalanceado = sem pressão direcional clara.',
```

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/IndicatorGroups.tsx
git commit -m "feat(dashboard): update MA tooltip with MA50d; add heatmap tooltip"
```

---

## Task 9: Env var + API key setup

**Files:**
- Modify: `.env.local.example`

- [ ] **Step 1: Add env var to example file**

Add to `.env.local.example`:

```
COINGLASS_API_KEY=
```

- [ ] **Step 2: Register free API key**

Go to https://coinglass.com → Sign up → API → generate free key.

- [ ] **Step 3: Verify exact endpoint**

With the key, test the endpoint from the command line:

```bash
curl -s -H "coinglassSecret: YOUR_KEY" \
  "https://open-api.coinglass.com/public/v2/liquidation_chart?symbol=BTC&timeType=all" \
  | head -c 500
```

If the response format differs from `{ code, data: [{price, amount}] }`, update the parsing logic in `lib/adapters/liquidation-heatmap.adapter.ts` accordingly.

- [ ] **Step 4: Add key to Vercel**

```bash
vercel env add COINGLASS_API_KEY production
```

Enter the key when prompted.

- [ ] **Step 5: Commit env example**

```bash
git add .env.local.example
git commit -m "chore: add COINGLASS_API_KEY to env example"
```

---

## Task 10: End-to-end verify + deploy

- [ ] **Step 1: Full type-check**

```bash
npm run type-check
```

Expected: zero errors.

- [ ] **Step 2: Build check**

```bash
npm run build
```

Expected: successful build, no TypeScript errors.

- [ ] **Step 3: Smoke test — heatmap fallback (no key)**

Temporarily unset the key and confirm graceful fallback:

```bash
COINGLASS_API_KEY="" npx tsx lib/cli/index.ts 2>&1 | grep -A1 "Heatmap"
```

Expected output contains: `indisponível (0) — COINGLASS_API_KEY não configurada`

- [ ] **Step 4: Smoke test — MA50d**

```bash
npx tsx lib/cli/index.ts 2>&1 | grep "Médias"
```

Expected output contains: `MM 50d $... | MM 200d $... | MM 50s $...`

- [ ] **Step 5: Smoke test — heatmap with key (after API key is set)**

```bash
npx tsx lib/cli/index.ts 2>&1 | grep "Heatmap"
```

Expected: `Acima $Xm · Abaixo $Xm → [squeeze/risco cascata/neutro] (+N)`

- [ ] **Step 6: Deploy to production**

```bash
vercel --prod
```

- [ ] **Step 7: Final commit (if any remaining changes)**

```bash
git add -A
git commit -m "feat: MA50d + Heatmap Liquidações indicators complete"
git push
```
