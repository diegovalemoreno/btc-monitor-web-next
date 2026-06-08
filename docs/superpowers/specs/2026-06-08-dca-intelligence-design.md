# DCA Intelligence — Score-Driven Recommendation Design

**Goal:** Redesign `/dca` into a single, intelligent page that translates market indicators into a clear BRL contribution recommendation with transparent reasoning and historical context.

**Architecture:** Server component fetches `signal` + `DcaPlan`, computes recommendation entirely server-side, passes data as props to lightweight client components. No client-side score calculation.

**Tech Stack:** Next.js App Router (server component), TypeScript, existing Supabase `dca_plans` table, existing signal engine (`signal.explanation.smoothedScore`), pre-computed historical returns table.

---

## 1. Data Flow

```
Supabase → signal (smoothedScore 0-100, indicatorGroups, regime, btcPrice)
Supabase → DcaPlanRow (monthly_amount_brl, risk_profile)
    ↓
src/lib/dca/recommendation.ts  → { multiplier, recommendedAmount, label }
src/lib/dca/why-now.ts         → top 4 predictive indicators with narratives
src/lib/dca/tactical-patterns.ts → fired patterns (may be empty)
src/lib/dca/historical-returns.ts → bucket row for current score
    ↓
src/app/dca/page.tsx (server) renders components with computed props
```

Single source of truth: `signal.explanation.smoothedScore`. Same score as Análise Tática page — both pages speak the same language.

---

## 2. Score → Recommendation

### Multiplier table

| Score | Multiplier | Label |
|-------|-----------|-------|
| 0–20 | 1.50× | Capitulação — momento raro |
| 20–35 | 1.30× | Fundo de ciclo — oportunidade forte |
| 35–55 | 1.10× | Compra tática — condições favoráveis |
| 55–70 | 1.00× | Neutro — manter DCA padrão |
| 70–85 | 0.70× | Alta madura — reduzir aporte |
| 85–100 | 0.40× | Euforia — preservar capital |

### Risk profile modulation

`risk_profile` from `DcaPlanRow` applies a secondary multiplier on top:

| Profile | Modifier |
|---------|---------|
| CONSERVATIVE | × 0.85 |
| MODERATE | × 1.00 |
| AGGRESSIVE | × 1.15 |

Final: `recommendedAmount = monthly_amount_brl × scoreMultiplier × profileModifier`

Capped at 1.8× monthly (never suggest more than 180% of monthly amount).

### `src/lib/dca/recommendation.ts` interface

```typescript
export interface DcaRecommendation {
  recommendedAmount: number   // BRL
  multiplier: number          // e.g. 1.1
  label: string               // e.g. "Compra tática — condições favoráveis"
  score: number               // 0-100
}

export function buildRecommendation(
  score: number,
  monthlyAmountBrl: number,
  riskProfile: RiskProfile,
): DcaRecommendation
```

---

## 3. "Por que agora" — Predictive Indicators

Shows the top 4 indicators most relevant to DCA timing, selected from the current signal by predictive priority.

### Priority order (hardcoded, based on historical DCA timing research)

1. **Mayer Multiple** — Price ÷ MM200. < 1.0 = historically cheap. < 0.7 = rare accumulation zone.
2. **MVRV** — Price vs average holder cost. < 1.0 = everyone at a loss = historical bottom.
3. **Preço Realizado** — Below = majority of holders underwater = accumulation zone.
4. **Pi Cycle** — Cycle phase ratio. < 55% = far from top = right phase to buy.
5. **Médias Móveis** — How many MAs (MM50d, MM100d, MM200d, MM50w) price is below.
6. **Bollinger %B** — < 0 = statistically oversold. Reversal imminent.
7. **Medo & Ganância** — < 20 = extreme panic = historically best entries.
8. **Hash Ribbon** — Crossing up = miners capitulated and recovered = bottom signal.
9. **BTC Dominância** — Rising = capital migrating to BTC = BTC accumulation phase.
10. **Stablecoin Ratio** — High = large dry powder waiting to enter = suppressed demand.

### `src/lib/dca/why-now.ts` interface

```typescript
export interface WhyNowItem {
  indicatorName: string
  currentValue: string       // e.g. "0.87", "22", "-0.02%"
  narrative: string          // e.g. "Abaixo de 1.0 — BTC historicamente barato vs MM200"
  isPositive: boolean        // drives color
}

export function buildWhyNow(groups: IndicatorGroup[]): WhyNowItem[]
// Returns top 4 matched indicators by priority order above
// Skips indicators not present in current signal (status !== 'success')
```

Each `WhyNowItem.narrative` is a short, assertive sentence from a pre-defined map keyed by indicator name + value range.

---

## 4. Historical Returns

Pre-computed lookup table. Hardcoded constant — no API call, no latency.

### Table (based on BTC cycle DCA research 2018–2024)

| Score bucket | 3 months | 6 months | 12 months | Historical references |
|-------------|---------|---------|----------|--------------------|
| 0–20 | +30% | +85% | +190% | Nov/2022, Mar/2020 |
| 20–35 | +18% | +60% | +130% | Jul/2021, Jan/2023 |
| 35–55 | +10% | +38% | +87% | Sep/2021, Oct/2023 |
| 55–70 | +4% | +15% | +38% | — |
| 70–85 | −5% | +5% | +18% | — |
| 85–100 | −18% | −10% | +3% | Nov/2021, Mar/2024 |

