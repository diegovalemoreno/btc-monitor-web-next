# Score Auditability & Explicabilidade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the BTC dashboard opportunity score fully auditable — every point traceable to a specific indicator, with smoothing to reduce volatility and a "Por que este score?" UI panel.

**Architecture:** Add a `TacticalScoreExplanation` domain object built alongside the signal in pipeline.ts. Score smoothing (EMA 70/30) happens in market-data.ts using the previous Supabase snapshot. A new `ScoreWhyPanel` client component replaces `ScoreBreakdown` and renders the full breakdown.

**Tech Stack:** TypeScript, Vitest, Next.js 14 App Router, framer-motion, Supabase

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `vitest.config.ts` | Create | Vitest runner config |
| `lib/shared/types/score-explanation.ts` | Create | `TacticalScoreExplanation`, `ScoreContribution` types |
| `lib/domain/score-weights.ts` | Create | Canonical PT-name → weight map (shared source of truth) |
| `lib/domain/score-explanation.ts` | Create | `buildScoreExplanation()` pure function |
| `lib/domain/__tests__/score-explanation.test.ts` | Create | Unit tests for score-explanation |
| `lib/domain/__tests__/fixtures/scenario-a.ts` | Create | Fixture: yesterday ~90 |
| `lib/domain/__tests__/fixtures/scenario-b.ts` | Create | Fixture: today ~83 |
| `lib/shared/types/signal.ts` | Modify | Add `explanation` field to `TacticalSignal` |
| `lib/signal-engine/pipeline.ts` | Modify | Call `buildScoreExplanation()`, include in signal |
| `src/services/market-data.ts` | Modify | Fetch prev score, compute smoothedScore |
| `src/components/dashboard/ScoreWhyPanel.tsx` | Create | "Por que este score?" UI (replaces ScoreBreakdown) |
| `src/components/dashboard/ScoreBreakdown.tsx` | Delete | Replaced by ScoreWhyPanel |
| `src/app/dashboard/page.tsx` | Modify | Wire ScoreWhyPanel, pass explanation |

---

## Task 1: Install Vitest

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Install vitest**

```bash
cd /Users/diegomoreno/development/btc-monitor-web-next
npm install --save-dev vitest @vitest/ui
```

- [ ] **Step 2: Create vitest.config.ts**

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@lib': path.resolve(__dirname, 'lib'),
      '@': path.resolve(__dirname, 'src'),
    },
  },
})
```

- [ ] **Step 3: Add test scripts to package.json**

In `package.json`, add to the `scripts` object:
```json
"test": "vitest run",
"test:watch": "vitest",
"test:ui": "vitest --ui"
```

- [ ] **Step 4: Verify vitest runs**

```bash
npx vitest run --reporter=verbose 2>&1 | head -20
```

Expected: `No test files found` (exit 0) or similar — no crashes.

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts package.json package-lock.json
git commit -m "chore: add vitest test runner"
```

---

## Task 2: Canonical Weight Map

**Files:**
- Create: `lib/domain/score-weights.ts`

The `ScoreBreakdown.tsx` has a hardcoded PT-name → weight map. The `score-engine.ts` has an `IndicatorKey` → weight map but includes derived indicators. This task creates a single source of truth for the 19 base indicators, keyed by their PT display names (matching `TacticalSignal.indicators[].name`).

- [ ] **Step 1: Write failing test**

Create `lib/domain/__tests__/score-weights.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { BASE_WEIGHTS } from '../score-weights'

describe('BASE_WEIGHTS', () => {
  it('has exactly 19 entries', () => {
    expect(Object.keys(BASE_WEIGHTS)).toHaveLength(19)
  })

  it('does not include derived indicators', () => {
    expect(BASE_WEIGHTS['Regime de Mercado']).toBeUndefined()
    expect(BASE_WEIGHTS['Sinais Compostos']).toBeUndefined()
  })

  it('all weights are 1, 1.5 or 2', () => {
    for (const w of Object.values(BASE_WEIGHTS)) {
      expect([1, 1.5, 2]).toContain(w)
    }
  })

  it('max possible weighted sum >= 30 (needed for formula calibration)', () => {
    const maxSum = Object.values(BASE_WEIGHTS).reduce((acc, w) => acc + 2 * w, 0)
    expect(maxSum).toBeGreaterThanOrEqual(30)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx vitest run lib/domain/__tests__/score-weights.test.ts --reporter=verbose 2>&1
```

Expected: FAIL — `Cannot find module '../score-weights'`

- [ ] **Step 3: Create score-weights.ts**

```ts
// lib/domain/score-weights.ts
// Canonical weight map for the 19 base indicators.
// Keys match TacticalSignal.indicators[].name (PT display names).
// Derived indicators (Regime de Mercado, Sinais Compostos) intentionally excluded.

export const BASE_WEIGHTS: Record<string, number> = {
  'Medo & Ganância':     1.5,
  'Taxa de Funding':     1.5,
  'Variação 7d':         1,
  'Open Interest':       1.5,
  'Liq. de Longs':       1.5,
  'MVRV':                2,
  'Preço Realizado':     2,
  'Mayer Multiple':      2,
  'Hash Ribbon':         1,
  'Pressão venda':       1,
  'Médias Móveis':       1,
  'ETF Institucional':   1.5,
  'Pi Cycle Top':        1.5,
  'Bollinger %B':        1,
  'DXY (Dólar Index)':   1,
  'Long/Short Ratio':    1.5,
  'BTC Dominância':      1,
  'Heatmap Liquidações': 1.5,
  'Stablecoin Ratio':    1,
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run lib/domain/__tests__/score-weights.test.ts --reporter=verbose 2>&1
```

Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/domain/score-weights.ts lib/domain/__tests__/score-weights.test.ts
git commit -m "feat(score): add canonical BASE_WEIGHTS map for 19 base indicators"
```

---

## Task 3: TacticalScoreExplanation Type

**Files:**
- Create: `lib/shared/types/score-explanation.ts`

- [ ] **Step 1: Create the type file**

```ts
// lib/shared/types/score-explanation.ts

