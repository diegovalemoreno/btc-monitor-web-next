# Tactical Page Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the "Análise Tática" page so a user can identify the market opportunity, overall score, key bullish factors, and risks in under 5 seconds — matching the layout of abrahub.com/desafiobtc/indicador/.

**Architecture:** The page keeps ALL existing business logic (scoring, regime, allocation) unchanged. Only the visual layer changes: new components compose data already available in the market snapshot API plus two new lightweight endpoints (market KPIs from CoinGecko, technical indicators computed from Binance public candles). Components live in `src/components/dca-tactical/tactical/`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, inline styles (no CSS-in-JS library), `data-api.binance.vision` (public Binance mirror — no geo-block), CoinGecko free API.

---

## File Map

### New API routes
| File | Purpose |
|------|---------|
| `src/app/api/btc-market-kpis/route.ts` | Market cap, volume 24h, ATH, dominance from CoinGecko |
| `src/app/api/btc-technical/route.ts` | RSI14, MACD, MA200 distance, Golden/Death cross from Binance candles |

### New components (`src/components/dca-tactical/tactical/`)
| File | Purpose |
|------|---------|
| `TacticalCard.tsx` | Generic indicator card — name/status/desc/value/dots/chip |
| `TacticalHero.tsx` | Large score hero with regime label, reading, price, timestamp |
| `OpportunityBar.tsx` | Gradient bar (Péssimo → Oportunidade) with animated score thumb |
| `MarketKPIRow.tsx` | 5 KPI boxes — Market Cap, Dominance, Volume, ATH, Price |
| `TacticalSectionHeader.tsx` | Group divider showing group name + group score |
| `TacticalConsensus.tsx` | Bullish/Neutral/Bearish counts + auto-narrative |
| `TacticalInsights.tsx` | Institutional notes list from signal.insights |

### Modified
| File | Change |
|------|--------|
| `src/components/dca-tactical/DcaTacticalPage.tsx` | Complete visual redesign — keeps all data fetching/scoring logic |

---

## Data available from existing `/api/market-snapshot/current`

The route already returns these fields (expand the MarketSnapshot interface to use them):
- `generatedAt: string` — ISO timestamp
- `btcPriceUsd: number | null`
- `score: { raw, weighted }` — raw weighted score
- `marketRegime: string` — e.g. "CAPITULATION_ZONE"
- `riskLevel: string` — LOW/MEDIUM/HIGH/EXTREME
- `actionBias: string`
- `reading: string` — narrative text
- `insights: string[]` — bullet observations
- `indicatorGroups: IndicatorGroup[]` — grouped with sub-indicators
- `dimensionScores: { sentiment, derivatives, onchain, trend }`
- `explanation: { smoothedScore: number, classification: string }`

The `opportunityScore` (0-100) is derived in the frontend via `calculateDcaOpportunityScore()` — keep this unchanged.

---

## Scoring for new indicators (frontend derivation)

These scoring functions are applied in `DcaTacticalPage` after fetching `/api/btc-technical`.

```ts
function scoreRsi(rsi: number): number {
  if (rsi < 30) return  2
  if (rsi < 45) return  1
  if (rsi < 60) return  0
  if (rsi < 70) return -1
  return -2
}

function rsiLabel(rsi: number): string {
  if (rsi < 30) return 'Sobrevendido'
  if (rsi < 45) return 'Abaixo do Normal'
  if (rsi < 60) return 'Neutro'
  if (rsi < 70) return 'Acima do Normal'
  return 'Sobrecomprado'
}

function scoreMacd(positive: boolean, growing: boolean): number {
  if (!positive && growing)  return  2   // venda enfraquecendo
  if (!positive && !growing) return  1   // correção forte
  if (positive  && !growing) return -1   // alta perdendo força
  return -2                               // alta acelerando
}

function macdLabel(positive: boolean, growing: boolean): string {
  if (!positive && growing)  return 'Venda Enfraquecendo — Reversão Provável'
  if (!positive && !growing) return 'Correção Forte — Fundo em Formação'
  if (positive  && !growing) return 'Alta Perdendo Força — Ciclo Maduro'
  return 'Alta Acelerando — Possível Topo'
}

function scoreMa200Dist(pct: number): number {
  if (pct < -30) return  2
  if (pct < -10) return  1
  if (pct <  30) return  0
  if (pct <  80) return -1
  return -2
}

function scoreCross(isGolden: boolean): number {
  return isGolden ? -1 : 1
}

function scoreAthDrop(dropPct: number): number {
  if (dropPct > 70) return  2
  if (dropPct > 50) return  1
  if (dropPct > 25) return  0
  if (dropPct > 10) return -1
  return 0  // near ATH — neutral
}

const IMPACT_COLOR: Record<number, string> = {
   2: '#22c55e',
   1: '#84cc16',
   0: '#71717a',
  '-1': '#f97316',
  '-2': '#ef4444',
}

const IMPACT_LABEL: Record<number, string> = {
   2: 'Positivo Forte',
   1: 'Positivo',
   0: 'Neutro',
  '-1': 'Negativo',
  '-2': 'Negativo Forte',
}
```

---

## Task 1 — `/api/btc-market-kpis`

**Files:**
- Create: `src/app/api/btc-market-kpis/route.ts`

- [ ] **Step 1: Create the route file**

```typescript
// src/app/api/btc-market-kpis/route.ts
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [coinsRes, globalRes] = await Promise.all([
      fetch(
        'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin',
        { headers: { Accept: 'application/json' }, next: { revalidate: 300 } }
      ),
      fetch(
        'https://api.coingecko.com/api/v3/global',
        { headers: { Accept: 'application/json' }, next: { revalidate: 300 } }
      ),
    ])

    if (!coinsRes.ok) throw new Error(`CoinGecko coins: ${coinsRes.status}`)
    if (!globalRes.ok) throw new Error(`CoinGecko global: ${globalRes.status}`)

    const coins  = await coinsRes.json() as [{
      market_cap:             number
      total_volume:           number
      ath:                    number
      ath_change_percentage:  number
    }]
    const global = await globalRes.json() as { data: { market_cap_percentage: { btc: number } } }

    const coin = coins[0]
    return NextResponse.json({
      marketCapUsd:  coin.market_cap,
      volume24hUsd:  coin.total_volume,
      athUsd:        coin.ath,
      athDropPct:    Math.abs(coin.ath_change_percentage),  // positive % below ATH
      dominancePct:  global.data.market_cap_percentage.btc,
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 503 })
  }
}
```

- [ ] **Step 2: Verify locally**

```bash
npx next dev --port 3099 &
sleep 6
curl -s 'http://localhost:3099/api/btc-market-kpis' | python3 -c "import json,sys; d=json.load(sys.stdin); print('marketCap:', d.get('marketCapUsd'), 'ath:', d.get('athUsd'), 'dom:', d.get('dominancePct'))"
# Expected: marketCap: 1.1e12  ath: 109588  dom: ~56
pkill -f "next dev"
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/btc-market-kpis/route.ts
git commit -m "feat(api): add /api/btc-market-kpis — market cap, volume, ATH, dominance from CoinGecko"
```

---

## Task 2 — `/api/btc-technical`

**Files:**
- Create: `src/app/api/btc-technical/route.ts`

Fetches 200 daily BTC/USDT candles from `data-api.binance.vision` (public mirror, no geo-block).
Computes RSI14, MACD(12,26,9), MA50, MA200, distance and cross type.

- [ ] **Step 1: Create the route file**

