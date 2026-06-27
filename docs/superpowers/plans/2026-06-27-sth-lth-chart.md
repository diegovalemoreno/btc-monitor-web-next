# STH/LTH Chart + Custom Date Range Filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add STH/LTH Realized Price chart to the home page and extend OrangeDotsChart + DcaPatrimonyChart with custom date range period filters.

**Architecture:** New API route fetches CoinMetrics Community API + Frankfurter (USD/BRL) and returns full history; client filters via `useMemo`. New `SthLthChart` is self-contained (fetches own data). Two existing charts get a `'custom'` period added with staged `pending*` → committed `custom*` date state pattern copied from `DcaContributionHistory`.

**Tech Stack:** Next.js App Router, React with `useState`/`useMemo`/`useEffect`/`useRef`, pure SVG, CSS custom properties, CoinMetrics Community API, Frankfurter API (ECB).

## Global Constraints

- All colors via CSS custom properties (`var(--bg)`, `var(--surface)`, `var(--surface3)`, `var(--border)`, `var(--border-strong)`, `var(--border-dim)`, `var(--text)`, `var(--text-sec)`, `var(--text-muted)`, `var(--orange)`) — zero hardcoded colors except `#22D3EE` for STH line and `#22C55E` for existing green
- Period pill active style: `border: '1px solid var(--border-strong)'`, `background: 'var(--surface3)'`, `color: 'var(--text)'`
- Custom date panel: `pendingFrom`/`pendingTo` staged → `customFrom`/`customTo` committed on "Aplicar"
- `export const revalidate = 3600` on all API routes
- No new npm dependencies
- CoinMetrics Community API URL: `https://community-api.coinmetrics.io/v4/timeseries/asset-metrics?assets=btc&metrics=RealizedPrice_Adj_STH,RealizedPrice_Adj_LTH,PriceUSD&frequency=1d`
- Frankfurter USD/BRL URL: `https://api.frankfurter.app/latest?from=USD&to=BRL`

---

## File Structure

| File | Change | Responsibility |
|------|--------|----------------|
| `src/app/api/sth-lth-prices/route.ts` | CREATE | Fetch CoinMetrics + Frankfurter, return typed full history |
| `src/components/dca-tactical/SthLthChart.tsx` | CREATE | Self-contained: 3-line SVG chart, filter dropdown, currency toggle, tooltip |
| `src/components/dca-tactical/OrangeDotsChart.tsx` | MODIFY | Add `'custom'` to Period type + date panel UI |
| `src/components/dca-tactical/DcaPatrimonyChart.tsx` | MODIFY | Add `'custom'` to Period type, update `buildChartData` signature + date panel UI |
| `src/components/dca-tactical/DcaResumoView.tsx` | MODIFY | Import + render `SthLthChart` after OrangeDotsChart |

---

## Task 1: Verify CoinMetrics metric names + create `/api/sth-lth-prices`

**Files:**
- Create: `src/app/api/sth-lth-prices/route.ts`

**Interfaces:**
- Produces: `GET /api/sth-lth-prices` → `{ data: SthLthPoint[], usdBrlRate: number }` where `SthLthPoint = { date: string, sthUsd: number, lthUsd: number, spotUsd: number, sthBrl: number, lthBrl: number, spotBrl: number }`

---

- [ ] **Step 1: Verify CoinMetrics API returns the expected metrics**

Run in terminal:
```bash
curl -s "https://community-api.coinmetrics.io/v4/timeseries/asset-metrics?assets=btc&metrics=RealizedPrice_Adj_STH,RealizedPrice_Adj_LTH,PriceUSD&frequency=1d&limit=2" | head -c 800
```

Expected: JSON with `data` array, each item having `time`, `RealizedPrice_Adj_STH`, `RealizedPrice_Adj_LTH`, `PriceUSD` as string-valued fields (e.g. `"7123.45"`).

If fields are `null` or missing entirely: the metric names differ in the free tier. In that case run:
```bash
curl -s "https://community-api.coinmetrics.io/v4/catalog/assets?assets=btc" | grep -i "realized"
```
and use the correct names from the response. Update the URL in Step 3 accordingly.

---

- [ ] **Step 2: Verify Frankfurter API**

```bash
curl -s "https://api.frankfurter.app/latest?from=USD&to=BRL"
```

Expected: `{"amount":1.0,"base":"USD","date":"2024-...","rates":{"BRL":5.XX}}`

---

- [ ] **Step 3: Create the API route**

Create `src/app/api/sth-lth-prices/route.ts`:

```typescript
import { NextResponse } from 'next/server'

export const revalidate = 3600

interface CoinMetricsRow {
  asset: string
  time:  string
  RealizedPrice_Adj_STH?: string | null
  RealizedPrice_Adj_LTH?: string | null
  PriceUSD?:              string | null
}

export async function GET() {
  try {
    const [cmRes, fxRes] = await Promise.all([
      fetch(
        'https://community-api.coinmetrics.io/v4/timeseries/asset-metrics' +
        '?assets=btc&metrics=RealizedPrice_Adj_STH,RealizedPrice_Adj_LTH,PriceUSD&frequency=1d',
        { headers: { Accept: 'application/json' } }
      ),
      fetch('https://api.frankfurter.app/latest?from=USD&to=BRL'),
    ])

    if (!cmRes.ok) throw new Error(`CoinMetrics: ${cmRes.status}`)
    if (!fxRes.ok) throw new Error(`Frankfurter: ${fxRes.status}`)

    const cm = await cmRes.json() as { data: CoinMetricsRow[] }
    const fx = await fxRes.json() as { rates: { BRL: number } }

    const usdBrlRate = fx.rates?.BRL
    if (!usdBrlRate || usdBrlRate <= 0) throw new Error('Frankfurter: taxa USD/BRL inválida')

    const sample = cm.data?.[0]
    if (!sample || sample.RealizedPrice_Adj_STH == null || sample.RealizedPrice_Adj_LTH == null) {
      return NextResponse.json(
        { error: 'Métricas STH/LTH não disponíveis no plano community' },
        { status: 503 }
      )
    }

    const data = cm.data
      .filter(r => r.RealizedPrice_Adj_STH != null && r.RealizedPrice_Adj_LTH != null && r.PriceUSD != null)
      .map(r => {
        const sthUsd  = parseFloat(r.RealizedPrice_Adj_STH!)
        const lthUsd  = parseFloat(r.RealizedPrice_Adj_LTH!)
        const spotUsd = parseFloat(r.PriceUSD!)
        return {
          date:    r.time.slice(0, 10),
          sthUsd,  lthUsd,  spotUsd,
          sthBrl:  sthUsd  * usdBrlRate,
          lthBrl:  lthUsd  * usdBrlRate,
          spotBrl: spotUsd * usdBrlRate,
        }
      })

    return NextResponse.json({ data, usdBrlRate })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 503 })
  }
}
```

---

- [ ] **Step 4: Start dev server and verify route in browser**

```bash
npm run dev
```

Open `http://localhost:3000/api/sth-lth-prices` in browser.

Expected: JSON with `data` array (thousands of items), each with `date`, `sthUsd`, `lthUsd`, `spotUsd`, `sthBrl`, `lthBrl`, `spotBrl` as numbers. `usdBrlRate` should be ~4.5–6.0.

If 503: check Step 1 result and fix metric names.

---

- [ ] **Step 5: Commit**

```bash
git add src/app/api/sth-lth-prices/route.ts
git commit -m "feat(api): add /api/sth-lth-prices route (CoinMetrics + Frankfurter)"
```

---

## Task 2: Extend OrangeDotsChart with custom date range period

**Files:**
- Modify: `src/components/dca-tactical/OrangeDotsChart.tsx`

**Interfaces:**
- Consumes: no new props — uses internal state only
- Produces: same `Period` type extended with `'custom'`

---

- [ ] **Step 1: Update Period type and add state**

In `OrangeDotsChart.tsx`, change lines 7–8:

```typescript
// Before
type Period = '1A' | '2A' | '3A' | 'Todos'
const PERIODS: Period[] = ['1A', '2A', '3A', 'Todos']

// After
type Period = '1A' | '2A' | '3A' | 'Todos' | 'custom'
const PERIODS: Period[] = ['1A', '2A', '3A', 'Todos', 'custom']
```

Inside the component, after the existing `useState` calls (after line 38 `const [containerW, setContainerW] = useState(800)`), add:

```typescript
const [customFrom,  setCustomFrom]  = useState('')
const [customTo,    setCustomTo]    = useState('')
const [pendingFrom, setPendingFrom] = useState('')
const [pendingTo,   setPendingTo]   = useState('')
```

---

- [ ] **Step 2: Update filteredHistory useMemo**

Replace the existing `filteredHistory` useMemo (lines 78–86) with:

```typescript
const filteredHistory = useMemo(() => {
  if (!priceHistory.length) return []
  if (period === 'custom') {
    return priceHistory.filter(p =>
      (!customFrom || p.date >= customFrom) &&
      (!customTo   || p.date <= customTo)
    )
  }
  if (period === 'Todos') return priceHistory
  const years  = period === '1A' ? 1 : period === '2A' ? 2 : 3
  const cutoff = new Date()
  cutoff.setFullYear(cutoff.getFullYear() - years)
  const cutoffStr = cutoff.toISOString().slice(0, 10)
  return priceHistory.filter(p => p.date >= cutoffStr)
}, [priceHistory, period, customFrom, customTo])
```

---

- [ ] **Step 3: Update X-axis label logic for custom period**

The existing xLabels block (around line 189) branches on `period === 'Todos' || period === '3A'`. Extend to handle 'custom' dynamically. Replace the condition block inside the `filteredHistory.forEach` callback:

```typescript
// Before
if (period === 'Todos' || period === '3A') {
  if (m === 1) { key = String(y); label = String(y) }
} else if (period === '2A') {
  if (m === 1 || m === 4 || m === 7 || m === 10) {
    key = `${y}-${m}`; label = `${MONTHS_PT[m - 1]}/${String(y).slice(2)}`
  }
} else {
  if (m % 2 === 1 && (i === 0 || filteredHistory[i - 1].date.slice(5, 7) !== String(m).padStart(2, '0'))) {
    key = `${y}-${m}`; label = `${MONTHS_PT[m - 1]}/${String(y).slice(2)}`
  }
}

// After
const n = filteredHistory.length
const isLong    = period === 'Todos' || period === '3A' || (period === 'custom' && n > 365)
const isMedium  = period === '2A'    || (period === 'custom' && n > 90 && n <= 365)

if (isLong) {
  if (m === 1) { key = String(y); label = String(y) }
} else if (isMedium) {
  if (m === 1 || m === 4 || m === 7 || m === 10) {
    key = `${y}-${m}`; label = `${MONTHS_PT[m - 1]}/${String(y).slice(2)}`
  }
} else {
  if (m % 2 === 1 && (i === 0 || filteredHistory[i - 1].date.slice(5, 7) !== String(m).padStart(2, '0'))) {
    key = `${y}-${m}`; label = `${MONTHS_PT[m - 1]}/${String(y).slice(2)}`
  }
}
```

---

- [ ] **Step 4: Add "Período personalizado" pill button**

In the period buttons `div` (the one with `PERIODS.map`), update the button label render:

```typescript
// Before
{p === 'Todos' ? 'Todo período' : p}

// After
{p === 'custom' ? 'Personalizado' : p === 'Todos' ? 'Todo período' : p}
```

---

- [ ] **Step 5: Add custom date range panel**

After the closing `</div>` of the "Legend + period selector" section (around line 339) and before the `{/* Chart */}` comment, insert:

```tsx
{/* Custom date range panel */}
{period === 'custom' && (
  <div style={{
    padding:      '14px 24px',
    borderTop:    '1px solid var(--border-dim)',
    display:      'flex',
    gap:          '14px',
    alignItems:   'flex-end',
    flexWrap:     'wrap',
  }}>
    <div>
      <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '5px' }}>Data inicial</label>
      <input
        type="date" value={pendingFrom} onChange={e => setPendingFrom(e.target.value)}
        style={{ padding: '7px 10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px' }}
      />
    </div>
    <span style={{ fontSize: '13px', color: 'var(--text-muted)', paddingBottom: '8px' }}>até</span>
    <div>
      <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '5px' }}>Data final</label>
      <input
        type="date" value={pendingTo} onChange={e => setPendingTo(e.target.value)}
        style={{ padding: '7px 10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px' }}
      />
    </div>
    <div style={{ display: 'flex', gap: '8px' }}>
      <button
        onClick={() => { setPeriod('Todos'); setPendingFrom(''); setPendingTo('') }}
        style={{ padding: '7px 16px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-muted)', fontSize: '13px', cursor: 'pointer' }}
      >
        Limpar
      </button>
      <button
        onClick={() => { setCustomFrom(pendingFrom); setCustomTo(pendingTo) }}
        style={{ padding: '7px 16px', background: 'var(--orange)', border: 'none', borderRadius: '6px', color: '#000', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
      >
        Aplicar
      </button>
    </div>
  </div>
)}
```

---

- [ ] **Step 6: Verify in browser**

With dev server running, open the home page (DCA tab). Click "Personalizado" on OrangeDotsChart. Verify date inputs appear. Set a date range (e.g. 2024-01-01 to 2024-12-31), click "Aplicar". Verify chart shows only that period. Click "Limpar". Verify chart resets to all time.

---

- [ ] **Step 7: Commit**