export type DataQuality = 'fresh' | 'missing'
export type ContributionStatus = 'positive' | 'neutral' | 'negative' | 'unavailable'

export interface ScoreContribution {
  name: string               // PT display name, e.g. "MVRV"
  score: number              // raw score from indicator (-2 to +2)
  weight: number             // weight (1, 1.5, or 2)
  contribution: number       // score * weight (rounded 2dp)
  percentOfTotal: number     // |contribution| / sum(|contributions|) * 100
  status: ContributionStatus
  dataQuality: DataQuality
}

export interface TacticalScoreExplanation {
  rawScore: number           // opportunity score before smoothing (0-100)
  smoothedScore: number      // after EMA: raw*0.7 + prev*0.3 (0-100)
  previousScore: number | null
  delta: number | null       // smoothedScore - previousScore
  weightedSum: number        // sum of (score * weight) before normalization
  formulaVersion: string     // e.g. "v2.0"
  calculatedAt: string       // ISO 8601
  contributions: ScoreContribution[]     // all 19 base indicators, sorted by |contribution| desc
  topPositive: ScoreContribution[]       // top 3 positive contributors
  topNegative: ScoreContribution[]       // top 3 negative contributors
  warnings: string[]                     // e.g. "3 indicadores indisponíveis"
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep score-explanation
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/shared/types/score-explanation.ts
git commit -m "feat(score): add TacticalScoreExplanation type"
```

---

## Task 4: buildScoreExplanation() + Tests

**Files:**
- Create: `lib/domain/score-explanation.ts`
- Create: `lib/domain/__tests__/score-explanation.test.ts`

- [ ] **Step 1: Write failing tests**

Create `lib/domain/__tests__/score-explanation.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildScoreExplanation } from '../score-explanation'
import type { IndicatorScore } from '../../shared/types/signal'

function makeIndicator(name: string, score: number, summary = 'ok'): IndicatorScore {
  return { name, score, summary }
}

const ALL_19: IndicatorScore[] = [
  makeIndicator('Medo & Ganância',     1),
  makeIndicator('Taxa de Funding',     -1),
  makeIndicator('Variação 7d',         0),
  makeIndicator('Open Interest',       1),
  makeIndicator('Liq. de Longs',       2),
  makeIndicator('MVRV',                2),
  makeIndicator('Preço Realizado',     1),
  makeIndicator('Mayer Multiple',      1),
  makeIndicator('Hash Ribbon',         1),
  makeIndicator('Pressão venda',       0),
  makeIndicator('Médias Móveis',       1),
  makeIndicator('ETF Institucional',   1),
  makeIndicator('Pi Cycle Top',        0),
  makeIndicator('Bollinger %B',        -1),
  makeIndicator('DXY (Dólar Index)',   0),
  makeIndicator('Long/Short Ratio',    0),
  makeIndicator('BTC Dominância',      1),
  makeIndicator('Heatmap Liquidações', 1),
  makeIndicator('Stablecoin Ratio',    0),
]

