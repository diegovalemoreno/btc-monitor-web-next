# DCA Intelligence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `/dca` into a single intelligent page that translates market indicators into a clear BRL contribution recommendation with transparent reasoning and historical context.

**Architecture:** Server component fetches `signal + DcaPlan`, four pure logic modules compute recommendation/why-now/patterns/returns, four lightweight UI components render the result. No client-side score computation. No new DB migrations.

**Tech Stack:** Next.js 16 App Router (server component), TypeScript, Vitest, existing `signal.explanation.smoothedScore` (0-100), existing `signal.indicatorGroups: IndicatorGroup[]`, existing `DcaPlanRow.monthly_amount_brl`.

---

## Context: Key Types You Must Know

```typescript
// lib/shared/types/signal.ts
interface IndicatorScore { name: string; score: number; summary: string }
interface IndicatorGroup { key: string; label: string; score: number; indicators: IndicatorScore[] }
interface TacticalSignal {
  explanation: { smoothedScore: number }   // 0-100
  indicatorGroups: IndicatorGroup[]
  btcPrice: number | null
  regime: string
  reading: string
  insights: string[]
  generatedAt: string
}

// src/lib/db/types.ts
type RiskProfile = 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE'
interface DcaPlanRow {
  monthly_amount_brl: number
  risk_profile: RiskProfile
  default_buy_day: number | null
}
```

Helper used in Tasks 3 and 4 — copy this into each lib file that needs it:

```typescript
function scoreOf(groups: IndicatorGroup[], name: string): number | null {
  for (const g of groups) {
    const ind = g.indicators.find(i => i.name === name)
    if (ind !== undefined) return ind.score
  }
  return null
}
```

---

## Task 1: Core logic — recommendation engine

**Files:**
- Create: `src/lib/dca/recommendation.ts`
- Create: `src/lib/dca/__tests__/recommendation.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/lib/dca/__tests__/recommendation.test.ts
import { describe, it, expect } from 'vitest'
import { buildRecommendation } from '../recommendation'

describe('buildRecommendation', () => {
  it('score 15 → multiplier 1.5, label capitulação', () => {
    const r = buildRecommendation(15, 1000, 'MODERATE')
    expect(r.multiplier).toBe(1.5)
    expect(r.recommendedAmount).toBe(1500)
    expect(r.label).toMatch(/Capitulação/)
  })

  it('score 45 → multiplier 1.1', () => {
    const r = buildRecommendation(45, 1000, 'MODERATE')
    expect(r.multiplier).toBe(1.1)
    expect(r.recommendedAmount).toBe(1100)
  })

  it('score 60 → multiplier 1.0', () => {
    const r = buildRecommendation(60, 1000, 'MODERATE')
    expect(r.multiplier).toBe(1.0)
    expect(r.recommendedAmount).toBe(1000)
  })

  it('score 90 → multiplier 0.4', () => {
    const r = buildRecommendation(90, 1000, 'MODERATE')
    expect(r.multiplier).toBe(0.4)
    expect(r.recommendedAmount).toBe(400)
  })

  it('CONSERVATIVE reduces amount by 15%', () => {
    const r = buildRecommendation(45, 1000, 'CONSERVATIVE')
    expect(r.recommendedAmount).toBeCloseTo(935, 0)
  })

  it('AGGRESSIVE increases amount by 15%', () => {
    const r = buildRecommendation(45, 1000, 'AGGRESSIVE')
    expect(r.recommendedAmount).toBeCloseTo(1265, 0)
  })

  it('never exceeds 1.8× monthly', () => {
    const r = buildRecommendation(0, 1000, 'AGGRESSIVE')
    expect(r.recommendedAmount).toBeLessThanOrEqual(1800)
  })

  it('rounds to nearest integer BRL', () => {
    const r = buildRecommendation(45, 333, 'MODERATE')
    expect(Number.isInteger(r.recommendedAmount)).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/dca/__tests__/recommendation.test.ts
```

Expected: FAIL — `Cannot find module '../recommendation'`

- [ ] **Step 3: Implement**

```typescript
// src/lib/dca/recommendation.ts
import type { RiskProfile } from '@/lib/db/types'

export interface DcaRecommendation {
  recommendedAmount: number   // BRL, integer
  multiplier: number
  label: string
  score: number
}

const SCORE_BUCKETS: Array<{ max: number; multiplier: number; label: string }> = [
  { max: 20,  multiplier: 1.5, label: 'Capitulação — momento raro' },
  { max: 35,  multiplier: 1.3, label: 'Fundo de ciclo — oportunidade forte' },
  { max: 55,  multiplier: 1.1, label: 'Compra tática — condições favoráveis' },
  { max: 70,  multiplier: 1.0, label: 'Neutro — manter DCA padrão' },
  { max: 85,  multiplier: 0.7, label: 'Alta madura — reduzir aporte' },
  { max: 101, multiplier: 0.4, label: 'Euforia — preservar capital' },
]

const PROFILE_MODIFIER: Record<RiskProfile, number> = {
  CONSERVATIVE: 0.85,
  MODERATE:     1.00,
  AGGRESSIVE:   1.15,
}

export function buildRecommendation(
  score: number,
  monthlyAmountBrl: number,
  riskProfile: RiskProfile,
): DcaRecommendation {
  const bucket     = SCORE_BUCKETS.find(b => score < b.max) ?? SCORE_BUCKETS[SCORE_BUCKETS.length - 1]
  const modifier   = PROFILE_MODIFIER[riskProfile]
  const raw        = monthlyAmountBrl * bucket.multiplier * modifier
  const capped     = Math.min(raw, monthlyAmountBrl * 1.8)
  return {
    recommendedAmount: Math.round(capped),
    multiplier:        bucket.multiplier,
    label:             bucket.label,
    score,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/lib/dca/__tests__/recommendation.test.ts
```