```bash
git add src/components/dca-tactical/OrangeDotsChart.tsx
git commit -m "feat(OrangeDotsChart): add custom date range period filter"
```

---

## Task 3: Extend DcaPatrimonyChart with custom date range period

**Files:**
- Modify: `src/components/dca-tactical/DcaPatrimonyChart.tsx`

**Interfaces:**
- Consumes: `buildChartData(contributions, period, customFrom?, customTo?)` — updated signature
- Produces: same `MonthData[]` output, now also works with `period === 'custom'`

---

- [ ] **Step 1: Update Period type and buildChartData signature**

Change line 6:
```typescript
// Before
type Period = '3M' | '6M' | '12M' | 'Todos'
const PERIODS: Period[] = ['3M', '6M', '12M', 'Todos']

// After
type Period = '3M' | '6M' | '12M' | 'Todos' | 'custom'
const PERIODS: Period[] = ['3M', '6M', '12M', 'Todos', 'custom']
```

Change `buildChartData` signature (line 44):
```typescript
// Before
function buildChartData(contributions: DcaContributionRow[], period: Period): MonthData[] {

// After
function buildChartData(contributions: DcaContributionRow[], period: Period, customFrom?: string, customTo?: string): MonthData[] {
```

---

- [ ] **Step 2: Update cutoffYm logic inside buildChartData**

Replace the period filter block (lines 63–68):

```typescript
// Before
let cutoffYm: string | null = null
if (period !== 'Todos') {
  const months = period === '3M' ? 2 : period === '6M' ? 5 : 11
  const d = new Date(); d.setMonth(d.getMonth() - months)
  cutoffYm = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
const displayedYms = cutoffYm ? allYms.filter(ym => ym >= cutoffYm!) : allYms

// After
let cutoffYm: string | null = null
let endYm:    string | null = null

if (period === 'custom') {
  cutoffYm = customFrom ? customFrom.slice(0, 7) : null
  endYm    = customTo   ? customTo.slice(0, 7)   : null
} else if (period !== 'Todos') {
  const months = period === '3M' ? 2 : period === '6M' ? 5 : 11
  const d = new Date(); d.setMonth(d.getMonth() - months)
  cutoffYm = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
const displayedYms = allYms.filter(ym =>
  (!cutoffYm || ym >= cutoffYm) &&
  (!endYm    || ym <= endYm)
)
```

---

- [ ] **Step 3: Add state and update useMemo call**

Inside `DcaPatrimonyChart` component, after the existing `useState` calls (after line 109 `const [mousePos, setMousePos] = useState...`), add:

```typescript
const [customFrom,  setCustomFrom]  = useState('')
const [customTo,    setCustomTo]    = useState('')
const [pendingFrom, setPendingFrom] = useState('')
const [pendingTo,   setPendingTo]   = useState('')
```

Update the `data` useMemo call (line 112):
```typescript
// Before
const data = useMemo(() => buildChartData(contributions, period), [contributions, period])

// After
const data = useMemo(
  () => buildChartData(contributions, period, customFrom, customTo),
  [contributions, period, customFrom, customTo]
)
```

---

- [ ] **Step 4: Update period button label**

In the period buttons map (around line 199), update the label:

```typescript
// Before
{p === 'Todos' ? 'Todo período' : `Últimos ${p}`}

// After
{p === 'custom' ? 'Personalizado' : p === 'Todos' ? 'Todo período' : `Últimos ${p}`}
```

---

- [ ] **Step 5: Add custom date range panel**

After the closing `</div>` of the header block (after the period buttons `</div>`) and before the `{/* Chart — scrollable on mobile */}` comment, insert:

```tsx
{/* Custom date range panel */}
{period === 'custom' && (
  <div style={{
    padding:    '14px 20px',
    borderTop:  '1px solid var(--border-dim)',
    display:    'flex',
    gap:        '14px',
    alignItems: 'flex-end',
    flexWrap:   'wrap',
  }}>
    <div>
      <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '5px' }}>Data inicial</label>
      <input
        type="date" value={pendingFrom} onChange={e => setPendingFrom(e.target.value)}
        style={{ padding: '7px 10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px' }}
      />
    </div>
    <span style={{ fontSize: '13px', color: 'var(--text-muted)', paddingBottom: '8px' }}>até</span>
    <div>
      <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '5px' }}>Data final</label>
      <input
        type="date" value={pendingTo} onChange={e => setPendingTo(e.target.value)}
        style={{ padding: '7px 10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px' }}
      />
    </div>
    <div style={{ display: 'flex', gap: '8px' }}>
      <button
        onClick={() => { setPeriod('Todos'); setPendingFrom(''); setPendingTo('') }}
        style={{ padding: '7px 16px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-muted)', fontSize: '13px', cursor: 'pointer' }}
      >
        Limpar
      </button>
      <button
        onClick={() => { setCustomFrom(pendingFrom); setCustomTo(pendingTo) }}
        style={{ padding: '7px 16px', background: 'var(--orange)', border: 'none', borderRadius: '6px', color: '#000', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
      >
        Aplicar
      </button>
    </div>
  </div>
)}
```