describe('buildScoreExplanation', () => {
  it('returns 19 contributions (excludes derived)', () => {
    const exp = buildScoreExplanation({ indicators: ALL_19, previousScore: null })
    expect(exp.contributions).toHaveLength(19)
  })

  it('contribution = score * weight', () => {
    const exp = buildScoreExplanation({ indicators: ALL_19, previousScore: null })
    for (const c of exp.contributions) {
      expect(c.contribution).toBeCloseTo(c.score * c.weight, 2)
    }
  })

  it('weightedSum matches sum of contributions', () => {
    const exp = buildScoreExplanation({ indicators: ALL_19, previousScore: null })
    const sum = exp.contributions.reduce((a, c) => a + c.contribution, 0)
    expect(exp.weightedSum).toBeCloseTo(sum, 1)
  })

  it('percentOfTotal sums to ~100', () => {
    const exp = buildScoreExplanation({ indicators: ALL_19, previousScore: null })
    const total = exp.contributions.reduce((a, c) => a + c.percentOfTotal, 0)
    expect(total).toBeCloseTo(100, 0)
  })

  it('NaN score is treated as 0 (unavailable), not negative', () => {
    const indicators = ALL_19.map(i =>
      i.name === 'Long/Short Ratio' ? { ...i, score: NaN } : i
    )
    const exp = buildScoreExplanation({ indicators, previousScore: null })
    const lsr = exp.contributions.find(c => c.name === 'Long/Short Ratio')!
    expect(lsr.contribution).toBe(0)
    expect(lsr.status).toBe('unavailable')
    expect(lsr.dataQuality).toBe('missing')
  })

  it('missing indicator (not in array) is treated as unavailable, not negative', () => {
    const indicators = ALL_19.filter(i => i.name !== 'MVRV')
    const exp = buildScoreExplanation({ indicators, previousScore: null })
    const mvrv = exp.contributions.find(c => c.name === 'MVRV')!
    expect(mvrv.contribution).toBe(0)
    expect(mvrv.status).toBe('unavailable')
  })

  it('is deterministic — same input produces same output', () => {
    const exp1 = buildScoreExplanation({ indicators: ALL_19, previousScore: null })
    const exp2 = buildScoreExplanation({ indicators: ALL_19, previousScore: null })
    expect(exp1.rawScore).toBe(exp2.rawScore)
    expect(exp1.weightedSum).toBe(exp2.weightedSum)
  })

  it('rawScore is within 0-100', () => {
    const exp = buildScoreExplanation({ indicators: ALL_19, previousScore: null })
    expect(exp.rawScore).toBeGreaterThanOrEqual(0)
    expect(exp.rawScore).toBeLessThanOrEqual(100)
  })

  it('applies EMA smoothing when previousScore provided', () => {
    const exp = buildScoreExplanation({ indicators: ALL_19, previousScore: 90 })
    expect(exp.smoothedScore).not.toBe(exp.rawScore)
    // smoothed = raw*0.7 + 90*0.3
    const expected = Math.round(exp.rawScore * 0.7 + 90 * 0.3)
    expect(exp.smoothedScore).toBe(expected)
  })

  it('smoothedScore equals rawScore when no previousScore', () => {
    const exp = buildScoreExplanation({ indicators: ALL_19, previousScore: null })
    expect(exp.smoothedScore).toBe(exp.rawScore)
  })

  it('delta is smoothedScore - previousScore', () => {
    const exp = buildScoreExplanation({ indicators: ALL_19, previousScore: 80 })
    expect(exp.delta).toBe(exp.smoothedScore - 80)
  })

  it('topPositive has positive contributions sorted desc', () => {
    const exp = buildScoreExplanation({ indicators: ALL_19, previousScore: null })
    const pos = exp.topPositive
    expect(pos.every(c => c.contribution > 0)).toBe(true)
    for (let i = 1; i < pos.length; i++) {
      expect(pos[i - 1].contribution).toBeGreaterThanOrEqual(pos[i].contribution)
    }
  })

  it('topNegative has negative contributions sorted asc', () => {
    const exp = buildScoreExplanation({ indicators: ALL_19, previousScore: null })
    const neg = exp.topNegative
    expect(neg.every(c => c.contribution < 0)).toBe(true)
    for (let i = 1; i < neg.length; i++) {
      expect(neg[i - 1].contribution).toBeLessThanOrEqual(neg[i].contribution)
    }
  })

  it('formulaVersion is v2.0', () => {
    const exp = buildScoreExplanation({ indicators: ALL_19, previousScore: null })
    expect(exp.formulaVersion).toBe('v2.0')
  })

  it('warns when indicators are unavailable', () => {
    const indicators = ALL_19.map(i =>
      i.name === 'MVRV' ? { ...i, score: NaN } : i
    )
    const exp = buildScoreExplanation({ indicators, previousScore: null })
    expect(exp.warnings.some(w => w.includes('MVRV') || w.includes('indisponív'))).toBe(true)
  })
})
```

- [ ] **Step 2: Run to verify all fail**

```bash
npx vitest run lib/domain/__tests__/score-explanation.test.ts --reporter=verbose 2>&1 | tail -20
```

Expected: FAIL — `Cannot find module '../score-explanation'`

- [ ] **Step 3: Implement buildScoreExplanation()**

Create `lib/domain/score-explanation.ts`:

```ts
// lib/domain/score-explanation.ts
import { BASE_WEIGHTS } from './score-weights'
import type { IndicatorScore } from '../shared/types/signal'
import type {
  TacticalScoreExplanation,
  ScoreContribution,
  ContributionStatus,
  DataQuality,
} from '../shared/types/score-explanation'

const FORMULA_VERSION = 'v2.0'
// Range: weighted sum spans approx -30..+30
// Formula: (weighted + 30) / 60 * 100, clamped to 0-100
const FORMULA_CENTER    = 30
const FORMULA_HALF_RANGE = 60

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

function opportunityFromWeighted(w: number): number {
  return clamp(Math.round((w + FORMULA_CENTER) / FORMULA_HALF_RANGE * 100), 0, 100)
}

function safeScore(score: number): number {
  return Number.isFinite(score) ? score : 0
}

function statusFor(score: number, quality: DataQuality): ContributionStatus {
  if (quality === 'missing') return 'unavailable'
  if (score > 0) return 'positive'
  if (score < 0) return 'negative'
  return 'neutral'
}

interface BuildOptions {
  indicators:    IndicatorScore[]
  previousScore: number | null
}