```typescript
// src/app/api/btc-technical/route.ts
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const BINANCE = 'https://data-api.binance.vision'

async function fetchCloses(limit: number): Promise<number[]> {
  const url = `${BINANCE}/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=${limit}`
  const res = await fetch(url, { next: { revalidate: 300 } })
  if (!res.ok) throw new Error(`Binance klines: ${res.status}`)
  const data = await res.json() as [number, string, string, string, string, ...unknown[]][]
  return data.map(k => parseFloat(k[4]))  // index 4 = close price
}

function sma(arr: number[]): number {
  return arr.reduce((s, v) => s + v, 0) / arr.length
}

function ema(arr: number[], n: number): number[] {
  const k = 2 / (n + 1)
  const out = [arr[0]]
  for (let i = 1; i < arr.length; i++) out.push(arr[i] * k + out[i - 1] * (1 - k))
  return out
}

function computeRsi(closes: number[], period = 14): number {
  const changes = closes.slice(1).map((v, i) => v - closes[i])
  let avgGain = 0, avgLoss = 0
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) avgGain += changes[i]
    else avgLoss += Math.abs(changes[i])
  }
  avgGain /= period
  avgLoss /= period
  for (let i = period; i < changes.length; i++) {
    const g = changes[i] > 0 ? changes[i] : 0
    const l = changes[i] < 0 ? Math.abs(changes[i]) : 0
    avgGain = (avgGain * (period - 1) + g) / period
    avgLoss = (avgLoss * (period - 1) + l) / period
  }
  return avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss)
}

function computeMacd(closes: number[]): { hist: number; positive: boolean; growing: boolean } {
  const e12 = ema(closes, 12)
  const e26 = ema(closes, 26)
  const ml  = e12.map((v, i) => v - e26[i])
  const sl  = ema(ml, 9)
  const h   = ml.map((v, i) => v - sl[i])
  const L   = h.length - 1
  return { hist: h[L], positive: h[L] > 0, growing: h[L] > h[L - 1] }
}

export async function GET() {
  try {
    const closes = await fetchCloses(200)
    const current = closes[closes.length - 1]

    const rsi14 = computeRsi(closes)
    const macd  = computeMacd(closes)
    const ma200 = sma(closes)
    const ma50  = sma(closes.slice(-50))
    const ma200DistPct = ((current - ma200) / ma200) * 100

    return NextResponse.json({
      rsi14:        parseFloat(rsi14.toFixed(1)),
      macdHist:     parseFloat(macd.hist.toFixed(0)),
      macdPositive: macd.positive,
      macdGrowing:  macd.growing,
      ma200:        parseFloat(ma200.toFixed(0)),
      ma50:         parseFloat(ma50.toFixed(0)),
      ma200DistPct: parseFloat(ma200DistPct.toFixed(1)),
      crossType:    ma50 > ma200 ? 'golden' : 'death',
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 503 })
  }
}
```

- [ ] **Step 2: Verify locally**

```bash
npx next dev --port 3099 &
sleep 6
curl -s 'http://localhost:3099/api/btc-technical' | python3 -c "import json,sys; d=json.load(sys.stdin); print('rsi14:', d.get('rsi14'), 'macdPositive:', d.get('macdPositive'), 'ma200Dist:', d.get('ma200DistPct'), 'cross:', d.get('crossType'))"
# Expected: rsi14: some number 0-100, cross: 'golden' or 'death'
pkill -f "next dev"
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/btc-technical/route.ts
git commit -m "feat(api): add /api/btc-technical — RSI14, MACD, MA200 distance, cross from Binance"
```

---

## Task 3 — `TacticalCard.tsx`

Generic indicator card used throughout the redesigned page. Visual design matches the reference site (abrahub.com/desafiobtc/indicador/).

**Files:**
- Create: `src/components/dca-tactical/tactical/TacticalCard.tsx`

`dotLevel` is -2 to +2. Use `Math.round(Math.max(-2, Math.min(2, score / 5)))` to map raw score (-10..+10) to dot level.

- [ ] **Step 1: Create the component**

```typescript
// src/components/dca-tactical/tactical/TacticalCard.tsx
'use client'

const IMPACT_COLOR: Record<string, string> = {
  '2':  '#22c55e',
  '1':  '#84cc16',
  '0':  '#71717a',
  '-1': '#f97316',
  '-2': '#ef4444',
}

const DOT_SPECS = [
  { level: -2, color: '#ef4444' },
  { level: -1, color: '#f97316' },
  { level:  0, color: '#71717a' },
  { level:  1, color: '#84cc16' },
  { level:  2, color: '#22c55e' },
]

export interface TacticalCardData {
  name:        string
  statusLabel: string
  description: string
  value:       string | null
  dotLevel:    number   // -2 to +2
  score:       number   // raw score for chip label (can be fractional group score)
}

interface Props {
  data:  TacticalCardData
  delay?: number
}

export default function TacticalCard({ data, delay = 0 }: Props) {
  const { name, statusLabel, description, value, dotLevel, score } = data
  const clampedLevel = Math.max(-2, Math.min(2, dotLevel))
  const color = IMPACT_COLOR[String(clampedLevel)] ?? '#71717a'
  const sign  = score > 0 ? '+' : ''

  return (
    <div
      className="ind-card"
      style={{
        display:             'grid',
        gridTemplateColumns: '1fr auto',
        alignItems:          'start',
        gap:                 '20px',
        padding:             '24px 32px',
        borderBottom:        '1px solid var(--border)',
        transition:          'background 0.15s',
        animationName:           'fadeIn',
        animationDuration:       '0.4s',
        animationTimingFunction: 'ease',
        animationDelay:          `${delay}s`,
        animationFillMode:       'both',
      }}
      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.015)')}
      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
    >
      {/* Left */}
      <div>
        <div style={{
          fontSize:      '11px',
          fontWeight:    700,
          color:         '#fff',
          textTransform: 'uppercase',
          letterSpacing: '0.9px',
          marginBottom:  '7px',
        }}>
          {name}
        </div>
        <div style={{ fontSize: '15px', fontWeight: 700, color, marginBottom: '8px', lineHeight: 1.2 }}>
          {statusLabel}
        </div>
        {description && (
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: '520px' }}>
            {description}
          </div>
        )}
      </div>

      {/* Right */}
      <div className="ind-card-right" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px', flexShrink: 0 }}>
        <div className="ind-card-value" style={{
          fontSize:           value && value.length > 6 ? '22px' : '36px',
          fontWeight:         900,
          letterSpacing:      '-1.5px',
          color,
          lineHeight:         1,
          fontVariantNumeric: 'tabular-nums',
          textAlign:          'right',
          maxWidth:           '130px',
          wordBreak:          'break-all',
        }}>
          {value ?? '—'}
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {DOT_SPECS.map(({ level, color: dc }) => {
            const active = level === clampedLevel
            return (
              <div
                key={level}
                style={{
                  width:        '12px',
                  height:       '12px',
                  borderRadius: '50%',
                  background:   dc,
                  opacity:      active ? 1 : 0.15,
                  transform:    active ? 'scale(1.35)' : 'scale(1)',
                  boxShadow:    active ? `0 0 9px ${dc}` : 'none',
                  flexShrink:   0,
                  transition:   'all 0.2s',
                }}
              />
            )
          })}
        </div>
        <div style={{
          fontSize:     '11px',
          fontWeight:   700,
          padding:      '3px 12px',
          borderRadius: '999px',
          border:       `1.5px solid ${color}`,
          color,
          whiteSpace:   'nowrap',
        }}>
          {sign}{Math.round(score)} {Math.abs(Math.round(score)) !== 1 ? 'pontos' : 'ponto'}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/diegomoreno/development/btc-monitor-web-next && npx tsc --noEmit 2>&1
# Expected: no output (no errors)
```

- [ ] **Step 3: Commit**

```bash
git add src/components/dca-tactical/tactical/TacticalCard.tsx
git commit -m "feat(ui): add TacticalCard — generic indicator card matching reference site design"
```

---

## Task 4 — `TacticalHero.tsx`

Hero section: large score number, regime verdict label, reading, BTC price, timestamp.
Color and glow adapt to score value. No business logic — pure display.

**Files:**
- Create: `src/components/dca-tactical/tactical/TacticalHero.tsx`

Score (0-100) color scale: ≤25 = red, ≤40 = orange, ≤55 = yellow, ≤70 = cyan, >70 = green.

Regime to verdict label mapping (same as existing HeroSection but simplified):
```
CAPITULATION_ZONE       → "Capitulação"
TACTICAL_BUY_AGGRESSIVE → "Compra Tática Agressiva"
TACTICAL_BUY_MODERATE   → "Compra Tática Moderada"
TACTICAL_BUY_LIGHT      → "Compra Tática Leve"
NEUTRAL                 → "Neutro"
RISK_OFF                → "Risk-off"
EXTREME_RISK            → "Risco Extremo"
OVERLEVERAGED_MARKET    → "Mercado Alavancado"
EUPHORIA_ZONE           → "Euforia"
```

- [ ] **Step 1: Create the component**

