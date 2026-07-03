# Halving Countdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a live, ticking digital countdown to the next Bitcoin halving on the public landing page, driven by real block height data.

**Architecture:** A pure function computes the halving estimate from a block height; a Next.js API route fetches the current height from mempool.space and wraps that function; a client component polls the route every 5 minutes and ticks the displayed countdown every second between polls. No database writes, no new dependencies.

**Tech Stack:** Next.js App Router, TypeScript, Vitest (unit tests), inline styles with existing CSS custom properties (`var(--orange)`, `var(--surface2)`, etc.)

## Global Constraints

- No new npm dependencies.
- No hardcoded halving date — always derived from live block height (spec: "Fonte dados" = live block height via mempool.space).
- Next halving block: `1050000` (`840000 + 210000`).
- Average block time for ETA math: `600` seconds.
- API route caching: `next: { revalidate: 300 }`, matching `src/app/api/btc-mining/route.ts`.
- On upstream fetch failure, API route returns `503` with `{ error: string }` — no fabricated fallback date (matches `btc-mining` pattern).
- Component must render loading (`--` placeholders) and error (fallback message) states without layout shift or thrown errors.
- Portuguese strings only, matching rest of landing page. No emoji.
- Section placed between `<LandingHero />` and `<AppPreviewTabs />` in `src/app/page.tsx`.

---

### Task 1: Pure halving estimate function

**Files:**
- Create: `src/lib/btc/halving.ts`
- Test: `src/lib/btc/__tests__/halving.test.ts`

**Interfaces:**
- Produces: `computeHalvingEstimate(currentHeight: number, now?: Date): HalvingEstimate` where
  ```typescript
  interface HalvingEstimate {
    nextHalvingBlock: number
    remainingBlocks:  number
    estimatedDate:    string  // ISO 8601
    epochProgressPct: number  // 0-100, 2 decimals
  }
  ```
  Also exports `NEXT_HALVING_BLOCK = 1_050_000`.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/btc/__tests__/halving.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { computeHalvingEstimate, NEXT_HALVING_BLOCK } from '../halving'