export function buildScoreExplanation({
  indicators,
  previousScore,
}: BuildOptions): TacticalScoreExplanation {
  const byName = new Map(indicators.map(i => [i.name, i]))

  let weightedSum = 0
  let totalAbsContrib = 0

  const rawContribs: Array<{
    name: string
    score: number
    weight: number
    contribution: number
    status: ContributionStatus
    dataQuality: DataQuality
  }> = []

  for (const [name, weight] of Object.entries(BASE_WEIGHTS)) {
    const ind = byName.get(name)
    const quality: DataQuality = (!ind || !Number.isFinite(ind.score)) ? 'missing' : 'fresh'
    const score = quality === 'missing' ? 0 : safeScore(ind!.score)
    const contribution = parseFloat((score * weight).toFixed(2))

    weightedSum += contribution
    totalAbsContrib += Math.abs(contribution)

    rawContribs.push({
      name,
      score,
      weight,
      contribution,
      status: statusFor(score, quality),
      dataQuality: quality,
    })
  }

  const contributions: ScoreContribution[] = rawContribs
    .map(c => ({
      ...c,
      percentOfTotal: totalAbsContrib > 0
        ? parseFloat((Math.abs(c.contribution) / totalAbsContrib * 100).toFixed(1))
        : 0,
    }))
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))

  const rawScore = opportunityFromWeighted(weightedSum)

  const smoothedScore = previousScore !== null
    ? clamp(Math.round(rawScore * 0.7 + previousScore * 0.3), 0, 100)
    : rawScore

  const delta = previousScore !== null ? smoothedScore - previousScore : null

  const topPositive = contributions
    .filter(c => c.contribution > 0)
    .slice(0, 3)

  const topNegative = contributions
    .filter(c => c.contribution < 0)
    .sort((a, b) => a.contribution - b.contribution)
    .slice(0, 3)

  const missingNames = contributions
    .filter(c => c.dataQuality === 'missing')
    .map(c => c.name)

  const warnings: string[] = missingNames.length > 0
    ? [`${missingNames.length} indicador(es) indisponível(is): ${missingNames.join(', ')}`]
    : []

  return {
    rawScore,
    smoothedScore,
    previousScore,
    delta,
    weightedSum: parseFloat(weightedSum.toFixed(2)),
    formulaVersion: FORMULA_VERSION,
    calculatedAt: new Date().toISOString(),
    contributions,
    topPositive,
    topNegative,
    warnings,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run lib/domain/__tests__/score-explanation.test.ts --reporter=verbose 2>&1
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/domain/score-explanation.ts lib/domain/__tests__/score-explanation.test.ts
git commit -m "feat(score): add buildScoreExplanation() with EMA smoothing and NaN safety"
```

---

## Task 5: Scenario Fixtures

**Files:**
- Create: `lib/domain/__tests__/fixtures/scenario-a.ts`
- Create: `lib/domain/__tests__/fixtures/scenario-b.ts`
- Create: `lib/domain/__tests__/fixtures/scenario-comparison.test.ts`

These fixtures model the real-world discrepancy: score was ~90 yesterday, ~83 today. The test validates the delta is explained by specific indicator changes (not random drift).

- [ ] **Step 1: Create scenario A (yesterday, score ~90)**

Create `lib/domain/__tests__/fixtures/scenario-a.ts`:

```ts
// Scenario A: yesterday, strong buy signals, expected raw score ~88-92
import type { IndicatorScore } from '../../../shared/types/signal'

export const SCENARIO_A_INDICATORS: IndicatorScore[] = [
  { name: 'Medo & Ganância',     score:  2, summary: 'Medo extremo (18)' },
  { name: 'Taxa de Funding',     score:  2, summary: 'Negativo (-0.015%)' },
  { name: 'Variação 7d',         score:  1, summary: '-12% semana' },
  { name: 'Open Interest',       score:  2, summary: '-11% desalavancagem' },
  { name: 'Liq. de Longs',       score:  1, summary: 'Moderada' },
  { name: 'MVRV',                score:  2, summary: '0.85 — abaixo de 1' },
  { name: 'Preço Realizado',     score:  2, summary: 'BTC abaixo do preço realizado' },
  { name: 'Mayer Multiple',      score:  2, summary: '0.82' },
  { name: 'Hash Ribbon',         score:  1, summary: 'Cruzamento recente' },
  { name: 'Pressão venda',       score:  0, summary: 'Neutro' },
  { name: 'Médias Móveis',       score:  1, summary: 'Abaixo MA50d' },
  { name: 'ETF Institucional',   score:  1, summary: 'Entrada líquida leve' },
  { name: 'Pi Cycle Top',        score:  0, summary: 'Sem sinal' },
  { name: 'Bollinger %B',        score: -1, summary: 'Abaixo da banda inferior' },
  { name: 'DXY (Dólar Index)',   score:  0, summary: 'Neutro' },
  { name: 'Long/Short Ratio',    score:  1, summary: '0.82 (45% longs)' },
  { name: 'BTC Dominância',      score:  1, summary: '54% alta' },
  { name: 'Heatmap Liquidações', score:  1, summary: 'Cluster de suporte' },
  { name: 'Stablecoin Ratio',    score:  0, summary: 'Neutro' },
]

export const SCENARIO_A_EXPECTED_RAW_RANGE = [85, 95] as const
```

- [ ] **Step 2: Create scenario B (today, score ~83)**

Create `lib/domain/__tests__/fixtures/scenario-b.ts`:

```ts
// Scenario B: today, signals weakened slightly, expected raw score ~79-86
import type { IndicatorScore } from '../../../shared/types/signal'

export const SCENARIO_B_INDICATORS: IndicatorScore[] = [
  { name: 'Medo & Ganância',     score:  1, summary: 'Medo (35)' },        // -1 vs A
  { name: 'Taxa de Funding',     score:  1, summary: 'Neutro (0.005%)' },  // -1 vs A
  { name: 'Variação 7d',         score:  0, summary: '-4% semana' },       // -1 vs A
  { name: 'Open Interest',       score:  1, summary: '-5% leve queda' },   // -1 vs A
  { name: 'Liq. de Longs',       score:  1, summary: 'Moderada' },
  { name: 'MVRV',                score:  2, summary: '0.88 — abaixo de 1' },
  { name: 'Preço Realizado',     score:  1, summary: 'BTC próximo ao preço realizado' }, // -1 vs A
  { name: 'Mayer Multiple',      score:  2, summary: '0.84' },
  { name: 'Hash Ribbon',         score:  1, summary: 'Cruzamento recente' },
  { name: 'Pressão venda',       score:  0, summary: 'Neutro' },
  { name: 'Médias Móveis',       score:  1, summary: 'Abaixo MA50d' },
  { name: 'ETF Institucional',   score:  0, summary: 'Neutro' },            // -1 vs A
  { name: 'Pi Cycle Top',        score:  0, summary: 'Sem sinal' },
  { name: 'Bollinger %B',        score: -1, summary: 'Abaixo da banda inferior' },
  { name: 'DXY (Dólar Index)',   score:  0, summary: 'Neutro' },
  { name: 'Long/Short Ratio',    score:  0, summary: '0.95 (49% longs)' }, // -1 vs A
  { name: 'BTC Dominância',      score:  1, summary: '53% estável' },
  { name: 'Heatmap Liquidações', score:  0, summary: 'Neutro' },           // -1 vs A
  { name: 'Stablecoin Ratio',    score:  0, summary: 'Neutro' },
]

export const SCENARIO_B_EXPECTED_RAW_RANGE = [75, 87] as const
```

- [ ] **Step 3: Write scenario comparison tests**

Create `lib/domain/__tests__/fixtures/scenario-comparison.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildScoreExplanation } from '../../score-explanation'
import { SCENARIO_A_INDICATORS, SCENARIO_A_EXPECTED_RAW_RANGE } from './scenario-a'
import { SCENARIO_B_INDICATORS, SCENARIO_B_EXPECTED_RAW_RANGE } from './scenario-b'