```typescript
// src/components/dca-tactical/tactical/TacticalHero.tsx
'use client'

const REGIME_LABEL: Record<string, string> = {
  CAPITULATION_ZONE:       'Capitulação',
  TACTICAL_BUY_AGGRESSIVE: 'Compra Tática Agressiva',
  TACTICAL_BUY_MODERATE:   'Compra Tática Moderada',
  TACTICAL_BUY_LIGHT:      'Compra Tática Leve',
  NEUTRAL:                 'Neutro',
  RISK_OFF:                'Risk-off',
  EXTREME_RISK:            'Risco Extremo',
  OVERLEVERAGED_MARKET:    'Mercado Alavancado',
  EUPHORIA_ZONE:           'Euforia',
}

function scoreColor(s: number): string {
  if (s <= 25) return '#ef4444'
  if (s <= 40) return '#f97316'
  if (s <= 55) return '#eab308'
  if (s <= 70) return '#00bcd4'
  return '#22c55e'
}

function formatPrice(usd: number | null): string {
  if (!usd) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(usd)
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

interface Props {
  score:       number       // 0-100
  regime:      string
  reading:     string
  btcPriceUsd: number | null
  generatedAt: string       // ISO
}

export default function TacticalHero({ score, regime, reading, btcPriceUsd, generatedAt }: Props) {
  const color       = scoreColor(score)
  const regimeLabel = REGIME_LABEL[regime] ?? regime

  return (
    <div style={{
      position:   'relative',
      overflow:   'hidden',
      padding:    '0 32px 52px',
      marginTop:  '-140px',       // overlap with page header — adjust if needed
      display:    'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign:  'center',
      borderBottom: '1px solid var(--border)',
    }}>
      {/* Background glow */}
      <div style={{
        position:      'absolute',
        width:         '500px',
        height:        '300px',
        borderRadius:  '50%',
        filter:        'blur(80px)',
        top:           0,
        left:          '50%',
        transform:     'translateX(-50%)',
        background:    color,
        opacity:       0.12,
        pointerEvents: 'none',
      }} />

      {/* Score number */}
      <div style={{
        position:      'relative',
        fontSize:      'clamp(80px, 16vw, 160px)',
        fontWeight:    900,
        color,
        lineHeight:    1,
        letterSpacing: '-5px',
        marginTop:     '40px',
        textShadow:    `0 0 100px ${color}44`,
      }}>
        {Math.round(score)}
      </div>

      {/* / 100 */}
      <div style={{ position: 'relative', fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: '4px' }}>
        / 100
      </div>

      {/* Regime verdict */}
      <div style={{ position: 'relative', fontSize: '22px', fontWeight: 900, color: '#fff', marginTop: '18px', letterSpacing: '-0.5px' }}>
        {regimeLabel.toUpperCase()}
      </div>

      {/* Reading */}
      {reading && (
        <div style={{ position: 'relative', fontSize: '15px', color: 'rgba(255,255,255,0.55)', maxWidth: '520px', lineHeight: 1.6, marginTop: '12px' }}>
          {reading}
        </div>
      )}

      {/* BTC price + timestamp */}
      <div style={{ position: 'relative', fontSize: '13px', color: 'var(--text-muted)', marginTop: '20px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
        <span>BTC: <strong style={{ color: '#fff' }}>{formatPrice(btcPriceUsd)}</strong></span>
        <span style={{ color: 'var(--border)' }}>·</span>
        <span>Atualizado em: {formatTime(generatedAt)}</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1
# Expected: no output
```

- [ ] **Step 3: Commit**

```bash
git add src/components/dca-tactical/tactical/TacticalHero.tsx
git commit -m "feat(ui): add TacticalHero — large score, regime label, reading, price, timestamp"
```

---

## Task 5 — `OpportunityBar.tsx` + `MarketKPIRow.tsx`

Two small display-only components.

**Files:**
- Create: `src/components/dca-tactical/tactical/OpportunityBar.tsx`
- Create: `src/components/dca-tactical/tactical/MarketKPIRow.tsx`

- [ ] **Step 1: Create `OpportunityBar.tsx`**

The bar uses the reference site's gradient: `linear-gradient(to right, #7f1d1d 0%, #ef4444 15%, #f97316 28%, #eab308 42%, #84cc16 58%, #22c55e 75%, #10b981 88%, #059669 100%)`.

```typescript
// src/components/dca-tactical/tactical/OpportunityBar.tsx
'use client'

interface Props {
  score: number  // 0-100
}

export default function OpportunityBar({ score }: Props) {
  const thumbPct = Math.max(2, Math.min(98, score))

  return (
    <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)' }}>
      <div style={{
        display:       'flex',
        justifyContent:'space-between',
        fontSize:      '11px',
        color:         'var(--text-muted)',
        marginBottom:  '10px',
        letterSpacing: '0.5px',
        textTransform: 'uppercase',
      }}>
        <span>Péssimo</span>
        <span>Regular</span>
        <span>Oportunidade</span>
      </div>

      <div style={{
        height:       '12px',
        borderRadius: '999px',
        position:     'relative',
        background:   'linear-gradient(to right, #7f1d1d 0%, #ef4444 15%, #f97316 28%, #eab308 42%, #84cc16 58%, #22c55e 75%, #10b981 88%, #059669 100%)',
        boxShadow:    '0 0 16px rgba(0,0,0,0.4)',
      }}>
        <div style={{
          width:         '22px',
          height:        '22px',
          background:    '#fff',
          borderRadius:  '50%',
          border:        '3px solid rgba(0,0,0,0.35)',
          position:      'absolute',
          top:           '50%',
          left:          `${thumbPct}%`,
          transform:     'translate(-50%, -50%)',
          transition:    'left 1.1s cubic-bezier(0.34, 1.56, 0.64, 1)',
          boxShadow:     '0 0 12px rgba(255,255,255,0.6), 0 2px 8px rgba(0,0,0,0.35)',
        }} />
      </div>

      <div style={{ marginTop: '10px', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>
        Score <strong style={{ color: '#fff' }}>{Math.round(score)}</strong> / 100
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `MarketKPIRow.tsx`**

Formats large numbers as "$1.2T", "$25.4B", etc. Shows 5 KPIs in a responsive row.

```typescript
// src/components/dca-tactical/tactical/MarketKPIRow.tsx
'use client'

function fNum(v: number | null | undefined): string {
  if (!v) return '—'
  if (v >= 1e12) return '$' + (v / 1e12).toFixed(2) + 'T'
  if (v >= 1e9)  return '$' + (v / 1e9).toFixed(2)  + 'B'
  if (v >= 1e6)  return '$' + (v / 1e6).toFixed(2)  + 'M'
  return '$' + v.toLocaleString('en-US')
}

function fPct(v: number | null | undefined): string {
  if (v == null) return '—'
  return v.toFixed(1) + '%'
}

function fPrice(v: number | null | undefined): string {
  if (!v) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v)
}

interface Props {
  marketCapUsd:  number | null
  volume24hUsd:  number | null
  athUsd:        number | null
  dominancePct:  number | null
  btcPriceUsd:   number | null
}