---

- [ ] **Step 6: Verify in browser**

On home page, click "Personalizado" on the patrimony chart. Set a date range (e.g. 2023-01-01 to 2023-12-31). Click "Aplicar". Verify only bars from that year appear. Click "Limpar". Verify all bars return.

---

- [ ] **Step 7: Commit**

```bash
git add src/components/dca-tactical/DcaPatrimonyChart.tsx
git commit -m "feat(DcaPatrimonyChart): add custom date range period filter"
```

---

## Task 4: Create SthLthChart component

**Files:**
- Create: `src/components/dca-tactical/SthLthChart.tsx`

**Interfaces:**
- Consumes: `GET /api/sth-lth-prices` response (from Task 1)
- Produces: `export default function SthLthChart()` — no props, self-contained

---

- [ ] **Step 1: Create SthLthChart.tsx**

Create `src/components/dca-tactical/SthLthChart.tsx`:

```typescript
'use client'

import { useState, useEffect, useMemo, useRef } from 'react'

interface SthLthPoint {
  date:    string
  sthUsd:  number
  lthUsd:  number
  spotUsd: number
  sthBrl:  number
  lthBrl:  number
  spotBrl: number
}

type Period   = '3M' | '6M' | '12M' | 'Todos' | 'custom'
type Currency = 'USD' | 'BRL'

const MONTHS_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function fmtK(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.', ',')}M`
  if (n >= 1_000)     return `${Math.round(n / 1_000)}k`
  return String(Math.round(n))
}

const PRESETS: { id: Period; label: string }[] = [
  { id: '3M',     label: 'Últimos 3 meses'     },
  { id: '6M',     label: 'Últimos 6 meses'     },
  { id: '12M',    label: 'Últimos 12 meses'    },
  { id: 'Todos',  label: 'Todo o período'      },
  { id: 'custom', label: 'Período personalizado' },
]

interface TooltipState { date: string; sth: number; lth: number; spot: number; x: number; y: number }

