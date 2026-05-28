# Rentabilidade Premium Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `/rentabilidade` table with a premium institutional Bitcoin wealth dashboard: Hero → Chart (BTC price + aporte dots) → Insights + Heatmap (calendar grid).

**Architecture:** Server-first — `page.tsx` calls `fetchBtcPriceHistoryBrl()` (lib function, cached 1h) + `listDcaContributions()` in parallel, computes `PatrimonioData` server-side, passes as props. Components are pure renderers with no fetching.

**Tech Stack:** Next.js 14 App Router, recharts 3.x (ComposedChart + Area + Scatter), framer-motion, inline CSS (CSS vars), vitest

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `lib/rentabilidade/types.ts` | Create | Shared types: `PatrimonioData`, `PricePoint`, `ContributionPoint`, `HeatmapCell`, `InsightData` |
| `lib/rentabilidade/compute.ts` | Create | Pure functions: `computePatrimonio`, `computeInsights`, `buildContributionPoints`, `buildHeatmapCells`, `colorForReturn`, `textColorForReturn` |
| `lib/rentabilidade/__tests__/compute.test.ts` | Create | Tests for all compute functions |
| `lib/rentabilidade/fetch-price-history.ts` | Create | `fetchBtcPriceHistoryBrl()` — Binance BTCUSDT scaled to BRL, cached 1h |
| `src/app/api/btc-price-history/route.ts` | Create | API route wrapping `fetchBtcPriceHistoryBrl` |
| `src/app/rentabilidade/page.tsx` | Modify | Parallel fetch + compute + pass props |
| `src/components/rentabilidade/PatrimonioHero.tsx` | Create | Hero card component |
| `src/components/rentabilidade/BtcChart.tsx` | Create | recharts ComposedChart (Area + Scatter) |
| `src/components/rentabilidade/InsightsPanel.tsx` | Create | 3 rule-based insight cards |
| `src/components/rentabilidade/AporteHeatmap.tsx` | Create | Calendar grid heatmap |
| `src/components/rentabilidade/RentabilidadeView.tsx` | Modify | Replace old content, wire new components |

---

## Task 1: Types + Compute Functions

**Files:**
- Create: `lib/rentabilidade/types.ts`
- Create: `lib/rentabilidade/compute.ts`
- Create: `lib/rentabilidade/__tests__/compute.test.ts`

- [ ] **Step 1: Create types file**

```typescript
// lib/rentabilidade/types.ts
export interface PricePoint {
  date:  string   // YYYY-MM-DD
  price: number   // BRL
}

export interface ContributionPoint {
  date:        string
  btcPriceBrl: number
  returnPct:   number
  amountBrl:   number
  btcAmount:   number
}

export interface HeatmapCell {
  year:      number
  month:     number  // 1–12
  returnPct: number
  date:      string
  amountBrl: number
}

export interface InsightData {
  bestContribution:  { date: string; returnPct: number; label: string }
  worstContribution: { date: string; returnPct: number; label: string }
  profitableCount:   number
  totalCount:        number
  dcaVsLumpSumPct:   number | null
}

export interface PatrimonioData {
  currentValue:      number
  totalInvested:     number
  totalReturn:       number   // percentage
  totalReturnBrl:    number   // R$ absolute
  avgPrice:          number
  totalBtc:          number
  contributionCount: number
  priceHistory:      PricePoint[]
  contributions:     ContributionPoint[]
  heatmap:           HeatmapCell[]
  insights:          InsightData
  currentBtcPrice:   number
}
```

- [ ] **Step 2: Write failing tests**