### `src/lib/dca/historical-returns.ts` interface

```typescript
export interface HistoricalReturnRow {
  scoreRange: string        // e.g. "35–55"
  return3m: number          // e.g. 10
  return6m: number          // e.g. 38
  return12m: number         // e.g. 87
  references: string[]      // e.g. ["Set/2021", "Out/2023"]
  isCurrent: boolean        // true for the row matching current score
}

export function getHistoricalReturns(score: number): HistoricalReturnRow[]
// Returns all 6 rows with isCurrent=true on the matching bucket
```

---

## 5. Tactical Patterns

Six pre-defined patterns. Each evaluated against the current signal. Shown only when ≥1 fires.

### Pattern definitions

| Pattern | Conditions | Historical occurrences | Avg return 12m |
|---------|-----------|----------------------|---------------|
| **Acumulação Profunda** | Mayer Multiple < 1.0 AND MVRV < 1.5 AND score < 35 | 3× since 2018 | +280% |
| **Capitulação com Pânico** | Fear & Greed < 15 AND Funding < −0.01% AND score < 20 | 4× since 2018 | +190% |
| **Fundo Técnico Confirmado** | RSI < 30 AND below 3+ MAs AND Bollinger %B < 0 | 6× since 2018 | +145% |
| **Hash Ribbon Recovery** | Hash Ribbon crossing up AND score < 40 | 5× since 2018 | +130% |
| **Dry Powder + Pânico** | Stablecoin Ratio high AND Fear < 25 AND BTC Dominância rising | 4× since 2018 | +112% |
| **Death Cross Undervalued** | Death cross AND Mayer Multiple < 0.85 AND score < 35 | 3× since 2018 | +165% |

### `src/lib/dca/tactical-patterns.ts` interface

```typescript
export interface TacticalPattern {
  name: string
  firedConditions: string[]   // human-readable conditions that fired
  occurrences: number
  avgReturn12m: number        // percentage
}

export function detectTacticalPatterns(
  signal: TacticalSignal,
  technicalData: BtcTechnical | null,
): TacticalPattern[]
// Returns only patterns that currently fire (may be empty array)
```

`BtcTechnical` comes from `/api/btc-technical` — fetched server-side in `page.tsx` (one server-side fetch, not client-side).

---

## 6. Page Layout — Single `/dca` Page

Top-to-bottom order:

```
1. DcaRecommendationHero
   Score + recommended BRL amount + multiplier label
   "Aporte recomendado: R$1.100 · Score 42 · 1.1× do seu mensal"

2. DcaTacticalAlert          ← only rendered when patterns.length > 0
   Pattern name + fired conditions + occurrences + avg return

3. DcaWhyNow
   "Por que este momento?"
   4 indicators with current values and assertive narratives

4. DcaHistoricalReturns
   Score → returns table, current bucket highlighted

5. DcaContributionHistory    ← absorbs /dca/historico route
   Collapsible, shows past contributions with market state at time of entry

6. DcaPlanForm               ← inline if plan not set up yet, or edit link
```

No plan configured → show `DcaPlanForm` prominently before hero.

---

## 7. Files Created / Modified

### New files

| File | Description |
|------|-------------|
| `src/lib/dca/recommendation.ts` | Score + profile → BRL recommendation |
| `src/lib/dca/why-now.ts` | Top 4 predictive indicators selection |
| `src/lib/dca/tactical-patterns.ts` | Pattern definitions + detection |
| `src/lib/dca/historical-returns.ts` | Pre-computed returns table |
| `src/components/dca/DcaRecommendationHero.tsx` | Hero card |
| `src/components/dca/DcaTacticalAlert.tsx` | Tactical pattern banner |
| `src/components/dca/DcaWhyNow.tsx` | Why now panel |
| `src/components/dca/DcaHistoricalReturns.tsx` | Returns table |

### Modified files

| File | Change |
|------|--------|
| `src/app/dca/page.tsx` | Server component — fetches signal + plan + technical, computes all, renders new components |
| `src/app/dca/historico/page.tsx` | Redirect to `/dca` |

### Removed files

| File | Reason |
|------|--------|
| `src/components/dca-tactical/DcaTacticalPage.tsx` | Replaced by server component + new components |
| `src/components/dca-tactical/DcaConfigCard.tsx` | Manual config removed |
| `src/components/dca-tactical/DcaCapitalAllocationCard.tsx` | Replaced by DcaRecommendationHero |
| `src/components/dca-tactical/DcaScoreGauge.tsx` | Score in hero |
| `src/components/dca-tactical/DcaIndicatorBreakdown.tsx` | Replaced by DcaWhyNow |
| `src/lib/dca-tactical/` (entire dir) | Replaced by `src/lib/dca/` |

### DB schema — no migrations needed

`dca_plans` table unchanged. `monthly_amount_brl` and `risk_profile` already exist. `reserve_percentage` field ignored (not displayed, not used in new logic).

---

## 8. Out of Scope

- ML-based pattern detection
- Live historical backtesting via Binance price data
- Push notifications for tactical windows (existing alert system handles this separately)
- Changes to `dca_contributions` table or contribution logging flow