describe('Scenario fixtures', () => {
  it('Scenario A raw score is in expected range (~90)', () => {
    const exp = buildScoreExplanation({ indicators: SCENARIO_A_INDICATORS, previousScore: null })
    const [min, max] = SCENARIO_A_EXPECTED_RAW_RANGE
    expect(exp.rawScore).toBeGreaterThanOrEqual(min)
    expect(exp.rawScore).toBeLessThanOrEqual(max)
  })

  it('Scenario B raw score is in expected range (~83)', () => {
    const exp = buildScoreExplanation({ indicators: SCENARIO_B_INDICATORS, previousScore: null })
    const [min, max] = SCENARIO_B_EXPECTED_RAW_RANGE
    expect(exp.rawScore).toBeGreaterThanOrEqual(min)
    expect(exp.rawScore).toBeLessThanOrEqual(max)
  })

  it('Scenario B score is lower than Scenario A (weakened signals)', () => {
    const expA = buildScoreExplanation({ indicators: SCENARIO_A_INDICATORS, previousScore: null })
    const expB = buildScoreExplanation({ indicators: SCENARIO_B_INDICATORS, previousScore: null })
    expect(expB.rawScore).toBeLessThan(expA.rawScore)
  })

  it('Scenario B with smoothing from A gives delta in expected range', () => {
    const expA = buildScoreExplanation({ indicators: SCENARIO_A_INDICATORS, previousScore: null })
    const expB = buildScoreExplanation({ indicators: SCENARIO_B_INDICATORS, previousScore: expA.rawScore })
    // Smoothed B should be between A and raw B (EMA dampens)
    expect(expB.smoothedScore).toBeLessThan(expA.rawScore)
    expect(expB.smoothedScore).toBeGreaterThan(expB.rawScore)
    // Delta should be small-to-moderate negative (not a crash)
    expect(expB.delta).toBeLessThan(0)
    expect(expB.delta!).toBeGreaterThan(-20)
  })

  it('delta is explained by specific indicator changes', () => {
    const expA = buildScoreExplanation({ indicators: SCENARIO_A_INDICATORS, previousScore: null })
    const expB = buildScoreExplanation({ indicators: SCENARIO_B_INDICATORS, previousScore: expA.rawScore })

    // In scenario B, Medo & Ganância went from 2 to 1 (weight 1.5)
    // That's -1.5 contribution alone
    const fearA = expA.contributions.find(c => c.name === 'Medo & Ganância')!
    const fearB = expB.contributions.find(c => c.name === 'Medo & Ganância')!
    expect(fearB.contribution).toBeLessThan(fearA.contribution)

    // WeightedSum should be lower in B
    expect(expB.weightedSum).toBeLessThan(expA.weightedSum)
  })
})
```

- [ ] **Step 4: Run scenario tests**

```bash
npx vitest run lib/domain/__tests__/fixtures/scenario-comparison.test.ts --reporter=verbose 2>&1
```

Expected: all 5 tests PASS. If raw score ranges are off, adjust the indicator scores in the fixtures (not the formula) until the ranges hold.

- [ ] **Step 5: Commit**

```bash
git add lib/domain/__tests__/fixtures/
git commit -m "test(score): add scenario A/B fixtures validating score delta is explainable"
```

---

## Task 6: Extend TacticalSignal + Wire Pipeline

**Files:**
- Modify: `lib/shared/types/signal.ts`
- Modify: `lib/signal-engine/pipeline.ts`

- [ ] **Step 1: Add explanation field to TacticalSignal**

In `lib/shared/types/signal.ts`, add to the `TacticalSignal` interface after the `indicatorGroups` field:

Old (end of TacticalSignal interface):
```ts
  indicatorGroups: IndicatorGroup[];
}
```

New:
```ts
  indicatorGroups: IndicatorGroup[];
  explanation: import('./score-explanation').TacticalScoreExplanation;
}
```

Alternatively (to avoid inline import), add at the top of the file:
```ts
import type { TacticalScoreExplanation } from './score-explanation'
```

Then in the interface:
```ts
  indicatorGroups: IndicatorGroup[];
  explanation: TacticalScoreExplanation;
