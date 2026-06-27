# STH/LTH Realized Price Chart + Custom Date Range Filters

**Date:** 2026-06-27  
**Scope:** New chart on home page + custom date range extension to existing charts

---

## Summary

Three deliverables:

1. **New `SthLthChart` component** — shows BTC Short-Term Holder (STH) Realized Price, Long-Term Holder (LTH) Realized Price, and BTC Spot Price as 3 SVG polylines. Positioned below `OrangeDotsChart` in `DcaResumoView`.
2. **New `/api/sth-lth-prices` route** — fetches STH/LTH/spot data from CoinMetrics Community API, converts to BRL via AwesomeAPI rate, caches 1h.
3. **Custom date range extension** — adds `'custom'` preset to `OrangeDotsChart` and `DcaPatrimonyChart`, reusing the same filter UI pattern from `DcaContributionHistory`.

---

## 1. API Route — `/api/sth-lth-prices`

**File:** `src/app/api/sth-lth-prices/route.ts`

**Data source:** CoinMetrics Community API  
`https://community-api.coinmetrics.io/v4/timeseries/asset-metrics?assets=btc&metrics=RealizedPrice_Adj_STH,RealizedPrice_Adj_LTH,PriceUSD&frequency=1d`

> **Note:** Exact metric names (`RealizedPrice_Adj_STH`, `RealizedPrice_Adj_LTH`) must be verified against the Community API schema during implementation. If unavailable in the free tier, the route returns 503 with a descriptive error — no silent fallback.

**USD/BRL rate:** Fetched from AwesomeAPI (same source already used in the project). Fetched alongside CoinMetrics in `Promise.all`.

**Query params:** none — route always returns full history. `SthLthChart` filters client-side via `useMemo`, consistent with how `OrangeDotsChart` handles `priceHistory`.

**Response shape:**
```typescript
{
  data: Array<{
    date:    string   // "2024-01-15"
    sthUsd:  number
    lthUsd:  number
    spotUsd: number
    sthBrl:  number   // sthUsd * usdBrlRate
    lthBrl:  number
    spotBrl: number
  }>
  usdBrlRate: number
}
```

**Caching:** `export const revalidate = 3600`

**Error handling:**
- CoinMetrics or AwesomeAPI unreachable → 503 `{ error: "..." }`
- Metrics not in free tier (null values in response) → 503 `{ error: "Métricas STH/LTH não disponíveis no plano community" }`

---

## 2. New Component — `SthLthChart`

**File:** `src/components/dca-tactical/SthLthChart.tsx`

**Props:** none — self-contained, fetches own data.

### Internal State

```typescript
period:      '3M' | '6M' | '12M' | 'Todos' | 'custom'  // default: 'Todos'
customFrom:  string   // 'YYYY-MM-DD', committed value
customTo:    string
pendingFrom: string   // staged before user confirms
pendingTo:   string
currency:    'USD' | 'BRL'  // default: 'USD'
data:        SthLthPoint[]
loading:     boolean
error:       string | null
showDropdown: boolean
containerW:  number   // from ResizeObserver, for responsive SVG
tooltip:     { date, sth, lth, spot, x, y } | null
```

### Filter UI

Row above chart with two groups:

**Left — Period dropdown** (same pattern as `DcaContributionHistory`):
- Button shows active preset label + `▾`
- Dropdown lists: `3M`, `6M`, `12M`, `Todo o período`, `Período personalizado`
- Selecting `custom` reveals date range panel (see below)

**Right — Currency toggle:**
- Two pill buttons: `USD` / `BRL`
- Same style as period pills in `OrangeDotsChart` (`var(--surface3)` active bg, `var(--border-strong)` active border)

**Custom date range panel** (visible only when `period === 'custom'`):
- Same markup and style as `DcaContributionHistory`: labeled `<input type="date">` for `Data inicial` and `Data final`, plus `Aplicar` and `Limpar` buttons
- `Aplicar` commits `pendingFrom`/`pendingTo` → `customFrom`/`customTo` and triggers re-filter
- Limpar resets to `'Todos'`

### Chart SVG

Pure SVG, responsive via `ResizeObserver` (same as `OrangeDotsChart`).