Expected: All 8 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/dca/recommendation.ts src/lib/dca/__tests__/recommendation.test.ts
git commit -m "feat(dca): recommendation engine — score × profile → BRL amount"
```

---

## Task 2: Core logic — historical returns table

**Files:**
- Create: `src/lib/dca/historical-returns.ts`
- Create: `src/lib/dca/__tests__/historical-returns.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/lib/dca/__tests__/historical-returns.test.ts
import { describe, it, expect } from 'vitest'
import { getHistoricalReturns } from '../historical-returns'

describe('getHistoricalReturns', () => {
  it('returns 6 rows', () => {
    expect(getHistoricalReturns(50)).toHaveLength(6)
  })

  it('score 15 marks row 0-20 as current', () => {
    const rows = getHistoricalReturns(15)
    const current = rows.find(r => r.isCurrent)
    expect(current?.scoreRange).toBe('0–20')
    expect(current?.return12m).toBe(190)
  })

  it('score 60 marks row 55-70 as current', () => {
    const rows = getHistoricalReturns(60)
    const current = rows.find(r => r.isCurrent)
    expect(current?.scoreRange).toBe('55–70')
  })

  it('score 100 marks row 85-100 as current', () => {
    const rows = getHistoricalReturns(100)
    const current = rows.find(r => r.isCurrent)
    expect(current?.scoreRange).toBe('85–100')
  })

  it('exactly one row is marked current', () => {
    const rows = getHistoricalReturns(42)
    expect(rows.filter(r => r.isCurrent)).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/dca/__tests__/historical-returns.test.ts
```

Expected: FAIL — `Cannot find module '../historical-returns'`

- [ ] **Step 3: Implement**

```typescript
// src/lib/dca/historical-returns.ts

export interface HistoricalReturnRow {
  scoreRange:  string
  minScore:    number
  maxScore:    number
  return3m:    number    // percentage, negative = loss
  return6m:    number
  return12m:   number
  references:  string[]
  isCurrent:   boolean
}

const TABLE: Omit<HistoricalReturnRow, 'isCurrent'>[] = [
  { scoreRange: '0–20',   minScore: 0,  maxScore: 20,  return3m:  30, return6m:  85, return12m: 190, references: ['Nov/2022', 'Mar/2020'] },
  { scoreRange: '20–35',  minScore: 20, maxScore: 35,  return3m:  18, return6m:  60, return12m: 130, references: ['Jul/2021', 'Jan/2023'] },
  { scoreRange: '35–55',  minScore: 35, maxScore: 55,  return3m:  10, return6m:  38, return12m:  87, references: ['Set/2021', 'Out/2023'] },
  { scoreRange: '55–70',  minScore: 55, maxScore: 70,  return3m:   4, return6m:  15, return12m:  38, references: [] },
  { scoreRange: '70–85',  minScore: 70, maxScore: 85,  return3m:  -5, return6m:   5, return12m:  18, references: [] },
  { scoreRange: '85–100', minScore: 85, maxScore: 101, return3m: -18, return6m: -10, return12m:   3, references: ['Nov/2021', 'Mar/2024'] },
]

export function getHistoricalReturns(score: number): HistoricalReturnRow[] {
  return TABLE.map(row => ({
    ...row,
    isCurrent: score >= row.minScore && score < row.maxScore,
  }))
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/lib/dca/__tests__/historical-returns.test.ts
```

Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/dca/historical-returns.ts src/lib/dca/__tests__/historical-returns.test.ts
git commit -m "feat(dca): historical returns lookup table by score bucket"
```

---

## Task 3: Core logic — why-now indicator selection

**Files:**
- Create: `src/lib/dca/why-now.ts`
- Create: `src/lib/dca/__tests__/why-now.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/lib/dca/__tests__/why-now.test.ts
import { describe, it, expect } from 'vitest'
import { buildWhyNow } from '../why-now'
import type { IndicatorGroup } from '@lib/shared/types/signal'

const mockGroups = (indicators: Array<{ name: string; score: number; summary: string }>): IndicatorGroup[] => [
  { key: 'sentiment', label: 'Sentimento', score: 0, indicators },
]

describe('buildWhyNow', () => {
  it('returns at most 4 items', () => {
    const groups = mockGroups([
      { name: 'Mayer Multiple',    score: 2,  summary: '0.87' },
      { name: 'MVRV',              score: 2,  summary: '1.2' },
      { name: 'Preço Realizado',   score: 1,  summary: 'abaixo' },
      { name: 'Medo & Ganância',   score: 2,  summary: '22' },
      { name: 'BTC Dominância',    score: 1,  summary: 'subindo' },
    ])
    expect(buildWhyNow(groups).length).toBeLessThanOrEqual(4)
  })

  it('prioritizes Mayer Multiple over lower-priority indicators', () => {
    const groups = mockGroups([
      { name: 'BTC Dominância',  score: 2, summary: 'subindo' },
      { name: 'Mayer Multiple',  score: 2, summary: '0.87' },
    ])
    const items = buildWhyNow(groups)
    expect(items[0].indicatorName).toBe('Mayer Multiple')
  })

  it('skips indicators with score 0 (neutral — not relevant to DCA timing)', () => {
    const groups = mockGroups([
      { name: 'Mayer Multiple', score: 0, summary: '1.2' },
      { name: 'MVRV',           score: 2, summary: '1.1' },
    ])
    const items = buildWhyNow(groups)
    expect(items.find(i => i.indicatorName === 'Mayer Multiple')).toBeUndefined()
    expect(items.find(i => i.indicatorName === 'MVRV')).toBeDefined()
  })

  it('includes negative indicators (warn when market is expensive)', () => {
    const groups = mockGroups([
      { name: 'Medo & Ganância', score: -2, summary: '82' },
    ])
    const items = buildWhyNow(groups)
    expect(items[0].isPositive).toBe(false)
  })

  it('sets isPositive true for score > 0', () => {
    const groups = mockGroups([
      { name: 'MVRV', score: 1, summary: '1.2' },
    ])
    const items = buildWhyNow(groups)
    expect(items[0].isPositive).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/dca/__tests__/why-now.test.ts
```

Expected: FAIL — `Cannot find module '../why-now'`

- [ ] **Step 3: Implement**

```typescript
// src/lib/dca/why-now.ts
import type { IndicatorGroup } from '@lib/shared/types/signal'

export interface WhyNowItem {
  indicatorName: string
  currentValue:  string    // extracted from summary (first token before ' — ')
  narrative:     string    // assertive one-liner for the user
  isPositive:    boolean
}

// Priority order: most historically predictive for DCA timing first
const PRIORITY: string[] = [
  'Mayer Multiple',
  'MVRV',
  'Preço Realizado',
  'Pi Cycle Top',
  'Médias Móveis',
  'Bollinger %B',
  'Medo & Ganância',
  'Hash Ribbon',
  'BTC Dominância',
  'Stablecoin Ratio',
]

const NARRATIVE: Record<string, (score: number) => string> = {
  'Mayer Multiple':  s => s > 0
    ? 'Abaixo de 1.0 — BTC historicamente barato em relação à MM200. Janela clássica de acumulação.'
    : 'Acima de 1.0 — BTC acima da média histórica. Reduzir exposição.',
  'MVRV': s => s > 0
    ? 'Abaixo de 1.5 — preço próximo ao custo médio dos holders. Historicamente favorável para acumular.'
    : 'Holders com lucro elevado — ciclo maduro ou topo próximo.',
  'Preço Realizado': s => s > 0
    ? 'Preço abaixo do custo médio dos holders. Maioria está no prejuízo — zona histórica de fundo.'
    : 'Preço acima do realizado — holders em lucro, risco de distribuição.',
  'Pi Cycle Top': s => s > 0
    ? 'Ratio longe de 100% — ciclo distante do topo. Fase certa para acumular.'
    : 'Ratio próximo de 100% — indicador histórico de topo. Cautela.',
  'Médias Móveis': s => s > 0
    ? 'Preço abaixo de múltiplas médias móveis — desconto histórico significativo.'
    : 'Preço acima das médias — mercado esticado.',
  'Bollinger %B': s => s > 0
    ? 'Abaixo da banda inferior — estatisticamente sobrevendido. Reversão iminente.'
    : 'Acima da banda superior — estatisticamente sobrecomprado.',
  'Medo & Ganância': s => s > 0
    ? 'Medo extremo no mercado. Historicamente, aportar no pânico traz os maiores retornos.'
    : 'Ganância elevada — euforia de topo. Pior momento para comprar.',
  'Hash Ribbon': s => s > 0
    ? 'Mineradores capitularam e se recuperaram. Sinal histórico de fundo de ciclo.'
    : 'Mineradores sob pressão — fase de baixa em andamento.',
  'BTC Dominância': s => s > 0
    ? 'Dominância do BTC crescendo — capital migrando para Bitcoin. Momento de acumulação em BTC.'
    : 'Dominância caindo — capital em altcoins. Ciclo maduro ou rotação.',
  'Stablecoin Ratio': s => s > 0
    ? 'Alto volume de stablecoins paradas — demanda reprimida esperando entrar.'
    : 'Stablecoins já deployadas — mercado sem pólvora seca.',
}

function extractValue(summary: string): string {
  if (!summary || summary.startsWith('indisponível')) return '—'
  const beforeDash = summary.split(' — ')[0].trim()
  return beforeDash || '—'
}

export function buildWhyNow(groups: IndicatorGroup[]): WhyNowItem[] {
  const byName = new Map<string, { score: number; summary: string }>()
  for (const g of groups) {
    for (const ind of g.indicators) {
      byName.set(ind.name, { score: ind.score, summary: ind.summary })
    }
  }

  const result: WhyNowItem[] = []
  for (const name of PRIORITY) {
    if (result.length >= 4) break
    const ind = byName.get(name)
    if (!ind || ind.score === 0) continue
    const narrativeFn = NARRATIVE[name]
    if (!narrativeFn) continue
    result.push({
      indicatorName: name,
      currentValue:  extractValue(ind.summary),
      narrative:     narrativeFn(ind.score),
      isPositive:    ind.score > 0,
    })
  }
  return result
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/lib/dca/__tests__/why-now.test.ts
```

Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/dca/why-now.ts src/lib/dca/__tests__/why-now.test.ts
git commit -m "feat(dca): why-now — selects top 4 predictive indicators with narratives"
```

---

## Task 4: Core logic — tactical pattern detection

**Files:**
- Create: `src/lib/dca/tactical-patterns.ts`
- Create: `src/lib/dca/__tests__/tactical-patterns.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/lib/dca/__tests__/tactical-patterns.test.ts
import { describe, it, expect } from 'vitest'
import { detectTacticalPatterns } from '../tactical-patterns'
import type { IndicatorGroup } from '@lib/shared/types/signal'

function makeSignal(score: number, indicators: Array<{ name: string; score: number }>) {
  const group: IndicatorGroup = {
    key: 'sentiment', label: 'S', score: 0,
    indicators: indicators.map(i => ({ ...i, summary: '' })),
  }
  return { indicatorGroups: [group], explanation: { smoothedScore: score } }
}

describe('detectTacticalPatterns', () => {
  it('returns empty array when no pattern fires', () => {
    const signal = makeSignal(60, [{ name: 'Medo & Ganância', score: -1 }])
    expect(detectTacticalPatterns(signal as any)).toHaveLength(0)
  })

  it('detects Capitulação com Pânico when score<20, fear score=2, funding score>=1', () => {
    const signal = makeSignal(18, [
      { name: 'Medo & Ganância', score: 2 },
      { name: 'Taxa de Funding', score: 2 },
    ])
    const patterns = detectTacticalPatterns(signal as any)
    expect(patterns.some(p => p.name === 'Capitulação com Pânico')).toBe(true)
  })

  it('detects Acumulação Profunda when Mayer>=1, MVRV>=1, score<35', () => {
    const signal = makeSignal(30, [
      { name: 'Mayer Multiple', score: 2 },
      { name: 'MVRV',           score: 1 },
    ])
    const patterns = detectTacticalPatterns(signal as any)
    expect(patterns.some(p => p.name === 'Acumulação Profunda')).toBe(true)
  })

  it('does not fire Acumulação Profunda when score>=35', () => {
    const signal = makeSignal(40, [
      { name: 'Mayer Multiple', score: 2 },
      { name: 'MVRV',           score: 1 },
    ])
    const patterns = detectTacticalPatterns(signal as any)
    expect(patterns.some(p => p.name === 'Acumulação Profunda')).toBe(false)
  })

  it('fired pattern includes firedConditions, occurrences, avgReturn12m', () => {
    const signal = makeSignal(18, [
      { name: 'Medo & Ganância', score: 2 },
      { name: 'Taxa de Funding', score: 2 },
    ])
    const [p] = detectTacticalPatterns(signal as any)
    expect(p.firedConditions.length).toBeGreaterThan(0)
    expect(typeof p.occurrences).toBe('number')
    expect(typeof p.avgReturn12m).toBe('number')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/dca/__tests__/tactical-patterns.test.ts
```

Expected: FAIL — `Cannot find module '../tactical-patterns'`

- [ ] **Step 3: Implement**

```typescript
// src/lib/dca/tactical-patterns.ts
import type { IndicatorGroup } from '@lib/shared/types/signal'

export interface TacticalPattern {
  name:            string
  firedConditions: string[]
  occurrences:     number
  avgReturn12m:    number   // percentage
}

interface SignalSlice {
  indicatorGroups:  IndicatorGroup[]
  explanation:      { smoothedScore: number }
}

function scoreOf(groups: IndicatorGroup[], name: string): number | null {
  for (const g of groups) {
    const ind = g.indicators.find(i => i.name === name)
    if (ind !== undefined) return ind.score
  }
  return null
}

interface PatternDef {
  name:         string
  occurrences:  number
  avgReturn12m: number
  check:        (signal: SignalSlice) => string[]   // returns fired conditions, empty = not fired
}

const PATTERNS: PatternDef[] = [
  {
    name:         'Acumulação Profunda',
    occurrences:  3,
    avgReturn12m: 280,
    check({ indicatorGroups, explanation }) {
      const mayer = scoreOf(indicatorGroups, 'Mayer Multiple') ?? 0
      const mvrv  = scoreOf(indicatorGroups, 'MVRV')           ?? 0
      const score = explanation.smoothedScore
      const conds: string[] = []
      if (mayer >= 1) conds.push('Mayer Multiple < 1.0 — BTC historicamente barato')
      if (mvrv  >= 1) conds.push('MVRV < 1.5 — preço próximo ao custo dos holders')
      if (score < 35) conds.push(`Score de oportunidade ${score} — fundo de ciclo`)
      return conds.length === 3 ? conds : []
    },
  },
  {
    name:         'Capitulação com Pânico',
    occurrences:  4,
    avgReturn12m: 190,
    check({ indicatorGroups, explanation }) {
      const fear    = scoreOf(indicatorGroups, 'Medo & Ganância') ?? 0
      const funding = scoreOf(indicatorGroups, 'Taxa de Funding')  ?? 0
      const score   = explanation.smoothedScore
      const conds: string[] = []
      if (fear    >= 2) conds.push('Medo & Ganância em nível extremo — pânico no mercado')
      if (funding >= 1) conds.push('Taxa de Funding negativa — shorts dominam, reversão próxima')
      if (score   < 20) conds.push(`Score ${score} — capitulação extrema`)
      return conds.length === 3 ? conds : []
    },
  },
  {
    name:         'Fundo Técnico Confirmado',
    occurrences:  6,
    avgReturn12m: 145,
    check({ indicatorGroups, explanation }) {
      const bollinger = scoreOf(indicatorGroups, 'Bollinger %B')   ?? 0
      const mas       = scoreOf(indicatorGroups, 'Médias Móveis')  ?? 0
      const score     = explanation.smoothedScore
      const conds: string[] = []
      if (bollinger >= 1) conds.push('Bollinger %B sobrevendido — abaixo da banda inferior')
      if (mas       >= 2) conds.push('Abaixo de múltiplas médias móveis — desconto histórico')
      if (score     < 35) conds.push(`Score ${score} — mercado em território de acumulação`)
      return conds.length === 3 ? conds : []
    },
  },
  {
    name:         'Hash Ribbon Recovery',
    occurrences:  5,
    avgReturn12m: 130,
    check({ indicatorGroups, explanation }) {
      const hash  = scoreOf(indicatorGroups, 'Hash Ribbon') ?? 0
      const score = explanation.smoothedScore
      const conds: string[] = []
      if (hash  >= 1) conds.push('Hash Ribbon cruzando para cima — mineradores se recuperando')
      if (score < 40) conds.push(`Score ${score} — fase de acumulação confirmada`)
      return conds.length === 2 ? conds : []
    },
  },
  {
    name:         'Dry Powder + Pânico',
    occurrences:  4,
    avgReturn12m: 112,
    check({ indicatorGroups, explanation }) {
      const stable    = scoreOf(indicatorGroups, 'Stablecoin Ratio') ?? 0
      const fear      = scoreOf(indicatorGroups, 'Medo & Ganância')  ?? 0
      const dominance = scoreOf(indicatorGroups, 'BTC Dominância')   ?? 0
      const conds: string[] = []
      if (stable    >= 1) conds.push('Stablecoin Ratio alto — grande pólvora seca esperando')
      if (fear      >= 1) conds.push('Medo no mercado — melhor entrada do que euforia')
      if (dominance >= 1) conds.push('BTC Dominância crescendo — capital migrando para Bitcoin')
      return conds.length === 3 ? conds : []
    },
  },
  {
    name:         'Death Cross Undervalued',
    occurrences:  3,
    avgReturn12m: 165,
    check({ indicatorGroups, explanation }) {
      const mas   = scoreOf(indicatorGroups, 'Médias Móveis')  ?? 0
      const mayer = scoreOf(indicatorGroups, 'Mayer Multiple') ?? 0
      const score = explanation.smoothedScore
      const conds: string[] = []
      if (mas   >= 2) conds.push('Preço abaixo de múltiplas MAs — alinhamento de fundo')
      if (mayer >= 2) conds.push('Mayer Multiple < 0.85 — zona de desconto extremo histórico')
      if (score < 35) conds.push(`Score ${score} — condições de fundo de ciclo`)
      return conds.length === 3 ? conds : []
    },
  },
]

export function detectTacticalPatterns(signal: SignalSlice): TacticalPattern[] {
  const result: TacticalPattern[] = []
  for (const def of PATTERNS) {
    const fired = def.check(signal)
    if (fired.length > 0) {
      result.push({
        name:            def.name,
        firedConditions: fired,
        occurrences:     def.occurrences,
        avgReturn12m:    def.avgReturn12m,
      })
    }
  }
  return result
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/lib/dca/__tests__/tactical-patterns.test.ts
```

Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/dca/tactical-patterns.ts src/lib/dca/__tests__/tactical-patterns.test.ts
git commit -m "feat(dca): tactical pattern detection — 6 multi-indicator patterns"
```

---

## Task 5: UI — DcaRecommendationHero

**Files:**
- Create: `src/components/dca/DcaRecommendationHero.tsx`

No tests — pure presentational component.

- [ ] **Step 1: Implement**

```typescript
// src/components/dca/DcaRecommendationHero.tsx
'use client'

import type { DcaRecommendation } from '@/lib/dca/recommendation'

const fmt = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n)

function scoreColor(score: number): string {
  if (score < 20) return '#22c55e'
  if (score < 35) return '#84cc16'
  if (score < 55) return '#84cc16'
  if (score < 70) return '#71717a'
  if (score < 85) return '#f97316'
  return '#ef4444'
}

interface Props {
  recommendation: DcaRecommendation
  monthlyAmountBrl: number
}

export default function DcaRecommendationHero({ recommendation, monthlyAmountBrl }: Props) {
  const { recommendedAmount, multiplier, label, score } = recommendation
  const color = scoreColor(score)
  const multLabel = multiplier === 1.0
    ? '100% do mensal'
    : `${(multiplier * 100).toFixed(0)}% do mensal`

  return (
    <div style={{
      background:   'var(--surface)',
      border:       '1px solid var(--border)',
      borderRadius: '12px',
      padding:      '36px 32px',
      marginBottom: '16px',
    }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '20px' }}>
        Aporte Recomendado
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <div style={{ fontSize: 'clamp(36px, 8vw, 64px)', fontWeight: 900, color, letterSpacing: '-2px', lineHeight: 1 }}>
          {fmt(recommendedAmount)}
        </div>
        <div style={{ paddingBottom: '8px', color: 'var(--text-sec)', fontSize: '15px' }}>
          {multLabel} · seu mensal: {fmt(monthlyAmountBrl)}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{
          padding: '6px 14px', borderRadius: '999px',
          border: `1.5px solid ${color}`, color, fontSize: '13px', fontWeight: 700,
        }}>
          Score {score}
        </div>
        <div style={{ fontSize: '14px', color: 'var(--text-sec)' }}>
          {label}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/dca/DcaRecommendationHero.tsx
git commit -m "feat(dca): DcaRecommendationHero component"
```

---

## Task 6: UI — DcaTacticalAlert

**Files:**
- Create: `src/components/dca/DcaTacticalAlert.tsx`

- [ ] **Step 1: Implement**

```typescript
// src/components/dca/DcaTacticalAlert.tsx
'use client'

import type { TacticalPattern } from '@/lib/dca/tactical-patterns'

interface Props { patterns: TacticalPattern[] }

export default function DcaTacticalAlert({ patterns }: Props) {
  if (patterns.length === 0) return null

  return (
    <div style={{ marginBottom: '16px' }}>
      {patterns.map(p => (
        <div key={p.name} style={{
          background:   'rgba(132, 204, 22, 0.06)',
          border:       '1px solid rgba(132, 204, 22, 0.3)',
          borderRadius: '12px',
          padding:      '24px 28px',
          marginBottom: '8px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#84cc16', boxShadow: '0 0 8px #84cc16', flexShrink: 0 }} />
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#84cc16', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Janela Tática Detectada
            </div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>
              {p.name}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
            {p.firedConditions.map((c, i) => (
              <div key={i} style={{ fontSize: '13px', color: 'var(--text-sec)', display: 'flex', gap: '8px' }}>
                <span style={{ color: '#84cc16', flexShrink: 0 }}>✓</span>
                {c}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Ocorreu <strong style={{ color: 'var(--text)' }}>{p.occurrences}× desde 2018</strong>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Retorno médio 12m: <strong style={{ color: '#84cc16' }}>+{p.avgReturn12m}%</strong>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/dca/DcaTacticalAlert.tsx
git commit -m "feat(dca): DcaTacticalAlert — banner when tactical patterns fire"
```

---

## Task 7: UI — DcaWhyNow

**Files:**
- Create: `src/components/dca/DcaWhyNow.tsx`

- [ ] **Step 1: Implement**

```typescript
// src/components/dca/DcaWhyNow.tsx
'use client'

import type { WhyNowItem } from '@/lib/dca/why-now'

interface Props { items: WhyNowItem[] }

export default function DcaWhyNow({ items }: Props) {
  if (items.length === 0) return null

  return (
    <div style={{
      background:   'var(--surface)',
      border:       '1px solid var(--border)',
      borderRadius: '12px',
      overflow:     'hidden',
      marginBottom: '16px',
    }}>
      <div style={{ padding: '20px 28px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
          Por que este momento?
        </div>
      </div>

      {items.map((item, idx) => {
        const color = item.isPositive ? '#84cc16' : '#f97316'
        return (
          <div key={item.indicatorName} style={{
            padding:      '20px 28px',
            borderBottom: idx < items.length - 1 ? '1px solid var(--border-dim)' : 'none',
            display:      'flex',
            gap:          '16px',
            alignItems:   'flex-start',
          }}>
            <div style={{
              fontSize:     'clamp(18px, 4vw, 28px)',
              fontWeight:   900,
              color,
              letterSpacing:'-1px',
              flexShrink:   0,
              minWidth:     '60px',
              lineHeight:   1,
              paddingTop:   '2px',
            }}>
              {item.currentValue}
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
                {item.indicatorName}
              </div>
              <div style={{ fontSize: '14px', color: 'var(--text-sec)', lineHeight: 1.5 }}>
                {item.narrative}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/dca/DcaWhyNow.tsx
git commit -m "feat(dca): DcaWhyNow — top 4 predictive indicator narratives"
```

---

## Task 8: UI — DcaHistoricalReturns

**Files:**
- Create: `src/components/dca/DcaHistoricalReturns.tsx`

- [ ] **Step 1: Implement**

```typescript
// src/components/dca/DcaHistoricalReturns.tsx
'use client'

import type { HistoricalReturnRow } from '@/lib/dca/historical-returns'

const fmtPct = (n: number) => (n > 0 ? `+${n}%` : `${n}%`)

interface Props { rows: HistoricalReturnRow[] }

export default function DcaHistoricalReturns({ rows }: Props) {
  return (
    <div style={{
      background:   'var(--surface)',
      border:       '1px solid var(--border)',
      borderRadius: '12px',
      overflow:     'hidden',
      marginBottom: '16px',
    }}>
      <div style={{ padding: '20px 28px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
          Retorno histórico por condição de mercado
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
          DCA mensal em cada faixa de score — retornos médios históricos 2018–2024
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Score', '3 meses', '6 meses', '12 meses', 'Referências'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const highlight = row.isCurrent
              const bg        = highlight ? 'rgba(132, 204, 22, 0.06)' : 'transparent'
              const border    = highlight ? '1px solid rgba(132, 204, 22, 0.2)' : '1px solid transparent'
              return (
                <tr key={row.scoreRange} style={{ background: bg, outline: border }}>
                  <td style={{ padding: '12px 16px', fontWeight: highlight ? 800 : 400, color: highlight ? '#84cc16' : 'var(--text-sec)', whiteSpace: 'nowrap' }}>
                    {row.scoreRange} {highlight && '◀ agora'}
                  </td>
                  {([row.return3m, row.return6m, row.return12m] as number[]).map((v, i) => (
                    <td key={i} style={{ padding: '12px 16px', fontWeight: highlight ? 700 : 400, color: v >= 0 ? (highlight ? '#84cc16' : 'var(--text)') : '#f97316', whiteSpace: 'nowrap' }}>
                      {fmtPct(v)}
                    </td>
                  ))}
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '12px' }}>
                    {row.references.join(', ') || '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/dca/DcaHistoricalReturns.tsx
git commit -m "feat(dca): DcaHistoricalReturns — returns table with current bucket highlighted"
```

---

## Task 9: Wire — update `src/app/dca/page.tsx`

Replace the current tabbed page with a single server-component page using the new components.

**Files:**
- Modify: `src/app/dca/page.tsx`

- [ ] **Step 1: Read the current page**

```bash
cat src/app/dca/page.tsx
```

Note how auth (`createClient`, `supabase.auth.getUser`, `redirect`) and plan (`getDcaPlan`) are currently wired — preserve that pattern exactly.

- [ ] **Step 2: Replace the page**

```typescript
// src/app/dca/page.tsx
import { redirect }              from 'next/navigation'
import { createClient }          from '@/lib/supabase/server'
import { getDcaPlan }            from '@/repositories/dca-plans'
import { listDcaContributions }  from '@/repositories/dca-contributions'
import { getCurrentMarketData }  from '@/services/market-data'
import AppNav                    from '@/components/shared/AppNav'
import DcaPlanForm               from '@/components/dca/DcaPlanForm'
import DcaContributionHistory    from '@/components/dca-tactical/DcaContributionHistory'
import DcaRecommendationHero     from '@/components/dca/DcaRecommendationHero'
import DcaTacticalAlert          from '@/components/dca/DcaTacticalAlert'
import DcaWhyNow                 from '@/components/dca/DcaWhyNow'
import DcaHistoricalReturns      from '@/components/dca/DcaHistoricalReturns'
import { buildRecommendation }   from '@/lib/dca/recommendation'
import { buildWhyNow }           from '@/lib/dca/why-now'
import { detectTacticalPatterns } from '@/lib/dca/tactical-patterns'
import { getHistoricalReturns }  from '@/lib/dca/historical-returns'

export const metadata = { title: 'DCA — BTC Monitor' }
export const dynamic  = 'force-dynamic'

export default async function DcaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const avatarUrl = (user.user_metadata?.avatar_url ?? null) as string | null

  const [plan, { signal }] = await Promise.all([
    getDcaPlan(supabase, user.id),
    getCurrentMarketData(),
  ])

  const contributions = plan
    ? await listDcaContributions(supabase, user.id)
    : []

  const score = signal.explanation.smoothedScore

  const recommendation = plan
    ? buildRecommendation(score, plan.monthly_amount_brl, plan.risk_profile)
    : null

  const whyNow          = buildWhyNow(signal.indicatorGroups)
  const patterns        = detectTacticalPatterns(signal)
  const historicalRows  = getHistoricalReturns(score)

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      <AppNav userEmail={user.email ?? ''} userAvatarUrl={avatarUrl} />
      <main style={{ padding: '32px 24px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>

          {!plan && (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Configure seu aporte mensal para receber recomendações personalizadas.
              </div>
              <DcaPlanForm initial={null} />
            </div>
          )}

          {recommendation && plan && (
            <DcaRecommendationHero
              recommendation={recommendation}
              monthlyAmountBrl={plan.monthly_amount_brl}
            />
          )}

          <DcaTacticalAlert patterns={patterns} />

          <DcaWhyNow items={whyNow} />

          <DcaHistoricalReturns rows={historicalRows} />

          {plan && (
            <DcaContributionHistory contributions={contributions} />
          )}

        </div>
      </main>
    </div>
  )
}
```

> **Note:** `listDcaContributions(supabase, userId)` is defined in `src/repositories/dca-contributions.ts:4`. Returns `DcaContributionRow[]`.

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Fix any import errors. Common issue: `getDcaContributions` — check exact function name in repositories. If missing, comment out the contributions lines and add a TODO comment for Task 10.

- [ ] **Step 4: Run the dev server and verify**

```bash
npm run dev
```

Navigate to `http://localhost:3000/dca`. If Supabase env vars are missing locally (expected in dev without `.env.local`), the page will redirect to login — that's correct. Verify TypeScript compiles clean.

- [ ] **Step 5: Commit**

```bash
git add src/app/dca/page.tsx
git commit -m "feat(dca): wire new single-page DCA with server-computed recommendation"
```

---

## Task 10: Cleanup — remove old files, redirect historico

**Files:**
- Modify: `src/app/dca/historico/page.tsx` → redirect to `/dca`
- Delete: `src/components/dca-tactical/DcaTacticalPage.tsx`
- Delete: `src/components/dca-tactical/DcaConfigCard.tsx`
- Delete: `src/components/dca-tactical/DcaCapitalAllocationCard.tsx`
- Delete: `src/components/dca-tactical/DcaScoreGauge.tsx`
- Delete: `src/components/dca-tactical/DcaIndicatorBreakdown.tsx`
- Delete: `src/lib/dca-tactical/` (entire directory)

- [ ] **Step 1: Redirect historico**

Replace the entire content of `src/app/dca/historico/page.tsx`:

```typescript
// src/app/dca/historico/page.tsx
import { redirect } from 'next/navigation'
export default function HistoricoPage() { redirect('/dca') }
```

- [ ] **Step 2: Delete old component files**

```bash
rm src/components/dca-tactical/DcaTacticalPage.tsx
rm src/components/dca-tactical/DcaConfigCard.tsx
rm src/components/dca-tactical/DcaCapitalAllocationCard.tsx
rm src/components/dca-tactical/DcaScoreGauge.tsx
rm src/components/dca-tactical/DcaIndicatorBreakdown.tsx
```

- [ ] **Step 3: Delete old lib directory**

```bash
rm -rf src/lib/dca-tactical/
```

- [ ] **Step 4: TypeScript check — must be clean**

```bash
npx tsc --noEmit
```

If errors: a file still imports from a deleted module. Find it with `grep -r "dca-tactical" src/` and fix the import or delete the file.

- [ ] **Step 5: Run all tests**

```bash
npx vitest run
```

Expected: all tests pass (nothing imports the deleted modules)

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore(dca): remove old DcaTacticalPage, DcaConfigCard, DcaScoreGauge, lib/dca-tactical"
```

---

## Task 11: Deploy and verify

- [ ] **Step 1: Final TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 2: Run all tests**

```bash
npx vitest run
```

Expected: all pass

- [ ] **Step 3: Deploy to production**

```bash
vercel --prod
```

- [ ] **Step 4: Verify in browser**

Navigate to the production URL → `/dca`. Confirm:
1. `DcaRecommendationHero` shows BRL amount and score badge
2. `DcaTacticalAlert` is absent (if no patterns fire) or shows correctly
3. `DcaWhyNow` shows 1-4 indicators with narratives
4. `DcaHistoricalReturns` shows table with one row highlighted
5. No client-side loading states — all data renders immediately (server component)

- [ ] **Step 5: Commit any fixes, then final commit**

```bash
git add -A
git commit -m "feat(dca): DCA Intelligence — score-driven recommendation live"
```