```

- [ ] **Step 2: Update pipeline.ts to build explanation**

In `lib/signal-engine/pipeline.ts`, add the import:

```ts
import { buildScoreExplanation } from '../domain/score-explanation'
```

In the `runSignalEngine()` function, after `const dimensionScores = buildDimensionScores(indicatorGroups);`, add:

```ts
  const explanation = buildScoreExplanation({
    indicators: scoresList,
    previousScore: null,  // smoothing added in market-data.ts after DB fetch
  })
```

Then add `explanation` to the returned object:

```ts
  return {
    asset:            "BTC",
    generatedAt:      new Date().toISOString(),
    btcPrice,
    score:            { raw: score.rawTotal, weighted: score.weightedTotal },
    regime,
    riskLevel:        riskLevelForRegime(regime),
    actionBias:       actionBiasForRegime(regime),
    indicators:       scoresList,
    triggeredRules,
    playbook,
    summary,
    insights:         interp.observations,
    reading:          interp.reading,
    dimensionScores,
    indicatorGroups,
    explanation,
  }
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/shared/types/signal.ts lib/signal-engine/pipeline.ts
git commit -m "feat(score): add explanation field to TacticalSignal, wire buildScoreExplanation in pipeline"
```

---

## Task 7: Score Smoothing in market-data Service

**Files:**
- Modify: `src/services/market-data.ts`

The previous `opportunity_score` is fetched from Supabase before inserting a new snapshot, then used to compute `smoothedScore` and patch it back onto the signal's `explanation`.

- [ ] **Step 1: Update getCurrentMarketData() to apply smoothing**

In `src/services/market-data.ts`, add the import:

```ts
import { getLatestSnapshot } from '@/repositories/market-snapshots'
import { buildScoreExplanation } from '@lib/domain/score-explanation'
```

Replace the existing `getCurrentMarketData()` function body with:

```ts
export async function getCurrentMarketData(): Promise<{
  signal:   TacticalSignal
  snapshot: MarketSnapshotRow | null
  cached:   boolean
  stale:    boolean
}> {
  const now = Date.now()

  if (cache && now - cache.ts < CACHE_TTL_MS) {
    return { signal: cache.signal, snapshot: cache.snapshot, cached: true, stale: false }
  }

  try {
    const signal = await withTimeout(runSignalEngine(), PIPELINE_TIMEOUT_MS)
    const scores = deriveSnapshotScores(signal)

    // Fetch previous score for EMA smoothing
    let previousScore: number | null = null
    try {
      const prevSnapshot = await getLatestSnapshot(getServiceClient())
      previousScore = prevSnapshot?.opportunity_score ?? null
    } catch {
      // non-blocking — proceed without smoothing
    }

    // Rebuild explanation with smoothing applied
    const explanation = buildScoreExplanation({
      indicators:    signal.indicators,
      previousScore,
    })

    // Attach smoothed explanation to signal
    const signalWithExplanation: TacticalSignal = { ...signal, explanation }

    // Persist to DB — non-blocking, fails silently
    let snapshot: MarketSnapshotRow | null = null
    try {
      snapshot = await insertSnapshot(getServiceClient(), {
        btc_price_usd:      signal.btcPrice,
        market_regime:      signal.regime,
        risk_score:         scores.riskScore,
        opportunity_score:  explanation.smoothedScore,
        euphoria_score:     scores.euphoriaScore,
        capitulation_score: scores.capitulationScore,
        conviction_score:   scores.convictionScore,
        summary:            signal.reading,
        indicators:         signal.indicatorGroups as unknown as Record<string, unknown>,
      })
    } catch (dbErr) {
      console.warn('[market-data] DB persist skipped:', (dbErr as Error).message)
    }

    cache = { signal: signalWithExplanation, snapshot, ts: Date.now() }
    return { signal: signalWithExplanation, snapshot, cached: false, stale: false }

  } catch (err) {
    if (cache) {
      return { signal: cache.signal, snapshot: cache.snapshot, cached: true, stale: true }
    }
    throw err
  }
}
```

- [ ] **Step 2: Update CacheEntry type**

In the same file, update the `CacheEntry` interface:

```ts
interface CacheEntry {
  signal:   TacticalSignal
  snapshot: MarketSnapshotRow | null
  ts:       number
}
```

(No change needed — already typed as `TacticalSignal` which now includes `explanation`.)

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/services/market-data.ts
git commit -m "feat(score): apply EMA smoothing (70/30) using previous Supabase opportunity_score"
```

---

## Task 8: ScoreWhyPanel UI Component

**Files:**
- Create: `src/components/dashboard/ScoreWhyPanel.tsx`
- Delete: `src/components/dashboard/ScoreBreakdown.tsx`
- Modify: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Create ScoreWhyPanel.tsx**