export default function MarketKPIRow({ marketCapUsd, volume24hUsd, athUsd, dominancePct, btcPriceUsd }: Props) {
  const kpis = [
    { label: 'Market Cap',      value: fNum(marketCapUsd) },
    { label: 'Dominância BTC',  value: fPct(dominancePct) },
    { label: 'Volume 24h',      value: fNum(volume24hUsd) },
    { label: 'ATH Histórico',   value: fPrice(athUsd) },
    { label: 'Preço Atual',     value: fPrice(btcPriceUsd) },
  ]

  return (
    <div style={{
      display:             'grid',
      gridTemplateColumns: 'repeat(5, 1fr)',
      borderBottom:        '1px solid var(--border)',
    }}>
      {kpis.map(({ label, value }, i) => (
        <div
          key={label}
          style={{
            padding:     '18px 20px',
            borderRight: i < kpis.length - 1 ? '1px solid var(--border)' : 'none',
            transition:  'background 0.15s',
          }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
        >
          <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)', marginBottom: '4px' }}>
            {label}
          </div>
          <div style={{ fontSize: '17px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
            {value}
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Add responsive CSS for KPI grid**

In `src/app/globals.css`, add inside the existing `@media (max-width: 640px)` block:

```css
/* After: .mobile-text-sm { font-size: 12px !important; } */
  .kpi-grid { grid-template-columns: repeat(2, 1fr) !important; }
```

And add a separate rule:
```css
@media (max-width: 400px) {
  .kpi-grid { grid-template-columns: 1fr !important; }
}
```

Also add `className="kpi-grid"` to the outer div in `MarketKPIRow.tsx`.

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1
# Expected: no output
```

- [ ] **Step 5: Commit**

```bash
git add src/components/dca-tactical/tactical/OpportunityBar.tsx src/components/dca-tactical/tactical/MarketKPIRow.tsx src/app/globals.css
git commit -m "feat(ui): add OpportunityBar (gradient score bar) and MarketKPIRow (5 KPIs)"
```

---

## Task 6 — `TacticalSectionHeader.tsx` + `TacticalConsensus.tsx` + `TacticalInsights.tsx`

Three small components: group divider, simplified consensus, institutional notes list.

**Files:**
- Create: `src/components/dca-tactical/tactical/TacticalSectionHeader.tsx`
- Create: `src/components/dca-tactical/tactical/TacticalConsensus.tsx`
- Create: `src/components/dca-tactical/tactical/TacticalInsights.tsx`

- [ ] **Step 1: Create `TacticalSectionHeader.tsx`**

Displays the group label (e.g., "SENTIMENTO") and its summed score. Shows a colored left border bar.

```typescript
// src/components/dca-tactical/tactical/TacticalSectionHeader.tsx

function scoreColor(s: number): string {
  if (s >= 4)  return '#22c55e'
  if (s >= 1)  return '#84cc16'
  if (s >= -1) return '#71717a'
  if (s >= -4) return '#f97316'
  return '#ef4444'
}

interface Props {
  label: string   // e.g. "Sentimento"
  score: number   // group score (raw sum)
}

export default function TacticalSectionHeader({ label, score }: Props) {
  const color = scoreColor(score)
  const sign  = score > 0 ? '+' : ''

  return (
    <div style={{
      padding:      '16px 32px 12px',
      fontSize:     '11px',
      textTransform:'uppercase',
      letterSpacing:'1.2px',
      color:        'var(--text-muted)',
      borderBottom: '1px solid var(--border)',
      display:      'flex',
      alignItems:   'center',
      gap:          '8px',
    }}>
      <div style={{ width: '3px', height: '16px', background: 'var(--orange)', borderRadius: '2px', flexShrink: 0 }} />
      <span style={{ flex: 1 }}>{label}</span>
      <span style={{ fontWeight: 700, color, fontSize: '12px' }}>
        {sign}{score} pts
      </span>
    </div>
  )
}
```

- [ ] **Step 2: Create `TacticalConsensus.tsx`**

List format: Bullish / Neutro / Bearish counts, then auto-narrative. No donut chart.

```typescript
// src/components/dca-tactical/tactical/TacticalConsensus.tsx
import type { IndicatorGroup } from '@lib/shared/types/signal'

interface Props {
  groups:          IndicatorGroup[]
  extraScores?:    number[]   // scores from derived indicators (RSI, MACD, ATH, etc.)
}

function narrativeSummary(pos: number, neu: number, neg: number): string {
  const total = pos + neu + neg || 1
  const pct   = Math.round((pos / total) * 100)
  if (neg === 0) return `${pos} de ${total} indicadores bullish. Nenhum em zona de risco. Momento propício para acumulação.`
  if (pct >= 70) return `${pos} de ${total} indicadores bullish. ${neg} em alerta — monitorar de perto.`
  if (pct >= 50) return `Leve maioria bullish (${pos}/${total}). ${neg} indicadores em alerta — cautela moderada.`
  return `Cenário misto (${pos} bullish, ${neg} em alerta). Aguardar maior clareza antes de posições táticas.`
}

export default function TacticalConsensus({ groups, extraScores = [] }: Props) {
  const allScores = [
    ...groups.flatMap(g => g.indicators.map(i => i.score)),
    ...extraScores,
  ]
  const pos   = allScores.filter(s => s > 1).length
  const neu   = allScores.filter(s => s >= -1 && s <= 1).length
  const neg   = allScores.filter(s => s < -1).length
  const total = allScores.length || 1
  const bullPct = Math.round((pos / total) * 100)

  return (
    <div style={{
      padding:      '28px 32px',
      borderBottom: '1px solid var(--border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
        <div style={{ width: '3px', height: '14px', background: 'var(--orange)', borderRadius: '2px' }} />
        <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.2px' }}>
          Consenso do Mercado
        </div>
      </div>

      <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Counts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            { label: 'Bullish', count: pos, color: '#22c55e' },
            { label: 'Neutro',  count: neu, color: '#71717a' },
            { label: 'Bearish', count: neg, color: '#ef4444' },
          ].map(({ label, count, color }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', minWidth: '60px' }}>{label}:</span>
              <span style={{ fontSize: '20px', fontWeight: 900, color }}>{count}</span>
            </div>
          ))}
        </div>

        {/* Percentage + narrative */}
        <div style={{ flex: 1, minWidth: '220px' }}>
          <div style={{ fontSize: '42px', fontWeight: 900, color: bullPct >= 60 ? '#22c55e' : bullPct >= 40 ? '#eab308' : '#ef4444', lineHeight: 1, marginBottom: '10px' }}>
            {bullPct}%
          </div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
            dos indicadores bullish
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: '420px' }}>
            {narrativeSummary(pos, neu, neg)}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `TacticalInsights.tsx`**

```typescript
// src/components/dca-tactical/tactical/TacticalInsights.tsx

interface Props {
  insights: string[]
}

export default function TacticalInsights({ insights }: Props) {
  if (!insights || insights.length === 0) return null

  return (
    <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <div style={{ width: '3px', height: '14px', background: 'var(--orange)', borderRadius: '2px' }} />
        <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.2px' }}>
          Observações Institucionais
        </div>
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {insights.map((item, i) => (
          <li key={i} style={{ display: 'flex', gap: '10px', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            <span style={{ color: 'var(--orange)', flexShrink: 0, marginTop: '2px' }}>•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1
# Expected: no output
```

- [ ] **Step 5: Commit**

```bash
git add src/components/dca-tactical/tactical/TacticalSectionHeader.tsx \
        src/components/dca-tactical/tactical/TacticalConsensus.tsx \
        src/components/dca-tactical/tactical/TacticalInsights.tsx
git commit -m "feat(ui): add TacticalSectionHeader, TacticalConsensus, TacticalInsights"
```

---

## Task 7 — Rewrite `DcaTacticalPage.tsx`

This is the main composition task. It replaces the current layout with the new components. All existing business logic (scoring, DCA allocation, contributions) stays intact and moves to the bottom secondary section.

**Files:**
- Modify: `src/components/dca-tactical/DcaTacticalPage.tsx`

Read the current file before editing. The new structure:
1. Fetch market snapshot (existing)
2. Fetch `/api/btc-market-kpis` (new, non-blocking)
3. Fetch `/api/btc-technical` (new, non-blocking)
4. Derive new indicator cards (RSI, MACD, ATH, MM200 dist, Cross) from technical data
5. Render new layout

**New MarketSnapshot interface** (add missing fields from the API response):

```ts
interface MarketSnapshot {
  snapshotId:        string | null
  generatedAt:       string
  btcPriceUsd:       number | null
  marketRegime:      string
  riskScore:         number
  opportunityScore:  number
  convictionScore:   number
  euphoriaScore:     number
  capitulationScore: number
  riskLevel:         string
  actionBias:        string
  score:             { raw: number; weighted: number }
  summary:           string
  reading:           string
  insights:          string[]
  indicatorGroups:   IndicatorGroup[]
  triggeredRules:    unknown[]
  dimensionScores:   { sentiment: number; derivatives: number; onchain: number; trend: number }
  explanation:       { smoothedScore: number; classification: string }
}
```

**New KPI + Technical types:**

```ts
interface MarketKpis {
  marketCapUsd: number | null
  volume24hUsd: number | null
  athUsd:       number | null
  athDropPct:   number | null
  dominancePct: number | null
}

interface BtcTechnical {
  rsi14:        number | null
  macdHist:     number | null
  macdPositive: boolean | null
  macdGrowing:  boolean | null
  ma200:        number | null
  ma50:         number | null
  ma200DistPct: number | null
  crossType:    'golden' | 'death' | null
}
```

**Scoring helpers** (add to top of the file, copied from the plan header):

```ts
function dotLevel(score: number): number {
  return Math.round(Math.max(-2, Math.min(2, score)))
}

function scoreColor(score: number): string {
  const COLORS: Record<string, string> = { '2': '#22c55e', '1': '#84cc16', '0': '#71717a', '-1': '#f97316', '-2': '#ef4444' }
  return COLORS[String(Math.round(Math.max(-2, Math.min(2, score))))] ?? '#71717a'
}

function scoreRsi(rsi: number): number {
  if (rsi < 30) return  2; if (rsi < 45) return  1; if (rsi < 60) return 0; if (rsi < 70) return -1; return -2
}
function rsiLabel(rsi: number): string {
  if (rsi < 30) return 'Sobrevendido'; if (rsi < 45) return 'Abaixo do Normal'; if (rsi < 60) return 'Neutro'; if (rsi < 70) return 'Acima do Normal'; return 'Sobrecomprado'
}
function scoreMacd(positive: boolean, growing: boolean): number {
  if (!positive && growing) return 2; if (!positive && !growing) return 1; if (positive && !growing) return -1; return -2
}
function macdLabel(positive: boolean, growing: boolean): string {
  if (!positive && growing)  return 'Venda Enfraquecendo — Reversão Provável'
  if (!positive && !growing) return 'Correção Forte — Fundo em Formação'
  if (positive  && !growing) return 'Alta Perdendo Força — Ciclo Maduro'
  return 'Alta Acelerando — Possível Topo'
}
function scoreMa200Dist(pct: number): number {
  if (pct < -30) return 2; if (pct < -10) return 1; if (pct < 30) return 0; if (pct < 80) return -1; return -2
}
function scoreAthDrop(drop: number): number {
  if (drop > 70) return 2; if (drop > 50) return 1; if (drop > 25) return 0; if (drop > 10) return -1; return 0
}
```

**Per-group derived cards** — the trend group gets RSI, MACD, MM200 distance, cross cards; onchain gets ATH distance card:

```ts
function buildTrendExtraCards(tech: BtcTechnical | null): TacticalCardData[] {
  if (!tech) return []
  const cards: TacticalCardData[] = []

  if (tech.rsi14 !== null) {
    const s = scoreRsi(tech.rsi14)
    cards.push({
      name:        'RSI 14 Dias',
      statusLabel: rsiLabel(tech.rsi14),
      description: 'Abaixo de 30: sobrevendido — queda exagerada, historicamente favorável para acumulação em 12 meses. Acima de 70: sobrecomprado — preço esticado, pior momento para comprar.',
      value:       String(tech.rsi14),
      score:       s,
      dotLevel:    dotLevel(s),
    })
  }

  if (tech.macdPositive !== null && tech.macdGrowing !== null) {
    const s = scoreMacd(tech.macdPositive, tech.macdGrowing)
    cards.push({
      name:        'MACD — Momentum',
      statusLabel: macdLabel(tech.macdPositive, tech.macdGrowing),
      description: 'Para quem acumula BTC a 1+ ano: correção forte / venda enfraquecendo = fundo em formação = melhor entrada. Alta acelerando = possível topo de ciclo = pior entrada.',
      value:       tech.macdHist !== null ? String(Math.round(tech.macdHist)) : '—',
      score:       s,
      dotLevel:    dotLevel(s),
    })
  }

  if (tech.ma200DistPct !== null) {
    const s = scoreMa200Dist(tech.ma200DistPct)
    const sign = tech.ma200DistPct > 0 ? '+' : ''
    cards.push({
      name:        'Preço vs MM200',
      statusLabel: tech.ma200DistPct < 0
        ? `${tech.ma200DistPct.toFixed(1)}% abaixo da MM200`
        : `+${tech.ma200DistPct.toFixed(1)}% acima da MM200`,
      description: `MM200 = $${tech.ma200?.toLocaleString('en-US') ?? '—'}. Abaixo da MM200 = preço em zona de desconto histórico. Mais de 80% acima = mercado esticado, risco de topo.`,
      value:       `${sign}${tech.ma200DistPct.toFixed(1)}%`,
      score:       s,
      dotLevel:    dotLevel(s),
    })
  }

  if (tech.crossType !== null) {
    const isGolden = tech.crossType === 'golden'
    const s        = isGolden ? -1 : 1
    cards.push({
      name:        'Cruz MM50 / MM200',
      statusLabel: isGolden ? 'Cruz Dourada — Preço Já Recuperado' : 'Cruz da Morte — Zona de Fundo Histórico',
      description: `MM50 = $${tech.ma50?.toLocaleString('en-US') ?? '—'} | MM200 = $${tech.ma200?.toLocaleString('en-US') ?? '—'}. Para 1+ ano: Cruz da Morte (preço em queda) = zona de fundo histórico = comprar. Cruz Dourada = preço já subiu = entrada menos vantajosa.`,
      value:       isGolden ? 'Dourada' : 'Morte',
      score:       s,
      dotLevel:    dotLevel(s),
    })
  }

  return cards
}

function buildOnchainExtraCards(kpis: MarketKpis | null, btcPriceUsd: number | null): TacticalCardData[] {
  if (!kpis?.athUsd || !btcPriceUsd) return []
  const dropPct = ((kpis.athUsd - btcPriceUsd) / kpis.athUsd) * 100
  const s       = scoreAthDrop(dropPct)
  return [{
    name:        'Distância do ATH',
    statusLabel: `−${dropPct.toFixed(0)}% do topo histórico`,
    description: `ATH = $${Math.round(kpis.athUsd).toLocaleString('en-US')}. Quanto mais longe do topo, mais barato está o ativo. Quedas acima de 50% do ATH são historicamente janelas raras com alto retorno em 1 ano.`,
    value:       `−${dropPct.toFixed(0)}%`,
    score:       s,
    dotLevel:    dotLevel(s),
  }]
}
```

**Indicator descriptions** (add a lookup so existing indicator cards also show descriptions):

Keep the `INDICATOR_WHAT` map from `DcaIndicatorBreakdown.tsx` as a separate import or copy it into `DcaTacticalPage.tsx`. Use it when building cards from `indicatorGroups`.

**Rendering the indicator groups** — for each `IndicatorGroup`, render a `TacticalSectionHeader` followed by individual `TacticalCard` components, then any extra derived cards for that group:

```ts
function groupExtraCards(groupKey: string, tech: BtcTechnical | null, kpis: MarketKpis | null, btcPriceUsd: number | null): TacticalCardData[] {
  if (groupKey === 'trend')   return buildTrendExtraCards(tech)
  if (groupKey === 'onchain') return buildOnchainExtraCards(kpis, btcPriceUsd)
  return []
}
```

**Converting existing IndicatorScore to TacticalCardData:**

```ts
function indicatorToCard(ind: IndicatorScore, delay: number): TacticalCardData {
  const { rawValue, specificLabel } = parseSummary(ind.summary)
  const impactOf  = (s: number) => Math.round(Math.max(-2, Math.min(2, s / 5)))
  const dl        = impactOf(ind.score)
  return {
    name:        ind.name,
    statusLabel: specificLabel ?? impactLabelOf(dl),
    description: INDICATOR_WHAT[ind.name] ?? '',
    value:       rawValue,
    score:       ind.score,
    dotLevel:    dl,
  }
}

function impactLabelOf(level: number): string {
  const LABELS: Record<string, string> = { '2': 'Positivo Forte', '1': 'Positivo', '0': 'Neutro', '-1': 'Negativo', '-2': 'Negativo Forte' }
  return LABELS[String(level)] ?? 'Neutro'
}

// parseSummary is the same function from DcaIndicatorBreakdown — copy it here
function parseSummary(summary: string): { rawValue: string | null; specificLabel: string | null } {
  if (!summary || summary.startsWith('indisponível')) return { rawValue: null, specificLabel: null }
  const clean   = summary.replace(/\s*\([+-]?\d+\)\s*$/, '').trim()
  if (!clean) return { rawValue: null, specificLabel: null }
  const dashIdx = clean.indexOf(' — ')
  if (dashIdx !== -1) {
    return { rawValue: clean.slice(0, dashIdx).trim() || null, specificLabel: clean.slice(dashIdx + 3).trim() || null }
  }
  const numMatch = clean.match(/[-+]?[\d.,]+[%×xkKmMbB$]?/)
  return { rawValue: numMatch ? numMatch[0] : clean, specificLabel: null }
}
```

**DCA secondary section** — keep the existing DCA allocation content (AccumulationHero, DcaStatusDoMesCard, TacticalOpportunitiesHistory) but wrapped in a collapsible section at the bottom:

```tsx
{/* DCA Allocation — secondary section */}
{allocation && (
  <div style={{ borderTop: '1px solid var(--border)' }}>
    <details>
      <summary style={{
        padding:    '16px 32px',
        cursor:     'pointer',
        fontSize:   '11px',
        fontWeight: 700,
        color:      'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '1.2px',
        listStyle:  'none',
        display:    'flex',
        alignItems: 'center',
        gap:        '8px',
      }}>
        <div style={{ width: '3px', height: '14px', background: 'var(--orange)', borderRadius: '2px' }} />
        Alocação DCA
      </summary>
      <div style={{ padding: '0 0 24px' }}>
        {/* existing AccumulationHero and DcaStatusDoMesCard go here */}
        <DcaStatusDoMesCard
          tacticalPool={tacticalPool}
          contributions={contributions}
          usedThisMonth={usedThisMonth}
        />
        <TacticalOpportunitiesHistory contributions={contributions} />
      </div>
    </details>
  </div>
)}
```

- [ ] **Step 1: Read the current DcaTacticalPage.tsx in full before editing**

```bash
cat -n src/components/dca-tactical/DcaTacticalPage.tsx
```

- [ ] **Step 2: Replace DcaTacticalPage.tsx with the new implementation**

The new file keeps all existing state, effects, calculations (score, marketState, allocation, contributions fetching) but changes only what's rendered.

```typescript
// src/components/dca-tactical/DcaTacticalPage.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import type { DcaPlanRow, RiskProfile, DcaContributionRow } from '@/lib/db/types'
import type { DcaTacticalConfig, DcaAllocation, DcaMarketState } from '@/lib/dca-tactical/types'
import type { DcaStrategyProfile } from '@/lib/dca-tactical/types'
import { DEFAULT_TACTICAL_CONFIG } from '@/lib/dca-tactical/types'
import { calculateDcaOpportunityScore, classifyDcaMarketState } from '@/lib/dca-tactical/score'
import { calculateDcaAllocation } from '@/lib/dca-tactical/allocation'
import type { IndicatorGroup, IndicatorScore } from '@lib/shared/types/signal'
import type { TacticalCardData } from './tactical/TacticalCard'

import TacticalCard   from './tactical/TacticalCard'
import TacticalHero   from './tactical/TacticalHero'
import OpportunityBar from './tactical/OpportunityBar'
import MarketKPIRow   from './tactical/MarketKPIRow'
import TacticalSectionHeader from './tactical/TacticalSectionHeader'
import TacticalConsensus from './tactical/TacticalConsensus'
import TacticalInsights  from './tactical/TacticalInsights'
import DcaStatusDoMesCard from './DcaStatusDoMesCard'

// ── Indicator descriptions (visible text, no tooltip needed) ──────────────────
const INDICATOR_WHAT: Record<string, string> = {
  'Medo & Ganância':     'Índice 0–100 de sentimento. Medo extremo (≤20) = todos vendendo em pânico = historicamente os melhores pontos de entrada. Ganância extrema (≥80) = euforia de topo = pior hora para comprar.',
  'Taxa de Funding':     'Funding negativo = shorts pagam longs = mercado alavancado na baixa, possível exaustão dos vendedores e reversão.',
  'Variação 7d':         'Queda forte em 7 dias pode indicar capitulação — janelas históricas de acumulação. Alta forte pode sinalizar sobrecompra de curto prazo.',
  'Open Interest':       'OI alto com preço elevado = risco de liquidações em cascata. OI caindo após queda = limpeza de alavancagem, possivelmente estabilizando.',
  'Liq. de Longs':       'Liquidações em massa de posições compradas sinalizam capitulação e criam fundos locais — oportunidade para quem está fora.',
  'MVRV':                'Abaixo de 1: BTC abaixo do custo médio dos holders — historicamente raro e muito favorável. Acima de 3.5: holders em grande lucro, sinal de topo.',
  'Preço Realizado':     'Quando o preço de mercado fica abaixo do Preço Realizado, a maioria dos holders está no prejuízo — zona histórica de acumulação.',
  'Mayer Multiple':      'Preço ÷ MM200. Abaixo de 1.0 = historicamente barato. Abaixo de 0.7 = zona rara. Acima de 2.4 = extremo histórico de sobrevalorização.',
  'Hash Ribbon':         'Quando mineradores capitulam (hashrate cai), pode sinalizar fundo. Cruzamento de recuperação = sinal histórico de compra.',
  'Pressão venda':       'Alta pressão = mais BTC chegando ao mercado. Baixa pressão = holders retendo, expectativa de valorização.',
  'Médias Móveis':       'Posição do preço vs MAs de 50d, 100d e 200d. Abaixo de múltiplas MAs = desconto histórico. Golden/Death Cross indicam mudança de tendência.',
  'ETF Institucional':   'Entradas positivas = instituições comprando. Saídas = desinvestimento — reflete demanda do mercado tradicional.',
  'Pi Cycle Top':        'Quando MM111 cruza o dobro da MM350, historicamente coincide com topos de ciclo. Longe do cruzamento = bom para acumular.',
  'Bollinger %B':        'Abaixo de 0: sobrevendido (abaixo da banda inferior). Acima de 1: sobrecomprado. Extremos indicam reversão iminente.',
  'DXY (Dólar Index)':   'DXY forte = pressão sobre BTC. DXY fraco = condições historicamente favoráveis para criptomoedas.',
  'Long/Short Ratio':    'Excesso de longs = otimismo excessivo, risco. Excesso de shorts = pessimismo extremo, potencial reversão.',
  'BTC Dominância':      'Crescendo = capital migrando para BTC. Caindo = altcoins superando — geralmente ocorre em topos de ciclo.',
  'Heatmap Liquidações': 'Identifica zonas onde o mercado tende a se mover para liquidar posições alavancadas antes de reverter.',
  'Stablecoin Ratio':    'Ratio alto = muito capital parado esperando entrar — sinal de demanda futura reprimida.',
  'Regime de Mercado':   'Classificação sintética do estado atual: capitulação, compra tática, neutro, risk-off, alavancagem excessiva ou euforia.',
  'Sinais Compostos':    'Detecta padrões multi-indicadores como "funding negativo + OI caindo + medo extremo" que individualmente seriam inconclusivos.',
}

// ── parseSummary ─────────────────────────────────────────────────────────────
function parseSummary(summary: string): { rawValue: string | null; specificLabel: string | null } {
  if (!summary || summary.startsWith('indisponível')) return { rawValue: null, specificLabel: null }
  const clean   = summary.replace(/\s*\([+-]?\d+\)\s*$/, '').trim()
  if (!clean) return { rawValue: null, specificLabel: null }
  const dashIdx = clean.indexOf(' — ')
  if (dashIdx !== -1) {
    return { rawValue: clean.slice(0, dashIdx).trim() || null, specificLabel: clean.slice(dashIdx + 3).trim() || null }
  }
  const numMatch = clean.match(/[-+]?[\d.,]+[%×xkKmMbB$]?/)
  return { rawValue: numMatch ? numMatch[0] : clean, specificLabel: null }
}

// ── Scoring for new derived indicators ───────────────────────────────────────
function impactLabelOf(level: number): string {
  const L: Record<string, string> = { '2': 'Positivo Forte', '1': 'Positivo', '0': 'Neutro', '-1': 'Negativo', '-2': 'Negativo Forte' }
  return L[String(level)] ?? 'Neutro'
}
function dl(s: number): number { return Math.round(Math.max(-2, Math.min(2, s))) }

function scoreRsi(v: number): number { return v<30?2:v<45?1:v<60?0:v<70?-1:-2 }
function rsiLabel(v: number): string { return v<30?'Sobrevendido':v<45?'Abaixo do Normal':v<60?'Neutro':v<70?'Acima do Normal':'Sobrecomprado' }
function scoreMacd(pos: boolean, grow: boolean): number { return !pos&&grow?2:!pos&&!grow?1:pos&&!grow?-1:-2 }
function macdLabel(pos: boolean, grow: boolean): string {
  return !pos&&grow?'Venda Enfraquecendo — Reversão Provável':!pos&&!grow?'Correção Forte — Fundo em Formação':pos&&!grow?'Alta Perdendo Força — Ciclo Maduro':'Alta Acelerando — Possível Topo'
}
function scoreMa200Dist(pct: number): number { return pct<-30?2:pct<-10?1:pct<30?0:pct<80?-1:-2 }
function scoreAthDrop(d: number): number { return d>70?2:d>50?1:d>25?0:d>10?-1:0 }

// ── Types ─────────────────────────────────────────────────────────────────────
interface MarketSnapshot {
  snapshotId:        string | null
  generatedAt:       string
  btcPriceUsd:       number | null
  marketRegime:      string
  riskScore:         number
  opportunityScore:  number
  convictionScore:   number
  euphoriaScore:     number
  capitulationScore: number
  riskLevel:         string
  actionBias:        string
  score:             { raw: number; weighted: number }
  summary:           string
  reading:           string
  insights:          string[]
  indicatorGroups:   IndicatorGroup[]
  dimensionScores:   { sentiment: number; derivatives: number; onchain: number; trend: number }
  explanation:       { smoothedScore: number; classification: string }
}

interface MarketKpis {
  marketCapUsd: number | null
  volume24hUsd: number | null
  athUsd:       number | null
  athDropPct:   number | null
  dominancePct: number | null
}

interface BtcTechnical {
  rsi14:        number | null
  macdHist:     number | null
  macdPositive: boolean | null
  macdGrowing:  boolean | null
  ma200:        number | null
  ma50:         number | null
  ma200DistPct: number | null
  crossType:    'golden' | 'death' | null
}

const RISK_TO_STRATEGY: Record<RiskProfile, DcaStrategyProfile> = {
  CONSERVATIVE: 'CONSERVATIVE', MODERATE: 'BALANCED', AGGRESSIVE: 'AGGRESSIVE',
}
const STORAGE_KEY = 'btcm_dca_tac_cfg_v1'

function currentYearMonth() {
  const n = new Date()
  return { year: n.getFullYear(), month: n.getMonth() + 1 }
}

// ── Convert IndicatorScore to TacticalCardData ────────────────────────────────
function indicatorToCard(ind: IndicatorScore): TacticalCardData {
  const { rawValue, specificLabel } = parseSummary(ind.summary)
  const level = dl(Math.round(ind.score / 5))
  return {
    name:        ind.name,
    statusLabel: specificLabel ?? impactLabelOf(level),
    description: INDICATOR_WHAT[ind.name] ?? '',
    value:       rawValue,
    score:       ind.score,
    dotLevel:    level,
  }
}

// ── Build derived extra cards per group ───────────────────────────────────────
function buildTrendExtraCards(tech: BtcTechnical | null): TacticalCardData[] {
  if (!tech) return []
  const cards: TacticalCardData[] = []

  if (tech.rsi14 !== null) {
    const s = scoreRsi(tech.rsi14)
    cards.push({ name: 'RSI 14 Dias', statusLabel: rsiLabel(tech.rsi14), description: 'Abaixo de 30: sobrevendido — queda exagerada, historicamente favorável para acumulação em 12 meses. Acima de 70: sobrecomprado — preço esticado, pior momento para comprar.', value: String(tech.rsi14), score: s, dotLevel: dl(s) })
  }

  if (tech.macdPositive !== null && tech.macdGrowing !== null) {
    const s = scoreMacd(tech.macdPositive, tech.macdGrowing)
    cards.push({ name: 'MACD — Momentum', statusLabel: macdLabel(tech.macdPositive, tech.macdGrowing), description: 'Para quem acumula 1+ ano: correção forte = fundo em formação = melhor entrada. Alta acelerando = possível topo = pior entrada.', value: tech.macdHist !== null ? String(Math.round(tech.macdHist)) : '—', score: s, dotLevel: dl(s) })
  }

  if (tech.ma200DistPct !== null) {
    const s    = scoreMa200Dist(tech.ma200DistPct)
    const sign = tech.ma200DistPct > 0 ? '+' : ''
    cards.push({ name: 'Preço vs MM200', statusLabel: tech.ma200DistPct < 0 ? `${tech.ma200DistPct.toFixed(1)}% abaixo da MM200` : `+${tech.ma200DistPct.toFixed(1)}% acima da MM200`, description: `MM200 = $${tech.ma200?.toLocaleString('en-US') ?? '—'}. Abaixo = zona de desconto histórico. Mais de 80% acima = mercado esticado.`, value: `${sign}${tech.ma200DistPct.toFixed(1)}%`, score: s, dotLevel: dl(s) })
  }

  if (tech.crossType !== null) {
    const isGolden = tech.crossType === 'golden'
    const s        = isGolden ? -1 : 1
    cards.push({ name: 'Cruz MM50 / MM200', statusLabel: isGolden ? 'Cruz Dourada — Preço Já Recuperado' : 'Cruz da Morte — Zona de Fundo Histórico', description: `MM50 = $${tech.ma50?.toLocaleString('en-US') ?? '—'} | MM200 = $${tech.ma200?.toLocaleString('en-US') ?? '—'}. Para 1+ ano: Cruz da Morte = zona de fundo histórico = comprar. Cruz Dourada = preço já subiu = entrada menos vantajosa.`, value: isGolden ? 'Dourada' : 'Morte', score: s, dotLevel: dl(s) })
  }

  return cards
}

function buildOnchainExtraCards(kpis: MarketKpis | null, btcPriceUsd: number | null): TacticalCardData[] {
  if (!kpis?.athUsd || !btcPriceUsd) return []
  const dropPct = ((kpis.athUsd - btcPriceUsd) / kpis.athUsd) * 100
  const s       = scoreAthDrop(dropPct)
  return [{ name: 'Distância do ATH', statusLabel: `−${dropPct.toFixed(0)}% do topo histórico`, description: `ATH = $${Math.round(kpis.athUsd).toLocaleString('en-US')}. Quedas acima de 50% do ATH são janelas raras com alto retorno histórico em 1 ano.`, value: `−${dropPct.toFixed(0)}%`, score: s, dotLevel: dl(s) }]
}

function extraCardsForGroup(key: string, tech: BtcTechnical | null, kpis: MarketKpis | null, btcPriceUsd: number | null): TacticalCardData[] {
  if (key === 'trend')   return buildTrendExtraCards(tech)
  if (key === 'onchain') return buildOnchainExtraCards(kpis, btcPriceUsd)
  return []
}

// ── Component ─────────────────────────────────────────────────────────────────
interface Props { plan: DcaPlanRow | null }

export default function DcaTacticalPage({ plan }: Props) {
  const [config,        setConfig]        = useState<DcaTacticalConfig>(DEFAULT_TACTICAL_CONFIG)
  const [market,        setMarket]        = useState<MarketSnapshot | null>(null)
  const [kpis,          setKpis]          = useState<MarketKpis | null>(null)
  const [technical,     setTechnical]     = useState<BtcTechnical | null>(null)
  const [contributions, setContributions] = useState<DcaContributionRow[]>([])
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState<string | null>(null)

  // ── Load DCA config from localStorage ───────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setConfig(prev => ({ ...prev, ...JSON.parse(raw) }))
      else if (plan) setConfig(prev => ({ ...prev, strategyProfile: RISK_TO_STRATEGY[plan.risk_profile] }))
    } catch {}
  }, [plan])

  // ── Fetch market snapshot (primary) ─────────────────────────────────────────
  useEffect(() => {
    fetch('/api/market-snapshot/current')
      .then(r => { if (!r.ok) throw new Error('Falha ao buscar dados'); return r.json() as Promise<MarketSnapshot> })
      .then(data => { setMarket(data); setLoading(false) })
      .catch(err => { setError(err instanceof Error ? err.message : 'Erro'); setLoading(false) })
  }, [])

  // ── Fetch KPIs + Technical (non-blocking, secondary) ────────────────────────
  useEffect(() => {
    fetch('/api/btc-market-kpis').then(r => r.ok ? r.json() : null).then(d => { if (d) setKpis(d) }).catch(() => {})
    fetch('/api/btc-technical').then(r => r.ok ? r.json() : null).then(d => { if (d) setTechnical(d) }).catch(() => {})
  }, [])

  // ── Fetch contributions ──────────────────────────────────────────────────────
  const fetchContributions = useCallback(() => {
    fetch('/api/dca/contributions?limit=100')
      .then(r => r.json())
      .then(({ contributions: all }: { contributions: DcaContributionRow[] }) => {
        const { year, month } = currentYearMonth()
        setContributions((all ?? []).filter(c => {
          const d = new Date(c.contribution_date + 'T00:00:00')
          return d.getFullYear() === year && d.getMonth() + 1 === month
        }))
      }).catch(() => {})
  }, [])
  useEffect(() => { fetchContributions() }, [fetchContributions])

  // ── Derived values (unchanged from original) ──────────────────────────────────
  const monthlyAmount  = plan?.monthly_amount_brl ?? config.monthlyAmountOverride ?? 0
  const usedThisMonth  = contributions.filter(c => c.contribution_type !== 'STRUCTURAL_DCA').reduce((s, c) => s + c.amount, 0)
  const opportunityScore = market ? calculateDcaOpportunityScore({
    opportunityScore:  market.opportunityScore,
    riskScore:         market.riskScore,
    convictionScore:   market.convictionScore,
    euphoriaScore:     market.euphoriaScore  ?? 30,
    capitulationScore: market.capitulationScore ?? 25,
  }) : 0
  const marketState       = classifyDcaMarketState(opportunityScore)
  const configWithDerived = { ...config, usedThisMonth }
  const allocation: DcaAllocation | null = monthlyAmount > 0
    ? calculateDcaAllocation(monthlyAmount, configWithDerived, opportunityScore, marketState)
    : null
  const tacticalPool = monthlyAmount - (allocation?.structuralDcaAmount ?? 0)

  // ── All derived extra scores for consensus ────────────────────────────────────
  const allExtraCards = [
    ...buildTrendExtraCards(technical),
    ...buildOnchainExtraCards(kpis, market?.btcPriceUsd ?? null),
  ]
  const extraScores = allExtraCards.map(c => c.score)

  // ── Loading / error states ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: '48px 0', textAlign: 'center' }}>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>Carregando dados de mercado…</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
          {[0, 1, 2].map(i => <div key={i} className="skeleton" style={{ width: '8px', height: '8px', borderRadius: '50%', animationDelay: `${i * 0.2}s` }} />)}
        </div>
      </div>
    )
  }
  if (error || !market) {
    return (
      <div style={{ padding: '20px 24px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '10px' }}>
        <div style={{ fontSize: '12px', color: '#f87171' }}>Erro ao carregar dados: {error ?? 'Dados indisponíveis'}</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', marginBottom: '24px' }}>

      {/* ── 1. Hero ── */}
      <TacticalHero
        score={opportunityScore}
        regime={market.marketRegime}
        reading={market.reading}
        btcPriceUsd={market.btcPriceUsd}
        generatedAt={market.generatedAt}
      />

      {/* ── 2. Opportunity bar ── */}
      <OpportunityBar score={opportunityScore} />

      {/* ── 3. KPI row ── */}
      <MarketKPIRow
        marketCapUsd={kpis?.marketCapUsd ?? null}
        volume24hUsd={kpis?.volume24hUsd ?? null}
        athUsd={kpis?.athUsd ?? null}
        dominancePct={kpis?.dominancePct ?? null}
        btcPriceUsd={market.btcPriceUsd}
      />

      {/* ── 4. Indicator sections ── */}
      {market.indicatorGroups.map(group => {
        const extra = extraCardsForGroup(group.key, technical, kpis, market.btcPriceUsd)
        const allCards = [
          ...group.indicators.map(indicatorToCard),
          ...extra,
        ]
        let cardIdx = 0
        return (
          <div key={group.key}>
            <TacticalSectionHeader label={group.label} score={group.score + extra.reduce((s, c) => s + c.score, 0)} />
            {allCards.map(card => (
              <TacticalCard key={card.name} data={card} delay={cardIdx++ * 0.04} />
            ))}
          </div>
        )
      })}

      {/* ── 5. Consensus ── */}
      <TacticalConsensus groups={market.indicatorGroups} extraScores={extraScores} />

      {/* ── 6. Institutional insights ── */}
      <TacticalInsights insights={market.insights ?? []} />

      {/* ── 7. DCA allocation (secondary, collapsible) ── */}
      {monthlyAmount > 0 && (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          <details>
            <summary style={{
              padding:       '16px 32px',
              cursor:        'pointer',
              fontSize:      '11px',
              fontWeight:    700,
              color:         'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '1.2px',
              listStyle:     'none',
              display:       'flex',
              alignItems:    'center',
              gap:           '8px',
            }}>
              <div style={{ width: '3px', height: '14px', background: 'var(--orange)', borderRadius: '2px' }} />
              Alocação DCA Tática
            </summary>
            <div style={{ padding: '0 0 24px' }}>
              <DcaStatusDoMesCard
                tacticalPool={tacticalPool}
                contributions={contributions}
                usedThisMonth={usedThisMonth}
              />
              <TacticalOpportunitiesHistory contributions={contributions} />
            </div>
          </details>
        </div>
      )}

    </div>
  )
}
```

**Note:** `TacticalOpportunitiesHistory` is a local function at the bottom of the file — keep it exactly as it is in the current file (copy from current version at lines 55-153).

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1
# Expected: no output
```

- [ ] **Step 4: Start dev server and visually verify the page**

```bash
npx next dev --port 3099 &
sleep 8
echo "Visit http://localhost:3099 — navigate to the DCA tab → Análise Tática"
echo "Verify: Hero with large score, bar, KPI row, indicator sections by group, consensus, insights"
echo "Verify on mobile: resize to 375px wide"
```

- [ ] **Step 5: Commit**

```bash
git add src/components/dca-tactical/DcaTacticalPage.tsx
git commit -m "feat(ui): redesign Análise Tática page — hero, bar, KPIs, grouped indicators, RSI/MACD/MM200/cross/ATH, consensus, insights"
```

---

## Task 8 — Update `DcaIndicatorBreakdown` (cleanup)

The `DcaIndicatorBreakdown` component is now redundant — `DcaTacticalPage` renders indicators directly. Remove its import from `DcaTacticalPage` if it's still there, and optionally keep the file for potential reuse elsewhere but remove it from the tactical page.

**Files:**
- Modify: `src/components/dca-tactical/DcaTacticalPage.tsx` (verify import removed)

- [ ] **Step 1: Verify DcaIndicatorBreakdown is not imported in the new DcaTacticalPage**

```bash
grep "DcaIndicatorBreakdown" src/components/dca-tactical/DcaTacticalPage.tsx
# Expected: no output (not imported)
```

- [ ] **Step 2: Run TypeScript check**

```bash
npx tsc --noEmit 2>&1
# Expected: no output
```

- [ ] **Step 3: Deploy to production**

```bash
vercel --prod
```

- [ ] **Step 4: Verify production**

```bash
curl -s 'https://market-context-redesign.vercel.app/api/btc-market-kpis' | python3 -c "import json,sys; d=json.load(sys.stdin); print('ath:', d.get('athUsd'), 'dom:', d.get('dominancePct'))"
curl -s 'https://market-context-redesign.vercel.app/api/btc-technical' | python3 -c "import json,sys; d=json.load(sys.stdin); print('rsi:', d.get('rsi14'), 'cross:', d.get('crossType'), 'ma200dist:', d.get('ma200DistPct'))"
# Expected: valid numbers in both responses
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: verify cleanup — DcaIndicatorBreakdown removed from tactical page"
```

---

## Self-Review

### Spec Coverage

| Requirement | Task |
|-------------|------|
| Hero with score, classification, description, price, timestamp | Task 4 — TacticalHero |
| Opportunity bar (Péssimo → Oportunidade) | Task 5 — OpportunityBar |
| KPI row: MarketCap, Dominance, Volume, ATH, Price | Task 5 — MarketKPIRow |
| Indicators grouped (Tendência, Sentimento, etc.) | Task 7 — DcaTacticalPage |
| Each indicator: name, status, description visible (no tooltip) | Task 3 — TacticalCard |
| Indicators: RSI 14, MACD, MM200 distance, Cross | Tasks 2 + 7 |
| Indicators: ATH distance | Tasks 1 + 7 |
| Indicators: Pi Cycle | Existing — already in pipeline |
| MarketConsensus | Task 6 — TacticalConsensus |
| Institutional notes | Task 6 — TacticalInsights |
| DCA allocation kept (secondary) | Task 7 — collapsible section |
| NO changes to business logic | All tasks — only UI layer touched |
| Responsive | Tasks 5 (CSS), 3 (ind-card CSS classes already in globals.css) |
| Mobile: everything stacked | `ind-card` class handles this from previous PR |

### Placeholder scan
None — all steps have complete code.

### Type consistency
- `TacticalCardData` defined in `TacticalCard.tsx` and imported everywhere else
- `BtcTechnical` and `MarketKpis` defined as interfaces in `DcaTacticalPage.tsx`
- `IndicatorGroup` from `@lib/shared/types/signal` — already used in existing code
