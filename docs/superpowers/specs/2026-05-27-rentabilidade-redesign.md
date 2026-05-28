# Rentabilidade Premium Redesign — Spec

**Date:** 2026-05-27

## Goal

Transform `/rentabilidade` from an administrative table into a premium institutional Bitcoin wealth dashboard. Visual identity matches Dashboard, Resumo, and Alertas pages.

## Design Decisions (brainstormed)

| Decision | Choice |
|---|---|
| Layout | A — Hero wide → Chart full-width → Insights + Heatmap row |
| Chart | B — BTC price curve (gold) + contribution dots overlaid (green/red by return) |
| Heatmap granularity | Individual aportes, calendar grid (rows=years, cols=Jan→Dez) |
| Insights | Rule-based, computed server-side from contribution data |
| Architecture | Server-first: page.tsx fetches history + contributions in parallel |

## Architecture

```
src/app/rentabilidade/page.tsx        (server component — orchestrates fetches)
src/components/rentabilidade/
  RentabilidadeView.tsx               (client shell, receives computed props)
  PatrimonioHero.tsx                  (hero card)
  BtcChart.tsx                        (recharts ComposedChart)
  InsightsPanel.tsx                   (3 computed insight cards)
  AporteHeatmap.tsx                   (calendar grid)
src/app/api/btc-price-history/
  route.ts                            (new — Binance candles, revalidate 1h)
lib/rentabilidade/
  compute.ts                          (pure functions: computePatrimonio, computeInsights, computeHeatmap)
```

## Data Flow

`page.tsx` runs two fetches in parallel:
1. `listDcaContributions()` — existing Supabase call
2. `fetch('/api/btc-price-history')` — new route, returns `{ date: string, price: number }[]`

After both resolve, `page.tsx` calls `computePatrimonio(contributions, btcPriceHistory)` which returns `PatrimonioData` — a single serializable object passed to `RentabilidadeView` as props.

`RentabilidadeView` renders the four sub-components using only the pre-computed data. No client-side fetching except live BTC price for the hero sparkline (already exists in `/api/btc-price-brl`).

## API Route: `/api/btc-price-history`

- Fetches Binance `BTCBRL` 1d candles, 1100 limit (~3 years)
- Falls back to `BTCUSDT` × BRL rate if BTCBRL unavailable
- Returns `{ history: { date: string; price: number }[] }`
- Next.js `revalidate: 3600`
- Reuses `fetchJson` util already in `lib/utils/http.ts`

## Computed Data Shape

```ts
interface PatrimonioData {
  // Hero
  currentValue: number          // totalBtc * currentBtcPrice
  totalInvested: number         // sum of contribution.amount
  totalReturn: number           // (currentValue / totalInvested - 1) * 100
  totalReturnBrl: number        // currentValue - totalInvested
  avgPrice: number              // totalInvested / totalBtcSats * 1e8
  totalBtc: number              // sum of sats_purchased / 1e8
  contributionCount: number

  // Chart
  priceHistory: { date: string; price: number }[]   // from Binance
  contributions: ContributionPoint[]

  // Heatmap
  heatmap: HeatmapCell[]        // one per contribution

  // Insights
  insights: InsightData
}

interface ContributionPoint {
  date: string
  btcPriceBrl: number           // price at time of purchase
  returnPct: number             // (currentPrice / btcPriceBrl - 1) * 100
  amountBrl: number
  btcAmount: number
}

interface HeatmapCell {
  year: number
  month: number                 // 1-12
  returnPct: number
  date: string
  amountBrl: number
}

interface InsightData {
  bestContribution: { date: string; returnPct: number; month: string }
  worstContribution: { date: string; returnPct: number; month: string }
  profitableCount: number       // contributions with returnPct > 0
  dcaVsLumpSum: number          // DCA return% - hypothetical Jan/22 lump sum return%
}
```

## Components

### PatrimonioHero