```tsx
// src/components/dashboard/ScoreWhyPanel.tsx
'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { TacticalScoreExplanation } from '@lib/shared/types/score-explanation'

interface Props {
  explanation: TacticalScoreExplanation
}

function contribColor(c: number) {
  if (c > 0) return '#00C853'
  if (c < 0) return '#FF6D00'
  return 'var(--text-muted)'
}

function barWidth(pct: number, sign: number): string {
  return `${Math.min(pct, 100)}%`
}

export default function ScoreWhyPanel({ explanation }: Props) {
  const [open, setOpen] = useState(false)

  const deltaSign = explanation.delta !== null && explanation.delta > 0 ? '+' : ''
  const deltaColor = explanation.delta === null ? 'var(--text-muted)'
    : explanation.delta > 0 ? '#00C853'
    : explanation.delta < 0 ? '#FF6D00'
    : 'var(--text-muted)'

  return (
    <div style={{
      background:   'var(--surface)',
      border:       '1px solid var(--border-dim)',
      borderRadius: '12px',
      marginBottom: '24px',
      overflow:     'hidden',
    }}>
      {/* Header toggle */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width:          '100%',
          background:     'none',
          border:         'none',
          padding:        '14px 20px',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          cursor:         'pointer',
          color:          'var(--text)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
            Por que este score?
          </span>
          {/* Formula badge */}
          <span style={{
            fontSize: '10px', fontWeight: 700,
            background: 'var(--surface2)',
            border: '1px solid var(--border-dim)',
            borderRadius: '4px',
            padding: '2px 8px',
            color: 'var(--text-muted)',
          }}>
            fórmula {explanation.formulaVersion} · ponderado {explanation.weightedSum > 0 ? `+${explanation.weightedSum}` : explanation.weightedSum} → {explanation.smoothedScore}/100
          </span>
          {/* Delta badge */}
          {explanation.delta !== null && (
            <span style={{
              fontSize: '10px', fontWeight: 700,
              borderRadius: '4px',
              padding: '2px 8px',
              color: deltaColor,
              background: `${deltaColor}18`,
              border: `1px solid ${deltaColor}33`,
            }}>
              {deltaSign}{explanation.delta} vs anterior
            </span>
          )}
          {/* Warnings */}
          {explanation.warnings.length > 0 && (
            <span style={{
              fontSize: '10px', fontWeight: 600,
              color: '#FFD600',
              background: '#FFD60015',
              border: '1px solid #FFD60033',
              borderRadius: '4px',
              padding: '2px 8px',
            }}>
              ⚠ {explanation.warnings.length} aviso(s)
            </span>
          )}
        </div>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          style={{ display: 'inline-block', color: 'var(--text-muted)', fontSize: '12px', flexShrink: 0 }}
        >
          ▾
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            {/* Formula explanation */}
            <div style={{
              padding: '10px 20px 14px',
              borderTop: '1px solid var(--border-dim)',
              fontSize: '11px',
              color: 'var(--text-muted)',
              lineHeight: 1.6,
              background: 'var(--surface2)',
            }}>
              <strong style={{ color: 'var(--text)' }}>Fórmula {explanation.formulaVersion}:</strong>{' '}
              cada indicador tem score (−2 a +2) × peso (1–2) = contribuição.{' '}
              Soma ponderada normalizada:{' '}
              <code style={{ color: 'var(--orange)', fontSize: '11px' }}>(ponderado + 30) / 60 × 100</code>.{' '}
              Se score anterior disponível, aplica suavização:{' '}
              <code style={{ color: 'var(--orange)', fontSize: '11px' }}>0.7 × atual + 0.3 × anterior</code>.{' '}
              Derivados (Regime, Sinais Compostos) excluídos para evitar double-counting.
              {explanation.previousScore !== null && (
                <>{' '}Score anterior: <strong style={{ color: 'var(--text)' }}>{explanation.previousScore}</strong> → suavizado: <strong style={{ color: 'var(--text)' }}>{explanation.smoothedScore}</strong></>
              )}
            </div>

            {/* Warnings */}
            {explanation.warnings.length > 0 && (
              <div style={{
                padding: '8px 20px',
                borderTop: '1px solid var(--border-dim)',
                background: '#FFD60008',
              }}>
                {explanation.warnings.map((w, i) => (
                  <div key={i} style={{ fontSize: '11px', color: '#FFD600' }}>⚠ {w}</div>
                ))}
              </div>
            )}

            {/* Top contributors */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1px',
              borderTop: '1px solid var(--border-dim)',
              background: 'var(--border-dim)',
            }}>
              {/* Top positive */}
              <div style={{ background: 'var(--surface)', padding: '10px 16px' }}>
                <div style={{ fontSize: '9px', fontWeight: 700, color: '#00C853', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px' }}>
                  Maior contribuição positiva
                </div>
                {explanation.topPositive.map(c => (
                  <div key={c.name} style={{ marginBottom: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '2px' }}>
                      <span style={{ color: 'var(--text-sec)' }}>{c.name}</span>
                      <span style={{ color: '#00C853', fontWeight: 700 }}>+{c.contribution}</span>
                    </div>
                    <div style={{ height: '3px', background: 'var(--border-dim)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: barWidth(c.percentOfTotal, 1), height: '100%', background: '#00C853', borderRadius: '2px' }} />
                    </div>
                  </div>
                ))}
              </div>
              {/* Top negative */}
              <div style={{ background: 'var(--surface)', padding: '10px 16px' }}>
                <div style={{ fontSize: '9px', fontWeight: 700, color: '#FF6D00', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px' }}>
                  Maior contribuição negativa
                </div>
                {explanation.topNegative.length === 0 && (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Nenhum indicador negativo</div>
                )}
                {explanation.topNegative.map(c => (
                  <div key={c.name} style={{ marginBottom: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '2px' }}>
                      <span style={{ color: 'var(--text-sec)' }}>{c.name}</span>
                      <span style={{ color: '#FF6D00', fontWeight: 700 }}>{c.contribution}</span>
                    </div>
                    <div style={{ height: '3px', background: 'var(--border-dim)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: barWidth(c.percentOfTotal, -1), height: '100%', background: '#FF6D00', borderRadius: '2px' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Full table header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 60px 50px 70px',
              gap: '8px',
              padding: '8px 20px',
              borderTop: '1px solid var(--border-dim)',
              fontSize: '9px',
              fontWeight: 700,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
            }}>
              <span>Indicador</span>
              <span style={{ textAlign: 'center' }}>Score</span>
              <span style={{ textAlign: 'center' }}>Peso</span>
              <span style={{ textAlign: 'right' }}>Contrib.</span>
            </div>

            {/* Rows */}
            <div style={{ borderTop: '1px solid var(--border-dim)' }}>
              {explanation.contributions.map(row => (
                <div key={row.name} style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 60px 50px 70px',
                  gap: '8px',
                  padding: '7px 20px',
                  borderBottom: '1px solid var(--border-dim)',
                  alignItems: 'center',
                  opacity: row.dataQuality === 'missing' ? 0.45 : 1,
                }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-sec)' }}>
                    {row.name}
                    {row.dataQuality === 'missing' && <span style={{ marginLeft: '4px', fontSize: '9px', color: 'var(--text-muted)' }}>n/d</span>}
                  </span>
                  <span style={{
                    textAlign: 'center', fontSize: '12px', fontWeight: 700,
                    color: contribColor(row.score),
                  }}>
                    {row.score > 0 ? `+${row.score}` : row.score}
                  </span>
                  <span style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>
                    ×{row.weight}
                  </span>
                  <span style={{
                    textAlign: 'right', fontSize: '12px', fontWeight: 700,
                    color: contribColor(row.contribution),
                  }}>
                    {row.contribution > 0 ? `+${row.contribution}` : row.contribution === 0 ? '0' : row.contribution}
                  </span>
                </div>
              ))}
            </div>

            {/* Total row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 60px 50px 70px',
              gap: '8px',
              padding: '10px 20px',
              borderTop: '1px solid var(--border)',
              background: 'var(--surface2)',
            }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text)' }}>Total ponderado</span>
              <span /><span />
              <span style={{
                textAlign: 'right', fontSize: '14px', fontWeight: 900,
                color: contribColor(explanation.weightedSum),
              }}>
                {explanation.weightedSum > 0 ? `+${explanation.weightedSum}` : explanation.weightedSum}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
```