```typescript
// lib/rentabilidade/__tests__/compute.test.ts
import { describe, it, expect } from 'vitest'
import {
  colorForReturn,
  textColorForReturn,
  buildContributionPoints,
  buildHeatmapCells,
  computeInsights,
  computePatrimonio,
} from '../compute'
import type { DcaContributionRow } from '@/lib/db/types'

function makeContribution(overrides: Partial<DcaContributionRow> = {}): DcaContributionRow {
  return {
    id: '1',
    user_id: 'u1',
    amount: 1000,
    contribution_date: '2023-06-15',
    contribution_type: 'DCA',
    market_score_snapshot: null,
    market_state_snapshot: null,
    notes: null,
    sats_purchased: 200_000,        // 0.002 BTC
    btc_price_brl: 150_000,         // bought at R$150k
    effective_price_brl: 150_000,
    created_at: '2023-06-15T00:00:00Z',
    updated_at: '2023-06-15T00:00:00Z',
    deleted_at: null,
    ...overrides,
  }
}

describe('colorForReturn', () => {
  it('returns dark red for negative return', () => {
    expect(colorForReturn(-10)).toBe('#7f1d1d')
  })
  it('returns medium red for small negative', () => {
    expect(colorForReturn(-2)).toBe('#991b1b')
  })
  it('returns dark green for small positive', () => {
    expect(colorForReturn(10)).toBe('#166534')
  })
  it('returns bright green for large positive', () => {
    expect(colorForReturn(200)).toBe('#dcfce7')
  })
})

describe('textColorForReturn', () => {
  it('returns white for dark cells (low return)', () => {
    expect(textColorForReturn(50)).toBe('rgba(255,255,255,0.85)')
  })
  it('returns dark for bright cells (high return)', () => {
    expect(textColorForReturn(150)).toBe('rgba(0,0,0,0.75)')
  })
})

describe('buildContributionPoints', () => {
  it('computes returnPct relative to currentBtcPrice', () => {
    const c = makeContribution({ btc_price_brl: 200_000 })
    const points = buildContributionPoints([c], 300_000)
    expect(points).toHaveLength(1)
    expect(points[0].returnPct).toBeCloseTo(50)  // (300k-200k)/200k*100
  })

  it('excludes contributions with zero sats', () => {
    const c = makeContribution({ sats_purchased: 0 })
    expect(buildContributionPoints([c], 300_000)).toHaveLength(0)
  })

  it('excludes Venda notes', () => {
    const c = makeContribution({ notes: 'Venda parcial' })
    expect(buildContributionPoints([c], 300_000)).toHaveLength(0)
  })

  it('falls back to effective_price_brl when btc_price_brl is null', () => {
    const c = makeContribution({ btc_price_brl: null, effective_price_brl: 100_000 })
    const points = buildContributionPoints([c], 200_000)
    expect(points[0].returnPct).toBeCloseTo(100)
  })

  it('computes btcAmount from sats_purchased', () => {
    const c = makeContribution({ sats_purchased: 1_000_000 })
    const points = buildContributionPoints([c], 300_000)
    expect(points[0].btcAmount).toBeCloseTo(0.01)
  })
})

describe('buildHeatmapCells', () => {
  it('extracts year and month from contribution_date', () => {
    const c = makeContribution({ contribution_date: '2023-06-15' })
    const cells = buildHeatmapCells([c], 300_000)
    expect(cells[0].year).toBe(2023)
    expect(cells[0].month).toBe(6)
  })
})

describe('computeInsights', () => {
  it('identifies best and worst contribution', () => {
    const good = makeContribution({ id: '1', btc_price_brl: 100_000, contribution_date: '2023-01-01' })
    const bad  = makeContribution({ id: '2', btc_price_brl: 500_000, contribution_date: '2022-01-01' })
    const insights = computeInsights([good, bad], 300_000)
    expect(insights.bestContribution.returnPct).toBeCloseTo(200)
    expect(insights.worstContribution.returnPct).toBeCloseTo(-40)
  })

  it('counts profitable contributions', () => {
    const good = makeContribution({ id: '1', btc_price_brl: 100_000 })
    const bad  = makeContribution({ id: '2', btc_price_brl: 500_000 })
    const insights = computeInsights([good, bad], 300_000)
    expect(insights.profitableCount).toBe(1)
    expect(insights.totalCount).toBe(2)
  })

  it('returns null dcaVsLumpSumPct for single contribution', () => {
    const c = makeContribution()
    const insights = computeInsights([c], 300_000)
    expect(insights.dcaVsLumpSumPct).toBeNull()
  })
})

describe('computePatrimonio', () => {
  it('computes currentValue as totalBtc * currentBtcPrice', () => {
    const c = makeContribution({ sats_purchased: 1_000_000 })  // 0.01 BTC
    const data = computePatrimonio([c], [], 500_000)
    expect(data.currentValue).toBeCloseTo(5_000)    // 0.01 * 500k
    expect(data.totalBtc).toBeCloseTo(0.01)
  })

  it('computes avgPrice as totalInvested / totalBtc', () => {
    const c = makeContribution({ amount: 1000, sats_purchased: 200_000 })  // 0.002 BTC
    const data = computePatrimonio([c], [], 300_000)
    expect(data.avgPrice).toBeCloseTo(500_000)  // 1000 / 0.002
  })

  it('computes totalReturn percentage', () => {
    const c = makeContribution({ amount: 1000, sats_purchased: 200_000, btc_price_brl: 150_000 })
    const data = computePatrimonio([c], [], 300_000)
    // currentValue = 0.002 * 300k = 600; invested = 1000; return = (600-1000)/1000*100 = -40%
    expect(data.totalReturn).toBeCloseTo(-40)
  })
})
```

- [ ] **Step 3: Run tests — verify they fail**

```bash
cd /Users/diegomoreno/development/btc-monitor-web-next
npx vitest run lib/rentabilidade/__tests__/compute.test.ts
```

Expected: FAIL — "Cannot find module '../compute'"

- [ ] **Step 4: Create compute.ts**