describe('computeHalvingEstimate', () => {
  it('exports the correct next halving block', () => {
    expect(NEXT_HALVING_BLOCK).toBe(1_050_000)
  })

  it('at the start of the epoch, has full blocks remaining and 0% progress', () => {
    const now = new Date('2024-04-20T00:00:00.000Z')
    const result = computeHalvingEstimate(840_000, now)

    expect(result.nextHalvingBlock).toBe(1_050_000)
    expect(result.remainingBlocks).toBe(210_000)
    expect(result.epochProgressPct).toBe(0)
    expect(result.estimatedDate).toBe(new Date(now.getTime() + 210_000 * 600 * 1000).toISOString())
  })

  it('halfway through the epoch, has half blocks remaining and 50% progress', () => {
    const now = new Date('2026-01-01T00:00:00.000Z')
    const result = computeHalvingEstimate(945_000, now)

    expect(result.remainingBlocks).toBe(105_000)
    expect(result.epochProgressPct).toBe(50)
  })

  it('at the halving block, has 0 blocks remaining and 100% progress', () => {
    const now = new Date('2028-04-01T00:00:00.000Z')
    const result = computeHalvingEstimate(1_050_000, now)

    expect(result.remainingBlocks).toBe(0)
    expect(result.epochProgressPct).toBe(100)
    expect(result.estimatedDate).toBe(now.toISOString())
  })

  it('clamps remaining blocks and progress once past the halving block', () => {
    const now = new Date('2028-05-01T00:00:00.000Z')
    const result = computeHalvingEstimate(1_060_000, now)

    expect(result.remainingBlocks).toBe(0)
    expect(result.epochProgressPct).toBe(100)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/btc/__tests__/halving.test.ts`
Expected: FAIL — `Cannot find module '../halving'` (or similar module-not-found error)

- [ ] **Step 3: Write the implementation**

Create `src/lib/btc/halving.ts`:

```typescript
const NEXT_HALVING_BLOCK = 1_050_000
const PREV_HALVING_BLOCK = 840_000
const HALVING_EPOCH_BLOCKS = 210_000
const AVG_BLOCK_SECONDS = 600

export { NEXT_HALVING_BLOCK }

export interface HalvingEstimate {
  nextHalvingBlock: number
  remainingBlocks:  number
  estimatedDate:    string
  epochProgressPct: number
}

export function computeHalvingEstimate(currentHeight: number, now: Date = new Date()): HalvingEstimate {
  const remainingBlocks = Math.max(0, NEXT_HALVING_BLOCK - currentHeight)
  const estimatedMs = now.getTime() + remainingBlocks * AVG_BLOCK_SECONDS * 1000
  const rawProgressPct = ((currentHeight - PREV_HALVING_BLOCK) / HALVING_EPOCH_BLOCKS) * 100
  const epochProgressPct = Math.min(100, Math.max(0, rawProgressPct))

  return {
    nextHalvingBlock: NEXT_HALVING_BLOCK,
    remainingBlocks,
    estimatedDate: new Date(estimatedMs).toISOString(),
    epochProgressPct: parseFloat(epochProgressPct.toFixed(2)),
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/lib/btc/__tests__/halving.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/btc/halving.ts src/lib/btc/__tests__/halving.test.ts
git commit -m "feat(halving): add pure halving estimate calculation"
```

---

### Task 2: `/api/btc-halving` route

**Files:**
- Create: `src/app/api/btc-halving/route.ts`

**Interfaces:**
- Consumes: `computeHalvingEstimate(currentHeight: number, now?: Date): HalvingEstimate` from `@/lib/btc/halving` (Task 1).
- Produces: `GET` handler returning JSON `{ currentHeight: number, nextHalvingBlock: number, remainingBlocks: number, estimatedDate: string, epochProgressPct: number }` on success, or `{ error: string }` with status `503` on failure. This exact shape is consumed by `HalvingCountdown` in Task 3.

No unit test for this task — the project has no existing tests for API routes (`btc-mining`, `sth-lth-prices`, etc. are all untested; only pure `lib` functions and a couple of dashboard components have tests). Verified manually via `curl` in Step 2.

- [ ] **Step 1: Write the route**

Create `src/app/api/btc-halving/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { computeHalvingEstimate } from '@/lib/btc/halving'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const res = await fetch('https://mempool.space/api/blocks/tip/height', { next: { revalidate: 300 } })
    if (!res.ok) throw new Error('mempool.space indisponível')

    const text = await res.text()
    const currentHeight = parseInt(text, 10)
    if (!Number.isFinite(currentHeight)) throw new Error('Altura de bloco inválida')

    const estimate = computeHalvingEstimate(currentHeight)

    return NextResponse.json({ currentHeight, ...estimate })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 503 })
  }
}
```

- [ ] **Step 2: Verify manually against the real API**

Run: `npm run dev` (in background), then in another shell:
`curl -s localhost:3000/api/btc-halving | node -e "console.log(JSON.parse(require('fs').readFileSync(0,'utf8')))"`

Expected: JSON object with `currentHeight` around 900,000+ (current mainnet height), `nextHalvingBlock: 1050000`, `remainingBlocks` a positive number under 210,000, `estimatedDate` a future ISO date, `epochProgressPct` between 0 and 100.

Stop the dev server after verifying.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/btc-halving/route.ts
git commit -m "feat(halving): add /api/btc-halving route"
```

---

### Task 3: `HalvingCountdown` component

**Files:**
- Create: `src/components/landing/HalvingCountdown.tsx`

**Interfaces:**
- Consumes: `GET /api/btc-halving` (Task 2), response shape `{ currentHeight, nextHalvingBlock, remainingBlocks, estimatedDate, epochProgressPct }`.
- Produces: default export `HalvingCountdown` (no props) — a `'use client'` React component, consumed by `src/app/page.tsx` in Task 4.

No automated test for this task — no existing landing components have tests in this project (`LandingHero`, `IndicatorsSection`, etc. are all untested UI). Verified manually via browser in Task 4, Step 2.

- [ ] **Step 1: Write the component**

Create `src/components/landing/HalvingCountdown.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'

interface HalvingData {
  currentHeight:    number
  nextHalvingBlock: number
  remainingBlocks:  number
  estimatedDate:    string
  epochProgressPct: number
}

interface TimeLeft {
  days:    number
  hours:   number
  minutes: number
  seconds: number
}

function diffToTimeLeft(targetMs: number, nowMs: number): TimeLeft {
  const diffSec = Math.max(0, Math.floor((targetMs - nowMs) / 1000))
  return {
    days:    Math.floor(diffSec / 86400),
    hours:   Math.floor((diffSec % 86400) / 3600),
    minutes: Math.floor((diffSec % 3600) / 60),
    seconds: diffSec % 60,
  }
}

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

function DigitCard({ value, label }: { value: string; label: string }) {
  return (
    <div style={{
      background:   'var(--surface2)',
      border:       '1px solid var(--border-dim)',
      borderRadius: '8px',
      padding:      '16px 12px',
      textAlign:    'center',
      minWidth:     '72px',
    }}>
      <div style={{
        fontSize:           '28px',
        fontWeight:         700,
        color:              'var(--text)',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
      </div>
      <div style={{
        fontSize:      '10px',
        color:         'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginTop:     '4px',
      }}>
        {label}
      </div>
    </div>
  )
}

export default function HalvingCountdown() {
  const [data, setData]   = useState<HalvingData | null>(null)
  const [error, setError] = useState(false)
  const [now, setNow]     = useState(() => Date.now())

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await fetch('/api/btc-halving')
        if (!res.ok) throw new Error('failed')
        const json: HalvingData = await res.json()
        if (!cancelled) {
          setData(json)
          setError(false)
        }
      } catch {
        if (!cancelled) setError(true)
      }
    }

    load()
    const refetchId = setInterval(load, 300_000)
    return () => { cancelled = true; clearInterval(refetchId) }
  }, [])

  useEffect(() => {
    const tickId = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(tickId)
  }, [])

  const timeLeft = data ? diffToTimeLeft(new Date(data.estimatedDate).getTime(), now) : null

  return (
    <section style={{ padding: '80px 24px', maxWidth: '720px', margin: '0 auto', textAlign: 'center' }}>
      <div style={{
        fontSize:      '11px',
        fontWeight:    600,
        color:         'var(--orange)',
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        marginBottom:  '8px',
      }}>
        Próximo Halving
      </div>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text)', margin: '0 0 32px' }}>
        Contagem regressiva até a próxima redução de emissão
      </h2>

      {error ? (
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Estimativa indisponível no momento.
        </p>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '20px' }}>
            <DigitCard value={timeLeft ? String(timeLeft.days) : '--'} label="Dias" />
            <DigitCard value={timeLeft ? pad(timeLeft.hours) : '--'} label="Horas" />
            <DigitCard value={timeLeft ? pad(timeLeft.minutes) : '--'} label="Min" />
            <DigitCard value={timeLeft ? pad(timeLeft.seconds) : '--'} label="Seg" />
          </div>

          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
            {data
              ? `≈ ${new Date(data.estimatedDate).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })} · faltam ${data.remainingBlocks.toLocaleString('pt-BR')} blocos até o bloco ${data.nextHalvingBlock.toLocaleString('pt-BR')}`
              : 'Carregando estimativa...'}
          </p>
        </>
      )}
    </section>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: no new errors introduced by `HalvingCountdown.tsx`

- [ ] **Step 3: Commit**

```bash
git add src/components/landing/HalvingCountdown.tsx
git commit -m "feat(halving): add HalvingCountdown client component"
```

---

### Task 4: Wire into the landing page

**Files:**
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `HalvingCountdown` default export from `@/components/landing/HalvingCountdown` (Task 3).

- [ ] **Step 1: Add the import and render it between Hero and AppPreviewTabs**

In `src/app/page.tsx`, add the import alongside the other landing imports:

```tsx
import LandingHero            from '@/components/landing/LandingHero'
import HalvingCountdown       from '@/components/landing/HalvingCountdown'
import AppPreviewTabs         from '@/components/landing/AppPreviewTabs'
```

And update the `<main>` block:

```tsx
<main>
  <LandingHero          isAuthenticated={isAuthenticated} />
  <HalvingCountdown />
  <AppPreviewTabs />
  <IndicatorsSection />
  <HowItWorksSection />
  <DifferentialsSection />
  <LandingCTA           isAuthenticated={isAuthenticated} />