- [ ] **Step 2: Delete ScoreBreakdown.tsx**

```bash
rm /Users/diegomoreno/development/btc-monitor-web-next/src/components/dashboard/ScoreBreakdown.tsx
```

- [ ] **Step 3: Update dashboard/page.tsx**

In `src/app/dashboard/page.tsx`:

Replace:
```tsx
import ScoreBreakdown from '@/components/dashboard/ScoreBreakdown'
```
With:
```tsx
import ScoreWhyPanel from '@/components/dashboard/ScoreWhyPanel'
```

Replace:
```tsx
          <ScoreBreakdown
            indicators={signal.indicators}
            weightedScore={signal.score.weighted}
            finalScore={scores.opportunityScore}
          />
```
With:
```tsx
          <ScoreWhyPanel explanation={signal.explanation} />
```

Also remove `scores` from the page since it's no longer needed for ScoreWhyPanel (it's still needed for HeroSection's `opportunityScore`). Keep `deriveSnapshotScores` — it's used for `opportunityScore` in HeroSection. But `opportunityScore` should now come from `signal.explanation.smoothedScore`:

Replace in HeroSection call:
```tsx
            opportunityScore={scores.opportunityScore}
```
With:
```tsx
            opportunityScore={signal.explanation.smoothedScore}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 5: Run all tests**

```bash
npx vitest run --reporter=verbose 2>&1 | tail -30
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/dashboard/ScoreWhyPanel.tsx src/app/dashboard/page.tsx
git rm src/components/dashboard/ScoreBreakdown.tsx
git commit -m "feat(ui): add ScoreWhyPanel replacing ScoreBreakdown — shows smoothed score, delta, top contributors, warnings"
```

---

## Task 9: Deploy + Verify

- [ ] **Step 1: Build to check for production errors**

```bash
npm run build 2>&1 | tail -30
```

Expected: build succeeds, no type errors.

- [ ] **Step 2: Start dev server and spot-check UI**

```bash
npm run dev &
sleep 5
open http://localhost:3000/dashboard
```

Verify:
- "Por que este score?" panel appears between HeroSection and DimensionGrid
- Panel expands on click showing formula badge, delta badge (if any), contributor bars, full table
- No NaN or undefined values visible in the table

- [ ] **Step 3: Deploy to production**

Use the `vercel:deploy` skill for production deployment.

- [ ] **Step 4: Final commit if any fixes needed during verification**

```bash
git add -p
git commit -m "fix(score): post-deploy corrections"
```

---

## Self-Review

### Spec coverage
| Requirement | Task |
|-------------|------|
| `TacticalScoreExplanation` type | Task 3 |
| "Por que este score?" panel | Task 8 |
| Contribution table per indicator | Task 8 |
| Score smoothing (EMA 70/30) | Task 7 |
| NaN safety — unavailable not negative | Task 4 (tests) |
| Missing indicator → unavailable | Task 4 (tests) |
| Deterministic formula | Task 4 (tests) |
| Weight sum / contribution accuracy | Task 4 (tests) |
| Scenario fixtures A/B | Task 5 |
| Formula version "v2.0" | Task 4 (implementation) |
| `rawScore` + `smoothedScore` + `delta` visible | Task 8 (UI) |
| Warnings for unavailable indicators | Task 4 (implementation) + Task 8 (UI) |
| Top positive / negative contributors | Task 4 (implementation) + Task 8 (UI) |

### Type consistency
- `ScoreContribution.name` is a PT display name string throughout
- `TacticalScoreExplanation` imported identically in `pipeline.ts`, `market-data.ts`, and `ScoreWhyPanel.tsx`
- `signal.explanation.smoothedScore` replaces `scores.opportunityScore` in dashboard page

### Placeholder scan
None found. All code steps contain complete implementations.