```typescript
// lib/rentabilidade/compute.ts
import type { DcaContributionRow } from '@/lib/db/types'
import type {
  PatrimonioData, PricePoint, ContributionPoint, HeatmapCell, InsightData,
} from './types'

export function colorForReturn(returnPct: number): string {
  if (returnPct < -5)  return '#7f1d1d'
  if (returnPct < 0)   return '#991b1b'
  if (returnPct < 25)  return '#166534'
  if (returnPct < 50)  return '#15803d'
  if (returnPct < 100) return '#16a34a'
  if (returnPct < 150) return '#22c55e'
  if (returnPct < 180) return '#4ade80'
  if (returnPct < 200) return '#86efac'
  if (returnPct < 220) return '#bbf7d0'
  return '#dcfce7'
}

export function textColorForReturn(returnPct: number): string {
  return returnPct < 100 ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.75)'
}

function isPurchase(c: DcaContributionRow): boolean {
  return Boolean(c.sats_purchased && c.sats_purchased > 0 && !c.notes?.includes('Venda'))
}

function formatMonthLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
}

export function buildContributionPoints(
  contributions: DcaContributionRow[],
  currentBtcPrice: number,
): ContributionPoint[] {
  return contributions.filter(isPurchase).map(c => {
    const btcPriceBrl = c.btc_price_brl ?? c.effective_price_brl ?? currentBtcPrice
    const returnPct   = ((currentBtcPrice - btcPriceBrl) / btcPriceBrl) * 100
    const btcAmount   = (c.sats_purchased ?? 0) / 1e8
    return { date: c.contribution_date, btcPriceBrl, returnPct, amountBrl: c.amount, btcAmount }
  })
}

export function buildHeatmapCells(
  contributions: DcaContributionRow[],
  currentBtcPrice: number,
): HeatmapCell[] {
  return buildContributionPoints(contributions, currentBtcPrice).map(cp => {
    const d = new Date(cp.date + 'T00:00:00')
    return { year: d.getFullYear(), month: d.getMonth() + 1, returnPct: cp.returnPct, date: cp.date, amountBrl: cp.amountBrl }
  })
}

export function computeInsights(
  contributions: DcaContributionRow[],
  currentBtcPrice: number,
): InsightData {
  const points = buildContributionPoints(contributions, currentBtcPrice)
  const empty: InsightData = {
    bestContribution:  { date: '', returnPct: 0, label: '—' },
    worstContribution: { date: '', returnPct: 0, label: '—' },
    profitableCount: 0, totalCount: 0, dcaVsLumpSumPct: null,
  }
  if (points.length === 0) return empty

  const sorted       = [...points].sort((a, b) => b.returnPct - a.returnPct)
  const best         = sorted[0]
  const worst        = sorted[sorted.length - 1]
  const profitableCount = points.filter(p => p.returnPct > 0).length

  // DCA avg price vs lump-sum at oldest contribution date
  const totalInvested = points.reduce((s, p) => s + p.amountBrl, 0)
  const totalBtc      = points.reduce((s, p) => s + p.btcAmount, 0)
  const dcaAvgPrice   = totalBtc > 0 ? totalInvested / totalBtc : null
  const byDate        = [...points].sort((a, b) => a.date.localeCompare(b.date))
  const oldestPrice   = byDate[0]?.btcPriceBrl ?? null

  let dcaVsLumpSumPct: number | null = null
  if (dcaAvgPrice && oldestPrice && points.length > 1) {
    const dcaReturn   = (currentBtcPrice - dcaAvgPrice) / dcaAvgPrice * 100
    const lumpReturn  = (currentBtcPrice - oldestPrice) / oldestPrice * 100
    dcaVsLumpSumPct   = parseFloat((dcaReturn - lumpReturn).toFixed(1))
  }

  return {
    bestContribution:  { date: best.date,  returnPct: best.returnPct,  label: formatMonthLabel(best.date) },
    worstContribution: { date: worst.date, returnPct: worst.returnPct, label: formatMonthLabel(worst.date) },
    profitableCount,
    totalCount: points.length,
    dcaVsLumpSumPct,
  }
}

export function computePatrimonio(
  contributions: DcaContributionRow[],
  priceHistory: PricePoint[],
  currentBtcPrice: number,
): PatrimonioData {
  const purchases     = contributions.filter(isPurchase)
  const totalInvested = purchases.reduce((s, c) => s + c.amount, 0)
  const totalSats     = purchases.reduce((s, c) => s + (c.sats_purchased ?? 0), 0)
  const totalBtc      = totalSats / 1e8
  const currentValue  = totalBtc * currentBtcPrice
  const avgPrice      = totalBtc > 0 ? totalInvested / totalBtc : 0
  const totalReturn   = totalInvested > 0 ? ((currentValue - totalInvested) / totalInvested) * 100 : 0
  const totalReturnBrl = currentValue - totalInvested

  return {
    currentValue,
    totalInvested,
    totalReturn,
    totalReturnBrl,
    avgPrice,
    totalBtc,
    contributionCount: purchases.length,
    priceHistory,
    contributions: buildContributionPoints(purchases, currentBtcPrice),
    heatmap:       buildHeatmapCells(purchases, currentBtcPrice),
    insights:      computeInsights(purchases, currentBtcPrice),
    currentBtcPrice,
  }
}
```