**3 polylines:**

| Series | Stroke | Meaning |
|--------|--------|---------|
| STH Realized Price | `#22D3EE` (cyan — fixed, contrasts all 4 themes) | Cost basis of short-term holders |
| LTH Realized Price | `var(--orange)` | Cost basis of long-term holders |
| BTC Spot Price | `var(--text-sec)` opacity 0.6 | Market price reference |

**Y axis:** right side, formatted with `fmtK()` (same helper as `OrangeDotsChart`). Labels show currency prefix `$` (USD) or `R$` (BRL).

**X axis:** year labels for long periods (Todos/12M), monthly labels for 3M/6M. Same adaptive tick logic as `OrangeDotsChart`.

**Tooltip:** appears on `mousemove` over SVG — shows date, STH, LTH, Spot values in selected currency. Style matches `DcaPatrimonyChart` tooltip (surface bg, border-strong, monospace values).

**Legend:** 3 inline items at top of card (colored line segment + label), same row as filter controls.

### States

- **Loading:** full-width `.skeleton` div at chart height (300px)
- **Error:** centered message in `var(--text-muted)` + retry button
- **No data for period:** "Sem dados para o período selecionado." message

### Theme safety

Zero hardcoded colors except `#22D3EE` for STH (verified to contrast on dark `#0a0a0a`, light `#f4f2ee`, orange `#0c0a02`, celeste `#04080f`). All other colors via CSS custom properties.

---

## 3. Extensions to Existing Charts

### OrangeDotsChart (`src/components/dca-tactical/OrangeDotsChart.tsx`)

**Type change:**
```typescript
// Before
type Period = '1A' | '2A' | '3A' | 'Todos'

// After
type Period = '1A' | '2A' | '3A' | 'Todos' | 'custom'
```

**New state:** `customFrom`, `customTo`, `pendingFrom`, `pendingTo` (strings).

**Filter logic in `filteredHistory` useMemo:**
- `'custom'`: slice `priceHistory` where `p.date >= customFrom && p.date <= customTo` (if set)
- Existing `'1A'/'2A'/'3A'/'Todos'` logic unchanged

**UI:** `'Período personalizado'` added as last pill button. When selected, date range panel appears below the pill row (same pattern as above).

**X-axis labels:** existing adaptive logic handles any date range correctly — no changes needed.

### DcaPatrimonyChart (`src/components/dca-tactical/DcaPatrimonyChart.tsx`)

**Type change:**
```typescript
// Before
type Period = '3M' | '6M' | '12M' | 'Todos'

// After
type Period = '3M' | '6M' | '12M' | 'Todos' | 'custom'
```

**New state:** `customFrom`, `customTo`, `pendingFrom`, `pendingTo`.

**`buildChartData` change:** when `period === 'custom'`, derive `cutoffYm` from `customFrom` and `endYm` from `customTo`, then filter `allYms` to `>= cutoffYm && <= endYm`.

**UI:** `'Período personalizado'` added as last button. Same date range panel.

---

## 4. DcaResumoView Wiring

**File:** `src/components/dca-tactical/DcaResumoView.tsx`

One import added, one JSX block added at the end of the column:

```tsx
import SthLthChart from './SthLthChart'

// In render, after OrangeDotsChart block:
<div>
  <SthLthChart />
</div>
```

No prop threading — `SthLthChart` is self-contained.

---

## 5. File Checklist

| File | Change |
|------|--------|
| `src/app/api/sth-lth-prices/route.ts` | **NEW** |
| `src/components/dca-tactical/SthLthChart.tsx` | **NEW** |
| `src/components/dca-tactical/OrangeDotsChart.tsx` | Extend: custom period |
| `src/components/dca-tactical/DcaPatrimonyChart.tsx` | Extend: custom period |
| `src/components/dca-tactical/DcaResumoView.tsx` | Add SthLthChart import + JSX |

---

## 6. Open Questions for Implementation

- Verify exact CoinMetrics Community metric names for STH/LTH realized price (test endpoint before building component)
- If metrics are Pro-only: evaluate Glassnode free tier as fallback (requires `GLASSNODE_API_KEY` env var)