</main>
```

- [ ] **Step 2: Manually verify in the browser**

Run: `npm run dev`, open `http://localhost:3000/` unauthenticated (log out first if needed).

Verify:
- New "Próximo Halving" section appears between the Hero and the app preview tabs.
- Digit cards initially show `--` placeholders, then populate with real numbers within ~1s.
- The seconds digit visibly changes every second; no layout shift when digits change width (e.g. `9` → `10`).
- Subtext line shows a plausible future date and block counts.
- No console errors.

Stop the dev server after verifying.

- [ ] **Step 3: Run full test suite and type-check**

Run: `npm test && npm run type-check`
Expected: all tests pass (including the 5 new ones from Task 1), no type errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(halving): wire HalvingCountdown into landing page"
```

---

## Self-Review Notes

- **Spec coverage:** API route (Task 2) ✓, live block-height math (Task 1) ✓, client-ticking countdown with 5-min refetch (Task 3) ✓, loading/error states (Task 3) ✓, placement between Hero and AppPreviewTabs (Task 4) ✓, visual style reusing existing CSS vars (Task 3) ✓.
- **No placeholders:** all code blocks are complete and runnable as written.
- **Type consistency:** `HalvingEstimate` (Task 1) fields (`nextHalvingBlock`, `remainingBlocks`, `estimatedDate`, `epochProgressPct`) match the route's spread response (Task 2) and the `HalvingData` interface consumed in the component (Task 3) exactly.