- [ ] **Step 5: Run tests — verify they pass**

```bash
npx vitest run lib/rentabilidade/__tests__/compute.test.ts
```

Expected: all tests PASS

- [ ] **Step 6: Commit**

```bash
git add lib/rentabilidade/types.ts lib/rentabilidade/compute.ts lib/rentabilidade/__tests__/compute.test.ts
git commit -m "feat(rentabilidade): add compute functions and types with tests"
```

---

## Task 2: Price History Fetch + API Route

**Files:**
- Create: `lib/rentabilidade/fetch-price-history.ts`
- Create: `src/app/api/btc-price-history/route.ts`

- [ ] **Step 1: Create fetch-price-history.ts**

This function fetches 1100 daily BTCUSDT candles from Binance and scales them to BRL using the current CoinGecko price. It is cached for 1 hour via `unstable_cache`.

```typescript
// lib/rentabilidade/fetch-price-history.ts
import { unstable_cache } from 'next/cache'
import { fetchJson } from '../utils/http'
import type { PricePoint } from './types'
import type { BinanceKline } from '../types/indicator'

const BINANCE_BASE = process.env.BINANCE_BASE_URL ?? 'https://data-api.binance.vision'

async function fetchCurrentBrlPrice(): Promise<number> {
  const res = await fetch(
    'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=brl',
    { headers: { Accept: 'application/json' }, next: { revalidate: 120 } }
  )
  if (!res.ok) throw new Error(`coingecko ${res.status}`)
  const data = await res.json() as { bitcoin?: { brl?: number } }
  const price = data.bitcoin?.brl
  if (!price || price <= 0) throw new Error('coingecko: invalid price')
  return price
}

async function _fetchBtcPriceHistoryBrl(): Promise<{ history: PricePoint[]; currentPrice: number }> {
  const url = `${BINANCE_BASE}/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=1100`
  const [klines, currentBrlPrice] = await Promise.all([
    fetchJson<BinanceKline[]>(url),
    fetchCurrentBrlPrice(),
  ])

  const closes = klines.map(k => parseFloat(k[4]))
  const lastUsdtClose = closes[closes.length - 1]
  if (!lastUsdtClose || lastUsdtClose <= 0) throw new Error('Invalid BTCUSDT data')

  const usdToBrl = currentBrlPrice / lastUsdtClose

  const history: PricePoint[] = klines.map(k => ({
    date:  new Date(k[0]).toISOString().slice(0, 10),
    price: Math.round(parseFloat(k[4]) * usdToBrl),
  }))

  return { history, currentPrice: currentBrlPrice }
}

export const fetchBtcPriceHistoryBrl = unstable_cache(
  _fetchBtcPriceHistoryBrl,
  ['btc-price-history-brl'],
  { revalidate: 3600 },
)
```

- [ ] **Step 2: Create API route**

```typescript
// src/app/api/btc-price-history/route.ts
import { NextResponse } from 'next/server'
import { fetchBtcPriceHistoryBrl } from '@lib/rentabilidade/fetch-price-history'

export const revalidate = 3600

export async function GET() {
  try {
    const data = await fetchBtcPriceHistoryBrl()
    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

- [ ] **Step 3: Start dev server and verify the route works**

```bash
# In a separate terminal:
npm run dev

# Then:
curl http://localhost:3000/api/btc-price-history | head -c 200
```

Expected: JSON with `history` array (1100 items) and `currentPrice` number.

- [ ] **Step 4: Commit**

```bash
git add lib/rentabilidade/fetch-price-history.ts src/app/api/btc-price-history/route.ts
git commit -m "feat(rentabilidade): add BTC price history fetch + API route"
```

---

## Task 3: Wire page.tsx

**Files:**
- Modify: `src/app/rentabilidade/page.tsx`

- [ ] **Step 1: Replace page.tsx**

```typescript
// src/app/rentabilidade/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { listDcaContributions } from '@/repositories/dca-contributions'
import { fetchBtcPriceHistoryBrl } from '@lib/rentabilidade/fetch-price-history'
import { computePatrimonio } from '@lib/rentabilidade/compute'
import AppNav from '@/components/shared/AppNav'
import RentabilidadeView from '@/components/rentabilidade/RentabilidadeView'

export const metadata = { title: 'Rentabilidade — BTC Monitor' }