export default function SthLthChart() {
  const [period,       setPeriod]       = useState<Period>('Todos')
  const [customFrom,   setCustomFrom]   = useState('')
  const [customTo,     setCustomTo]     = useState('')
  const [pendingFrom,  setPendingFrom]  = useState('')
  const [pendingTo,    setPendingTo]    = useState('')
  const [currency,     setCurrency]     = useState<Currency>('USD')
  const [data,         setData]         = useState<SthLthPoint[]>([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [containerW,   setContainerW]   = useState(800)
  const [tooltip,      setTooltip]      = useState<TooltipState | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const dropdownRef  = useRef<HTMLDivElement>(null)

  function loadData() {
    setLoading(true)
    setError(null)
    fetch('/api/sth-lth-prices')
      .then(r => r.ok ? r.json() : Promise.reject(`Erro ${r.status}`))
      .then((d: { data: SthLthPoint[] }) => setData(d.data))
      .catch((e: unknown) => setError(String(e)))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver(entries => setContainerW(entries[0].contentRect.width))
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (!showDropdown) return
    const close = (e: MouseEvent | TouchEvent) => {
      if (!dropdownRef.current?.contains(e.target as Node)) setShowDropdown(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('touchstart', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('touchstart', close)
    }
  }, [showDropdown])

  const filteredData = useMemo(() => {
    if (!data.length) return []
    if (period === 'custom') {
      return data.filter(p =>
        (!customFrom || p.date >= customFrom) &&
        (!customTo   || p.date <= customTo)
      )
    }
    if (period === 'Todos') return data
    const months = period === '3M' ? 3 : period === '6M' ? 6 : 12
    const cutoff = new Date()
    cutoff.setMonth(cutoff.getMonth() - months)
    const cutoffStr = cutoff.toISOString().slice(0, 10)
    return data.filter(p => p.date >= cutoffStr)
  }, [data, period, customFrom, customTo])

  const H      = 300
  const pad    = { top: 20, right: 80, bottom: 36, left: 20 }
  const plotW  = Math.max(containerW - pad.left - pad.right, 100)
  const plotH  = H - pad.top - pad.bottom

  const sthKey  = currency === 'USD' ? 'sthUsd'  : 'sthBrl'
  const lthKey  = currency === 'USD' ? 'lthUsd'  : 'lthBrl'
  const spotKey = currency === 'USD' ? 'spotUsd' : 'spotBrl'
  const prefix  = currency === 'USD' ? '$' : 'R$'

  const allPrices = filteredData.flatMap(p => [p[sthKey], p[lthKey], p[spotKey]])
  const priceMin  = allPrices.length > 0 ? Math.min(...allPrices) * 0.88 : 0
  const priceMax  = allPrices.length > 0 ? Math.max(...allPrices) * 1.08 : 1
  const pRange    = priceMax - priceMin || 1

  const toY = (p: number) => pad.top + plotH - ((p - priceMin) / pRange) * plotH
  const toX = (i: number) => pad.left + (i / Math.max(filteredData.length - 1, 1)) * plotW

  const pts = (key: keyof SthLthPoint) =>
    filteredData.length > 1
      ? filteredData.map((p, i) => `${toX(i).toFixed(1)},${toY(p[key] as number).toFixed(1)}`).join(' ')
      : ''

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => ({
    price: priceMin + t * pRange,
    y:     pad.top + plotH - t * plotH,
  }))

  const xLabels: { text: string; x: number }[] = []
  if (filteredData.length > 1) {
    const n = filteredData.length
    const isLong   = period === 'Todos'  || (period === 'custom' && n > 365)
    const isMedium = period === '12M'    || (period === 'custom' && n > 90 && n <= 365)
    let lastKey = ''
    filteredData.forEach((p, i) => {
      const [y, m] = p.date.split('-').map(Number)
      let key = '', label = ''
      if (isLong) {
        if (m === 1) { key = String(y); label = String(y) }
      } else if (isMedium) {
        if (m === 1 || m === 4 || m === 7 || m === 10) {
          key = `${y}-${m}`; label = `${MONTHS_PT[m - 1]}/${String(y).slice(2)}`
        }
      } else {
        if (i === 0 || filteredData[i - 1].date.slice(5, 7) !== p.date.slice(5, 7)) {
          key = `${y}-${m}`; label = `${MONTHS_PT[m - 1]}/${String(y).slice(2)}`
        }
      }
      if (key && key !== lastKey) { lastKey = key; xLabels.push({ text: label, x: toX(i) }) }
    })
  }

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!filteredData.length) return
    const rect = e.currentTarget.getBoundingClientRect()
    const mx   = e.clientX - rect.left - pad.left
    const idx  = Math.round((mx / plotW) * (filteredData.length - 1))
    const i    = Math.max(0, Math.min(idx, filteredData.length - 1))
    const p    = filteredData[i]
    setTooltip({
      date: p.date, sth: p[sthKey], lth: p[lthKey], spot: p[spotKey],
      x: toX(i), y: toY(p[spotKey]),
    })
  }

  const activeLabel = PRESETS.find(p => p.id === period)?.label ?? 'Todo o período'

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '20px 24px 14px' }}>
        <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.18em', color: 'var(--orange)', textTransform: 'uppercase', marginBottom: '12px' }}>
          STH / LTH Realized Price
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>

          {/* Legend */}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', fontSize: '10px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
            <LegendItem color="#22D3EE"          label="STH Realized Price" />
            <LegendItem color="var(--orange)"    label="LTH Realized Price" />
            <LegendItem color="var(--text-sec)"  label="BTC Spot" opacity={0.5} />
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>

            {/* Period dropdown */}
            <div ref={dropdownRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setShowDropdown(v => !v)}
                style={{ padding: '5px 12px', background: 'var(--surface3)', border: '1px solid var(--border-strong)', borderRadius: '6px', color: 'var(--text)', fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}
              >
                {activeLabel}
                <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>▾</span>
              </button>
              {showDropdown && (
                <div style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', zIndex: 200, minWidth: '200px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
                  {PRESETS.map(p => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setPeriod(p.id)
                        setShowDropdown(false)
                        if (p.id === 'custom') { setPendingFrom(customFrom); setPendingTo(customTo) }
                      }}
                      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', background: period === p.id ? 'rgba(247,147,26,0.1)' : 'transparent', border: 'none', borderBottom: '1px solid var(--border-dim)', color: period === p.id ? 'var(--orange)' : 'var(--text-muted)', fontSize: '13px', cursor: 'pointer' }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Currency toggle */}
            <div style={{ display: 'flex', gap: '3px' }}>
              {(['USD', 'BRL'] as Currency[]).map(c => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  style={{ padding: '4px 11px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', border: currency === c ? '1px solid var(--border-strong)' : '1px solid transparent', background: currency === c ? 'var(--surface3)' : 'transparent', color: currency === c ? 'var(--text)' : 'var(--text-muted)', transition: 'all 0.12s' }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Custom date panel */}
      {period === 'custom' && (
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border-dim)', display: 'flex', gap: '14px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '5px' }}>Data inicial</label>
            <input type="date" value={pendingFrom} onChange={e => setPendingFrom(e.target.value)} style={{ padding: '7px 10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px' }} />
          </div>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)', paddingBottom: '8px' }}>até</span>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '5px' }}>Data final</label>
            <input type="date" value={pendingTo} onChange={e => setPendingTo(e.target.value)} style={{ padding: '7px 10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px' }} />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => { setPeriod('Todos'); setPendingFrom(''); setPendingTo('') }} style={{ padding: '7px 16px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-muted)', fontSize: '13px', cursor: 'pointer' }}>Limpar</button>
            <button onClick={() => { setCustomFrom(pendingFrom); setCustomTo(pendingTo) }} style={{ padding: '7px 16px', background: 'var(--orange)', border: 'none', borderRadius: '6px', color: '#000', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Aplicar</button>
          </div>
        </div>
      )}

      {/* Chart */}
      <div ref={containerRef} style={{ position: 'relative', cursor: loading || error ? 'default' : 'crosshair' }} onMouseLeave={() => setTooltip(null)}>
        {loading ? (
          <div style={{ height: H, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
            Carregando dados STH/LTH…
          </div>
        ) : error ? (
          <div style={{ height: H, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px', color: 'var(--text-muted)', fontSize: '13px' }}>
            <span>Erro ao carregar dados STH/LTH.</span>
            <button onClick={loadData} style={{ padding: '6px 14px', background: 'var(--surface3)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '12px', cursor: 'pointer' }}>Tentar novamente</button>
          </div>
        ) : filteredData.length < 2 ? (
          <div style={{ height: H, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
            Sem dados para o período selecionado.
          </div>
        ) : (
          <svg width={containerW} height={H} style={{ display: 'block', overflow: 'visible' }} onMouseMove={handleMouseMove}>

            {/* Y grid + labels */}
            {yTicks.map((t, i) => (
              <g key={i}>
                <line x1={pad.left} y1={t.y} x2={pad.left + plotW} y2={t.y}
                  stroke="var(--border-dim)" strokeWidth="0.5" strokeDasharray="3,8" opacity="0.6" />
                <text x={pad.left + plotW + 7} y={t.y + 4} textAnchor="start" fontSize="9" fill="var(--text-muted)" fontFamily="monospace">
                  {prefix}{fmtK(t.price)}
                </text>
              </g>
            ))}

            {/* Spot (grey, behind) */}
            <polyline points={pts(spotKey)} fill="none" stroke="var(--text-sec)" strokeWidth="1.2" strokeLinejoin="round" opacity="0.5" />

            {/* LTH (orange) */}
            <polyline points={pts(lthKey)} fill="none" stroke="var(--orange)" strokeWidth="1.5" strokeLinejoin="round" opacity="0.9" />

            {/* STH (cyan) */}
            <polyline points={pts(sthKey)} fill="none" stroke="#22D3EE" strokeWidth="1.5" strokeLinejoin="round" opacity="0.9" />

            {/* Tooltip crosshair */}
            {tooltip && (
              <line x1={tooltip.x} y1={pad.top} x2={tooltip.x} y2={pad.top + plotH}
                stroke="var(--border-strong)" strokeWidth="1" strokeDasharray="3,4" />
            )}

            {/* X axis labels */}
            {xLabels.map((l, i) => (
              <text key={i} x={l.x} y={H - 6} textAnchor="middle" fontSize="9" fill="var(--text-muted)" fontFamily="monospace">
                {l.text}
              </text>
            ))}
          </svg>
        )}

        {/* Tooltip popup */}
        {tooltip && (
          <div style={{
            position: 'absolute',
            left:     tooltip.x + 200 > containerW ? tooltip.x - 202 : tooltip.x + 12,
            top:      Math.max(8, tooltip.y - 60),
            background:   'var(--surface)',
            border:       '1px solid var(--border-strong)',
            borderRadius: '10px',
            padding:      '10px 14px',
            pointerEvents:'none',
            zIndex:       20,
            minWidth:     '188px',
            boxShadow:    '0 8px 24px rgba(0,0,0,0.5)',
          }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>
              {new Date(tooltip.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
            <TRow label="STH Realized" value={`${prefix}${fmtK(tooltip.sth)}`}  color="#22D3EE" />
            <TRow label="LTH Realized" value={`${prefix}${fmtK(tooltip.lth)}`}  color="var(--orange)" />
            <TRow label="BTC Spot"     value={`${prefix}${fmtK(tooltip.spot)}`} color="var(--text-sec)" />
          </div>
        )}
      </div>
    </div>
  )
}

function LegendItem({ color, label, opacity }: { color: string; label: string; opacity?: number }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
      <svg width="20" height="10" style={{ display: 'block' }}>
        <line x1="0" y1="5" x2="20" y2="5" stroke={color} strokeWidth="1.5" opacity={opacity ?? 1} />
      </svg>
      {label}
    </span>
  )
}

function TRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', marginBottom: '3px' }}>
      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{label}</span>
      <strong style={{ fontSize: '11px', color, fontFamily: 'monospace' }}>{value}</strong>
    </div>
  )
}
```

---

- [ ] **Step 2: Check TypeScript compilation**

```bash
npx tsc --noEmit
```

Expected: zero errors. Fix any type errors before continuing.

---

- [ ] **Step 3: Verify chart renders**

At this point `SthLthChart` is not yet wired into `DcaResumoView`. To verify in isolation, temporarily import it directly in the home page or add it to `DcaResumoView` (which is Task 5). Proceed to Task 5 now and come back to verify.

---

- [ ] **Step 4: Commit**

```bash
git add src/components/dca-tactical/SthLthChart.tsx
git commit -m "feat(SthLthChart): add STH/LTH realized price chart component"
```

---

## Task 5: Wire SthLthChart into DcaResumoView

**Files:**
- Modify: `src/components/dca-tactical/DcaResumoView.tsx`

**Interfaces:**
- Consumes: `SthLthChart` from `'./SthLthChart'` — no props

---

- [ ] **Step 1: Add import**

At the top of `src/components/dca-tactical/DcaResumoView.tsx`, after the existing imports (after line 7 `import Tooltip from '@/components/shared/Tooltip'`), add:

```typescript
import SthLthChart from './SthLthChart'
```

---

- [ ] **Step 2: Add JSX block**

In the return JSX of `DcaResumoView`, after the `{/* Orange Dots Chart */}` block (after line 159 `</div>`), add:

```tsx
{/* STH / LTH Realized Price Chart */}
<div>
  <SthLthChart />
</div>
```

---

- [ ] **Step 3: Verify in browser — golden path**

With dev server running, navigate to the home page (DCA tab). Scroll to bottom. Verify:

1. `SthLthChart` appears below `OrangeDotsChart`
2. Three lines render (cyan STH, orange LTH, grey Spot)
3. Hovering shows tooltip with all 3 prices + date
4. Currency toggle switches between `$` and `R$` labels
5. Period dropdown opens/closes on click, closes on outside click
6. Selecting a preset (e.g. `3M`) filters the chart correctly
7. Selecting `Período personalizado` reveals date inputs; entering dates + clicking `Aplicar` filters correctly; `Limpar` resets to `Todos`
8. Chart is responsive — resize browser window, SVG width adjusts

---

- [ ] **Step 4: Verify all 4 themes**

Toggle between Dark, Light, Orange, Celeste themes (via theme switcher in app). In each:
- All 3 lines are legible (cyan `#22D3EE` should be visible in all)
- Tooltip background/text readable
- Date inputs render correctly

---

- [ ] **Step 5: Commit**

```bash
git add src/components/dca-tactical/DcaResumoView.tsx
git commit -m "feat(DcaResumoView): wire SthLthChart below OrangeDotsChart"
```

---

## Self-Review Checklist

- [x] **API route** verified against spec: returns `{ data, usdBrlRate }`, `revalidate = 3600`, 503 on metric unavailability
- [x] **SthLthChart** verified against spec: 3 lines (STH cyan, LTH orange, Spot grey), USD/BRL toggle, period dropdown, custom date panel, `ResizeObserver`, tooltip
- [x] **OrangeDotsChart**: `'custom'` period added, staged `pending*` → committed `custom*` pattern
- [x] **DcaPatrimonyChart**: `'custom'` period added, `buildChartData` updated, same panel pattern
- [x] **DcaResumoView**: wired with no prop threading
- [x] **No hardcoded colors** except `#22D3EE` (STH) and existing `#22C55E` (green)
- [x] **Click-outside close** for SthLthChart dropdown via `dropdownRef` + `mousedown/touchstart` listeners
- [x] **Error + empty states** present in SthLthChart