Dark gradient card (`linear-gradient(135deg, #0c1a24, #112233, #0c1a24)`), gold top glow (`radial-gradient`), gold border (`rgba(251,191,36,0.2)`).

Content:
- Label: "Patrimônio Bitcoin" (uppercase, gold, letter-spacing)
- Main value: `R$ XXX.XXX` (32px, weight 900)
- Return badge: `▲ +218%` (green) + `+R$ XXX.XXX total` (muted)
- KPI row (4 cols, border-top separator): Preço médio DCA · BTC acumulado · Total investido · Aportes
- Right side: micro sparkline SVG (live BTC price from existing `/api/btc-price-brl`) + current price label

### BtcChart

`recharts` `ComposedChart` with:
- `Area`: `priceHistory` data, gold stroke (`#fbbf24`), subtle gold fill gradient
- `Scatter`: `contributions` data, each dot colored by `returnPct`:
  - `returnPct < 0` → `#ef4444`
  - `0 ≤ returnPct < 50` → `#4ade80`
  - `50 ≤ returnPct < 150` → `#22c55e`
  - `returnPct ≥ 150` → `#dcfce7` (near-white green)
- Custom `Tooltip` on scatter: date, returnPct, amountBrl, btcAmount
- Dashed horizontal line at `avgPrice`
- Legend: "— Preço BTC · ● Em lucro · ● Em prejuízo"
- X axis: monthly ticks, year labels
- Dark background, subtle grid lines

### InsightsPanel

Three insight cards in a column inside the bottom-left panel:

1. **Melhor aporte** — `bestContribution.month · +X%` (green), subtitle "Capturou o fundo do ciclo"
2. **DCA eficiente** — `X de Y aportes em lucro` (white), subtitle "X% taxa de acerto"
3. **DCA vs compra única** — `DCA gerou +X% extra` (gold) vs lump sum Jan first contribution date

Each card separated by a `1px solid rgba(255,255,255,0.05)` divider.

### AporteHeatmap

Fixed-size calendar grid:
- Rows = distinct years in `heatmap` data (2022, 2023, 2024, 2025…)
- Columns = 12 months (Jan→Dez), fixed labels header row
- Year label at left (32px column)
- Each cell: `height: 22px`, `border-radius: 3px`
  - Empty month (no contribution): `background: rgba(255,255,255,0.06)`
  - With contribution: background color mapped from `returnPct`:
    - `< 0` → `#7f1d1d` to `#991b1b`
    - `0–50` → `#166534` to `#15803d`
    - `50–100` → `#16a34a` to `#22c55e`
    - `100–150` → `#4ade80` to `#86efac`
    - `> 150` → `#bbf7d0` to `#dcfce7`
  - Text inside cell: `returnPct` formatted as `+X%` or `-X%`, `font-size: 6px`
  - Text color: white for dark cells, `rgba(0,0,0,0.75)` for bright cells
- Gradient legend below: Prejuízo → Lucro

## Styling

- Inline CSS only (consistent with `DimensionCard`, `InsightsPanel`, etc.)
- CSS vars: `--surface`, `--surface2`, `--border-dim`, `--text`, `--text-muted`
- No Tailwind classes
- `border-radius: 12px` for main cards, `8px` for inner sections
- Gap between sections: `14px`
- Page padding: matches existing `RentabilidadeView` layout

## Compute Functions (`lib/rentabilidade/compute.ts`)

All pure functions, no side effects, fully testable:

```ts
computePatrimonio(contributions, priceHistory, currentBtcPrice): PatrimonioData
computeInsights(contributions, currentBtcPrice): InsightData
buildHeatmapCells(contributions, currentBtcPrice): HeatmapCell[]
buildContributionPoints(contributions, currentBtcPrice): ContributionPoint[]
colorForReturn(returnPct: number): string
textColorForReturn(returnPct: number): string
```

## Out of Scope

- AI-generated insights (future)
- Multi-currency support
- PDF export
- Editing/deleting contributions from this page