export default async function RentabilidadePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [contributions, { history, currentPrice }] = await Promise.all([
    listDcaContributions(supabase, user.id, 1000),
    fetchBtcPriceHistoryBrl(),
  ])

  const patrimonio = computePatrimonio(contributions, history, currentPrice)
  const avatarUrl  = (user.user_metadata?.avatar_url ?? null) as string | null

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      <AppNav userEmail={user.email ?? ''} userAvatarUrl={avatarUrl} />
      <main style={{ padding: '32px 24px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <RentabilidadeView patrimonio={patrimonio} />
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: errors only about missing `RentabilidadeView` props (expected — will be fixed in Task 8).

- [ ] **Step 3: Commit**

```bash
git add src/app/rentabilidade/page.tsx
git commit -m "feat(rentabilidade): wire page.tsx with server-side computation"
```

---

## Task 4: PatrimonioHero Component

**Files:**
- Create: `src/components/rentabilidade/PatrimonioHero.tsx`

- [ ] **Step 1: Create PatrimonioHero.tsx**

```typescript
// src/components/rentabilidade/PatrimonioHero.tsx
'use client'
import type { PatrimonioData } from '@lib/rentabilidade/types'

const fmt0 = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n)

const fmtBtc = (n: number) =>
  n.toFixed(8).replace(/\.?0+$/, '') + ' ₿'

function Sparkline({ history }: { history: { date: string; price: number }[] }) {
  const recent = history.slice(-30)
  if (recent.length < 2) return null
  const min = Math.min(...recent.map(p => p.price))
  const max = Math.max(...recent.map(p => p.price))
  const range = max - min || 1
  const w = 90
  const h = 32
  const pts = recent.map((p, i) => {
    const x = (i / (recent.length - 1)) * w
    const y = h - ((p.price - min) / range) * (h - 4) - 2
    return `${x},${y}`
  }).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: w, height: h }}>
      <defs>
        <linearGradient id="spark-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4ade80" stopOpacity={0.3} />
          <stop offset="100%" stopColor="#4ade80" stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill="url(#spark-g)" />
      <polyline points={pts} fill="none" stroke="#4ade80" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={w} cy={recent[recent.length - 1] ? h - ((recent[recent.length - 1].price - min) / range) * (h - 4) - 2 : h / 2} r={2.5} fill="#4ade80" />
    </svg>
  )
}

interface Props { patrimonio: PatrimonioData }

export default function PatrimonioHero({ patrimonio }: Props) {
  const {
    currentValue, totalInvested, totalReturn, totalReturnBrl,
    avgPrice, totalBtc, contributionCount, currentBtcPrice, priceHistory,
  } = patrimonio

  const returnColor  = totalReturn >= 0 ? '#4ade80' : '#ef4444'
  const returnPrefix = totalReturn >= 0 ? '▲' : '▼'

  return (
    <div style={{
      background:     'linear-gradient(135deg, #0c1a24 0%, #112233 50%, #0c1a24 100%)',
      border:         '1px solid rgba(251,191,36,0.2)',
      borderRadius:   '14px',
      padding:        '24px 28px',
      position:       'relative',
      overflow:       'hidden',
      marginBottom:   '14px',
    }}>
      {/* glow */}
      <div style={{
        position: 'absolute', top: '-40px', left: '50%', transform: 'translateX(-50%)',
        width: '320px', height: '100px',
        background: 'radial-gradient(ellipse, rgba(251,191,36,0.1), transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{
            fontSize: '8px', color: '#fbbf24', textTransform: 'uppercase',
            letterSpacing: '2.5px', marginBottom: '10px', fontWeight: 700,
          }}>
            Patrimônio Bitcoin
          </div>
          <div style={{ fontSize: '34px', fontWeight: 900, color: '#fff', letterSpacing: '-1.5px', lineHeight: 1, marginBottom: '10px' }}>
            {fmt0(currentValue)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '14px', color: returnColor, fontWeight: 800 }}>
              {returnPrefix} {Math.abs(totalReturn).toFixed(1).replace('.', ',')}%
            </span>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
              {totalReturn >= 0 ? '+' : ''}{fmt0(totalReturnBrl)} total
            </span>
          </div>
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.35)', marginBottom: '6px' }}>BTC / 30 dias</div>
          <div style={{
            background: 'rgba(74,222,128,0.08)', borderRadius: '8px',
            padding: '5px', border: '1px solid rgba(74,222,128,0.15)',
          }}>
            <Sparkline history={priceHistory} />
          </div>
          <div style={{ fontSize: '10px', color: '#4ade80', fontWeight: 700, marginTop: '5px' }}>
            {fmt0(currentBtcPrice)}
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px',
        marginTop: '20px', paddingTop: '18px',
        borderTop: '1px solid rgba(255,255,255,0.07)',
      }}>
        {[
          { label: 'Preço médio DCA', value: fmt0(avgPrice),        color: '#fbbf24' },
          { label: 'BTC acumulado',   value: fmtBtc(totalBtc),      color: '#fff'    },
          { label: 'Total investido', value: fmt0(totalInvested),    color: '#fff'    },
          { label: 'Aportes',         value: String(contributionCount), color: '#fff' },
        ].map(kpi => (
          <div key={kpi.label}>
            <div style={{ fontSize: '7.5px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px' }}>
              {kpi.label}
            </div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: kpi.color }}>
              {kpi.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/rentabilidade/PatrimonioHero.tsx
git commit -m "feat(rentabilidade): add PatrimonioHero component"
```

---

## Task 5: BtcChart Component (recharts)

**Files:**
- Create: `src/components/rentabilidade/BtcChart.tsx`

- [ ] **Step 1: Create BtcChart.tsx**

Uses recharts `ComposedChart` with `Area` for price history and `Scatter` for contribution dots. Both share X axis (numeric timestamp) and Y axis (BRL price).

```typescript
// src/components/rentabilidade/BtcChart.tsx
'use client'
import {
  ComposedChart, Area, Scatter, XAxis, YAxis, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from 'recharts'
import { colorForReturn } from '@lib/rentabilidade/compute'
import type { PatrimonioData } from '@lib/rentabilidade/types'

const fmtBrl = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n)

const fmtDate = (ts: number) => {
  const d = new Date(ts)
  return d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
}

// Shape used by Scatter — recharts passes cx, cy (pixel coords) and payload (data point)
function CustomDot(props: { cx?: number; cy?: number; payload?: ScatterPoint }) {
  const { cx = 0, cy = 0, payload } = props
  const color = colorForReturn(payload?.returnPct ?? 0)
  return (
    <g>
      <circle cx={cx} cy={cy} r={6} fill={color} stroke="var(--bg)" strokeWidth={1.5} opacity={0.9} />
    </g>
  )
}

type ScatterPoint = { ts: number; y: number; returnPct: number; amountBrl: number; btcAmount: number }

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ScatterPoint | { ts: number; price: number } }> }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d || !('returnPct' in d)) return null
  const color = colorForReturn(d.returnPct)
  return (
    <div style={{
      background: 'rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '6px', padding: '8px 12px', fontSize: '11px', lineHeight: 1.6,
    }}>
      <div style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '2px' }}>{new Date(d.ts).toLocaleDateString('pt-BR')}</div>
      <div style={{ color, fontWeight: 700 }}>
        {d.returnPct >= 0 ? '+' : ''}{d.returnPct.toFixed(1).replace('.', ',')}%
      </div>
      <div style={{ color: 'rgba(255,255,255,0.6)' }}>{fmtBrl(d.y)} (entrada)</div>
      <div style={{ color: 'rgba(255,255,255,0.6)' }}>{fmtBrl(d.amountBrl)} · {d.btcAmount.toFixed(6)} BTC</div>
    </div>
  )
}

function buildAreaData(history: PatrimonioData['priceHistory']) {
  return history.map(p => ({ ts: new Date(p.date).getTime(), price: p.price }))
}

function buildScatterData(contributions: PatrimonioData['contributions']): ScatterPoint[] {
  return contributions.map(c => ({
    ts:        new Date(c.date).getTime(),
    y:         c.btcPriceBrl,
    returnPct: c.returnPct,
    amountBrl: c.amountBrl,
    btcAmount: c.btcAmount,
  }))
}

interface Props { patrimonio: PatrimonioData }

export default function BtcChart({ patrimonio }: Props) {
  const { priceHistory, contributions, avgPrice } = patrimonio
  const areaData    = buildAreaData(priceHistory)
  const scatterData = buildScatterData(contributions)

  const minTs = areaData[0]?.ts ?? 0
  const maxTs = areaData[areaData.length - 1]?.ts ?? Date.now()

  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '14px', padding: '16px 18px', marginBottom: '14px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
          Histórico BTC + Seus Aportes
        </div>
        <div style={{ display: 'flex', gap: '14px', fontSize: '8px' }}>
          <span style={{ color: '#fbbf24' }}>— Preço BTC</span>
          <span style={{ color: '#4ade80' }}>● Em lucro</span>
          <span style={{ color: '#ef4444' }}>● Em prejuízo</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="btc-area-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#fbbf24" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <XAxis
            dataKey="ts"
            type="number"
            scale="time"
            domain={[minTs, maxTs]}
            tickFormatter={fmtDate}
            tickCount={7}
            stroke="rgba(255,255,255,0.1)"
            tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }}
          />
          <YAxis
            tickFormatter={n => `R$${Math.round(n / 1000)}k`}
            stroke="rgba(255,255,255,0.1)"
            tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }}
            width={60}
          />

          <Tooltip content={<CustomTooltip />} />

          <ReferenceLine
            y={avgPrice}
            stroke="rgba(251,191,36,0.35)"
            strokeDasharray="4 4"
            label={{ value: 'Preço médio', fill: 'rgba(251,191,36,0.55)', fontSize: 9, position: 'insideTopLeft' }}
          />

          <Area
            data={areaData}
            dataKey="price"
            type="monotone"
            stroke="#fbbf24"
            strokeWidth={1.5}
            fill="url(#btc-area-grad)"
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />

          <Scatter
            data={scatterData}
            dataKey="y"
            shape={<CustomDot />}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/rentabilidade/BtcChart.tsx
git commit -m "feat(rentabilidade): add BtcChart with recharts ComposedChart"
```

---

## Task 6: InsightsPanel Component

**Files:**
- Create: `src/components/rentabilidade/InsightsPanel.tsx`

- [ ] **Step 1: Create InsightsPanel.tsx**

```typescript
// src/components/rentabilidade/InsightsPanel.tsx
import type { InsightData } from '@lib/rentabilidade/types'

function InsightCard({
  label, value, valueColor, sub, last,
}: {
  label: string; value: string; valueColor: string; sub: string; last?: boolean
}) {
  return (
    <div style={{
      paddingBottom: last ? 0 : '12px',
      marginBottom:  last ? 0 : '12px',
      borderBottom:  last ? 'none' : '1px solid rgba(255,255,255,0.05)',
    }}>
      <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
        {label}
      </div>
      <div style={{ fontSize: '13px', fontWeight: 800, color: valueColor, marginBottom: '2px' }}>
        {value}
      </div>
      <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.4 }}>
        {sub}
      </div>
    </div>
  )
}

interface Props { insights: InsightData }

export default function InsightsPanel({ insights }: Props) {
  const { bestContribution, profitableCount, totalCount, dcaVsLumpSumPct } = insights

  const accuracy = totalCount > 0 ? Math.round((profitableCount / totalCount) * 100) : 0

  const dcaInsight = dcaVsLumpSumPct !== null
    ? {
        value:      `DCA gerou ${dcaVsLumpSumPct >= 0 ? '+' : ''}${dcaVsLumpSumPct.toFixed(1)}% extra`,
        valueColor: dcaVsLumpSumPct >= 0 ? '#fbbf24' : '#ef4444',
        sub:        `vs compra única no primeiro aporte`,
      }
    : { value: 'Dados insuficientes', valueColor: 'rgba(255,255,255,0.4)', sub: 'Precisa de ao menos 2 aportes' }

  return (
    <div style={{
      background:   'rgba(251,191,36,0.04)',
      border:       '1px solid rgba(251,191,36,0.12)',
      borderRadius: '14px',
      padding:      '16px 18px',
    }}>
      <div style={{
        fontSize: '8px', color: '#fbbf24', textTransform: 'uppercase',
        letterSpacing: '1.5px', marginBottom: '14px', fontWeight: 700,
      }}>
        ✦ Insights
      </div>

      <InsightCard
        label="Melhor aporte"
        value={`${bestContribution.label} · +${bestContribution.returnPct.toFixed(0)}%`}
        valueColor="#4ade80"
        sub="Maior retorno individual da sua carteira"
      />
      <InsightCard
        label="DCA eficiente"
        value={`${profitableCount} de ${totalCount} aportes em lucro`}
        valueColor="#fff"
        sub={`${accuracy}% de taxa de acerto`}
      />
      <InsightCard
        label="DCA vs compra única"
        value={dcaInsight.value}
        valueColor={dcaInsight.valueColor}
        sub={dcaInsight.sub}
        last
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/rentabilidade/InsightsPanel.tsx
git commit -m "feat(rentabilidade): add InsightsPanel component"
```

---

## Task 7: AporteHeatmap Component

**Files:**
- Create: `src/components/rentabilidade/AporteHeatmap.tsx`

- [ ] **Step 1: Create AporteHeatmap.tsx**

Calendar grid: rows=years, columns=Jan–Dez. Fixed cell height 22px. Empty months = dim grey. Uses `colorForReturn` and `textColorForReturn` from compute.ts.

```typescript
// src/components/rentabilidade/AporteHeatmap.tsx
import { colorForReturn, textColorForReturn } from '@lib/rentabilidade/compute'
import type { HeatmapCell } from '@lib/rentabilidade/types'

const MONTH_LABELS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function formatReturn(pct: number): string {
  const abs = Math.abs(pct)
  if (abs >= 100) return `${pct >= 0 ? '+' : ''}${Math.round(pct)}%`
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(0)}%`
}

interface Props { heatmap: HeatmapCell[] }

export default function AporteHeatmap({ heatmap }: Props) {
  if (heatmap.length === 0) return null

  const years = Array.from(new Set(heatmap.map(c => c.year))).sort()

  // Build lookup: "year-month" → HeatmapCell
  const lookup = new Map(heatmap.map(c => [`${c.year}-${c.month}`, c]))

  return (
    <div style={{
      background:   'rgba(255,255,255,0.02)',
      border:       '1px solid rgba(255,255,255,0.07)',
      borderRadius: '14px',
      padding:      '16px 18px',
    }}>
      <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '12px' }}>
        Retorno por Aporte
      </div>

      {/* Month header */}
      <div style={{ display: 'grid', gridTemplateColumns: '36px repeat(12, 1fr)', gap: '4px', marginBottom: '4px' }}>
        <div />
        {MONTH_LABELS.map(m => (
          <div key={m} style={{ fontSize: '7px', color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>{m}</div>
        ))}
      </div>

      {/* Year rows */}
      {years.map(year => (
        <div key={year} style={{ display: 'grid', gridTemplateColumns: '36px repeat(12, 1fr)', gap: '4px', marginBottom: '4px', alignItems: 'center' }}>
          <div style={{ fontSize: '7.5px', color: 'rgba(255,255,255,0.35)', textAlign: 'right', paddingRight: '6px' }}>
            {year}
          </div>
          {Array.from({ length: 12 }, (_, i) => i + 1).map(month => {
            const cell = lookup.get(`${year}-${month}`)
            if (!cell) {
              return (
                <div key={month} style={{ height: '22px', borderRadius: '3px', background: 'rgba(255,255,255,0.06)' }} />
              )
            }
            const bg   = colorForReturn(cell.returnPct)
            const text = textColorForReturn(cell.returnPct)
            return (
              <div
                key={month}
                title={`${new Date(cell.date + 'T00:00:00').toLocaleDateString('pt-BR')} · ${formatReturn(cell.returnPct)} · R$${Math.round(cell.amountBrl).toLocaleString('pt-BR')}`}
                style={{
                  height:          '22px',
                  borderRadius:    '3px',
                  background:      bg,
                  display:         'flex',
                  alignItems:      'center',
                  justifyContent:  'center',
                  cursor:          'default',
                }}
              >
                <span style={{ fontSize: '6px', color: text, fontWeight: 700, letterSpacing: '-0.3px' }}>
                  {formatReturn(cell.returnPct)}
                </span>
              </div>
            )
          })}
        </div>
      ))}

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
        <span style={{ fontSize: '7px', color: 'rgba(255,255,255,0.3)' }}>Prejuízo</span>
        <div style={{ height: '5px', flex: 1, background: 'linear-gradient(to right, #7f1d1d, #991b1b, #166534, #22c55e, #86efac, #dcfce7)', borderRadius: '3px' }} />
        <span style={{ fontSize: '7px', color: 'rgba(255,255,255,0.3)' }}>Lucro</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/rentabilidade/AporteHeatmap.tsx
git commit -m "feat(rentabilidade): add AporteHeatmap calendar grid component"
```

---

## Task 8: Replace RentabilidadeView

**Files:**
- Modify: `src/components/rentabilidade/RentabilidadeView.tsx`

- [ ] **Step 1: Replace RentabilidadeView.tsx**

Old file: 12.4K, fetches BTC price client-side, renders table. New file: pure renderer, receives `PatrimonioData`, renders 4 sub-components in layout A.

```typescript
// src/components/rentabilidade/RentabilidadeView.tsx
'use client'
import type { PatrimonioData } from '@lib/rentabilidade/types'
import PatrimonioHero from './PatrimonioHero'
import BtcChart from './BtcChart'
import InsightsPanel from './InsightsPanel'
import AporteHeatmap from './AporteHeatmap'

interface Props { patrimonio: PatrimonioData }

export default function RentabilidadeView({ patrimonio }: Props) {
  if (patrimonio.contributionCount === 0) {
    return (
      <div style={{
        padding: '32px 24px', background: 'var(--surface)',
        border: '1px solid var(--border)', borderRadius: '12px',
        fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center',
      }}>
        Nenhum aporte com BTC registrado encontrado.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* ① Hero */}
      <PatrimonioHero patrimonio={patrimonio} />

      {/* ② Chart */}
      <BtcChart patrimonio={patrimonio} />

      {/* ③ Insights + Heatmap */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '14px' }}>
        <InsightsPanel insights={patrimonio.insights} />
        <AporteHeatmap heatmap={patrimonio.heatmap} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run full test suite**

```bash
npx vitest run
```

Expected: all tests PASS (38 existing + new compute tests)

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Open browser at /rentabilidade and verify**

Start dev server if not running: `npm run dev`

Navigate to `http://localhost:3000/rentabilidade`. Verify:
- Hero card shows patrimônio value, return %, KPI row, sparkline
- Chart shows gold area curve with colored dots
- Insights panel shows 3 cards
- Heatmap shows calendar grid with colored cells

- [ ] **Step 5: Commit**

```bash
git add src/components/rentabilidade/RentabilidadeView.tsx
git commit -m "feat(rentabilidade): replace table with premium wealth dashboard"
```
