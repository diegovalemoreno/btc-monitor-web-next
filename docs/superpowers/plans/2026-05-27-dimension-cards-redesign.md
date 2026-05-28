# Dimension Cards Visual Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform dimension cards from indicator list tables into visual tactical insight cards — with dimension-specific SVG visuals, consensus bars, evidence bullets, and collapsible advanced data.

**Architecture:** Three new components (`ConsensusBars`, `EvidencesList`, `DimensionVisual`) are created in `src/components/dashboard/dimension/`, each with exported pure functions that are unit-tested. `DimensionCard.tsx` is fully rewritten to use these components, dropping the `IndicatorsList` sub-component and the MiniGauge in favor of the new visual system. `DimensionGrid.tsx` stays unchanged.

**Tech Stack:** React 18, framer-motion (AnimatePresence), vitest, inline CSS-in-JS (no Tailwind), SVG for visuals.

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/components/dashboard/dimension/ConsensusBars.tsx` | Bullish/Neutral/Bearish % bars + `computeConsensus()` pure fn |
| Create | `src/components/dashboard/dimension/EvidencesList.tsx` | ✓/⚠ evidence bullets + `buildEvidences()` pure fn |
| Create | `src/components/dashboard/dimension/DimensionVisual.tsx` | 6 dimension-specific SVG visuals |
| Create | `src/components/dashboard/__tests__/dimension/ConsensusBars.test.ts` | Unit tests for `computeConsensus` |
| Create | `src/components/dashboard/__tests__/dimension/EvidencesList.test.ts` | Unit tests for `buildEvidences` |
| Modify | `src/components/dashboard/DimensionCard.tsx` | Full rewrite — visual card structure using new components |

---

## Task 1: ConsensusBars + EvidencesList Components

**Files:**
- Create: `src/components/dashboard/dimension/ConsensusBars.tsx`
- Create: `src/components/dashboard/dimension/EvidencesList.tsx`
- Create: `src/components/dashboard/__tests__/dimension/ConsensusBars.test.ts`
- Create: `src/components/dashboard/__tests__/dimension/EvidencesList.test.ts`

- [ ] **Step 1: Write failing tests for `computeConsensus`**

Create `src/components/dashboard/__tests__/dimension/ConsensusBars.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { computeConsensus } from '@/components/dashboard/dimension/ConsensusBars'
import type { IndicatorScore } from '@lib/shared/types/signal'

describe('computeConsensus', () => {
  it('returns zeros for empty array', () => {
    expect(computeConsensus([])).toEqual({ bullish: 0, neutral: 0, bearish: 0 })
  })

  it('counts positive scores as bullish, negative as bearish', () => {
    const indicators: IndicatorScore[] = [
      { name: 'A', score:  2, summary: '' },
      { name: 'B', score:  1, summary: '' },
      { name: 'C', score: -1, summary: '' },
      { name: 'D', score:  0, summary: '' },
    ]
    const r = computeConsensus(indicators)
    expect(r.bullish).toBe(50)
    expect(r.bearish).toBe(25)
    expect(r.neutral).toBe(25)
  })

  it('bullish + neutral + bearish always sums to 100', () => {
    const indicators: IndicatorScore[] = [
      { name: 'A', score:  2, summary: '' },
      { name: 'B', score:  1, summary: '' },
      { name: 'C', score: -1, summary: '' },
    ]
    const { bullish, neutral, bearish } = computeConsensus(indicators)
    expect(bullish + neutral + bearish).toBe(100)
  })

  it('all bullish → 100% bullish, 0% others', () => {
    const indicators: IndicatorScore[] = [
      { name: 'A', score: 2, summary: '' },
      { name: 'B', score: 1, summary: '' },
    ]
    const r = computeConsensus(indicators)
    expect(r.bullish).toBe(100)
    expect(r.neutral).toBe(0)
    expect(r.bearish).toBe(0)
  })

  it('all neutral → 0% bullish and bearish', () => {
    const indicators: IndicatorScore[] = [
      { name: 'A', score: 0, summary: '' },
      { name: 'B', score: 0, summary: '' },
    ]
    const r = computeConsensus(indicators)
    expect(r.bullish).toBe(0)
    expect(r.bearish).toBe(0)
    expect(r.neutral).toBe(100)
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx vitest run src/components/dashboard/__tests__/dimension/ConsensusBars.test.ts
```

Expected: FAIL — `Cannot find module '@/components/dashboard/dimension/ConsensusBars'`

- [ ] **Step 3: Write failing tests for `buildEvidences`**

Create `src/components/dashboard/__tests__/dimension/EvidencesList.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildEvidences } from '@/components/dashboard/dimension/EvidencesList'
import type { IndicatorScore } from '@lib/shared/types/signal'

describe('buildEvidences', () => {
  it('returns empty array for no indicators', () => {
    expect(buildEvidences([])).toEqual([])
  })

  it('assigns ✓ to positive scores', () => {
    const indicators: IndicatorScore[] = [{ name: 'A', score: 2, summary: 'good' }]
    const result = buildEvidences(indicators)
    expect(result[0].symbol).toBe('✓')
    expect(result[0].name).toBe('A')
    expect(result[0].summary).toBe('good')
  })

  it('assigns ⚠ to negative scores', () => {
    const indicators: IndicatorScore[] = [{ name: 'A', score: -1, summary: 'bad' }]
    const result = buildEvidences(indicators)
    expect(result[0].symbol).toBe('⚠')
  })

  it('does not include neutral scores', () => {
    const indicators: IndicatorScore[] = [{ name: 'A', score: 0, summary: 'meh' }]
    const result = buildEvidences(indicators)
    expect(result).toHaveLength(0)
  })

  it('sorts positive by score descending', () => {
    const indicators: IndicatorScore[] = [
      { name: 'Low',  score: 1, summary: '' },
      { name: 'High', score: 2, summary: '' },
    ]
    const result = buildEvidences(indicators)
    expect(result[0].name).toBe('High')
    expect(result[1].name).toBe('Low')
  })

  it('sorts negative by score ascending (most negative first)', () => {
    const indicators: IndicatorScore[] = [
      { name: 'Mild',   score: -1, summary: '' },
      { name: 'Strong', score: -2, summary: '' },
    ]
    const result = buildEvidences(indicators)
    expect(result[0].name).toBe('Strong')
  })

  it('respects maxPositive limit', () => {
    const indicators: IndicatorScore[] = [
      { name: 'A', score: 2, summary: '' },
      { name: 'B', score: 1, summary: '' },
      { name: 'C', score: 1, summary: '' },
      { name: 'D', score: 1, summary: '' },
    ]
    const result = buildEvidences(indicators, 2, 2)
    expect(result.filter(e => e.symbol === '✓')).toHaveLength(2)
  })

  it('respects maxNegative limit', () => {
    const indicators: IndicatorScore[] = [
      { name: 'A', score: -1, summary: '' },
      { name: 'B', score: -2, summary: '' },
      { name: 'C', score: -1, summary: '' },
    ]
    const result = buildEvidences(indicators, 3, 1)
    expect(result.filter(e => e.symbol === '⚠')).toHaveLength(1)
  })

  it('outputs positive before negative', () => {
    const indicators: IndicatorScore[] = [
      { name: 'Neg', score: -1, summary: '' },
      { name: 'Pos', score:  2, summary: '' },
    ]
    const result = buildEvidences(indicators)
    expect(result[0].symbol).toBe('✓')
    expect(result[1].symbol).toBe('⚠')
  })
})
```

- [ ] **Step 4: Run test to confirm it fails**

```bash
npx vitest run src/components/dashboard/__tests__/dimension/EvidencesList.test.ts
```

Expected: FAIL — `Cannot find module '@/components/dashboard/dimension/EvidencesList'`

- [ ] **Step 5: Implement ConsensusBars**

Create `src/components/dashboard/dimension/ConsensusBars.tsx`:

```tsx
'use client'
import type { IndicatorScore } from '@lib/shared/types/signal'

interface ConsensusBarsProps {
  indicators: IndicatorScore[]
}

export interface ConsensusData {
  bullish: number
  neutral: number
  bearish: number
}

export function computeConsensus(indicators: IndicatorScore[]): ConsensusData {
  if (indicators.length === 0) return { bullish: 0, neutral: 0, bearish: 0 }
  const total   = indicators.length
  const bullish = Math.round((indicators.filter(i => i.score > 0).length / total) * 100)
  const bearish = Math.round((indicators.filter(i => i.score < 0).length / total) * 100)
  const neutral = 100 - bullish - bearish
  return { bullish, neutral, bearish }
}

const BARS = [
  { key: 'bullish' as const, label: 'Bullish', color: '#00C853' },
  { key: 'neutral' as const, label: 'Neutro',  color: 'var(--text-muted)' },
  { key: 'bearish' as const, label: 'Bearish', color: '#FF6D00' },
]

export default function ConsensusBars({ indicators }: ConsensusBarsProps) {
  const data = computeConsensus(indicators)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {BARS.map(({ key, label, color }) => (
        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '9px', color: 'var(--text-muted)', width: '44px', flexShrink: 0 }}>{label}</span>
          <div style={{ flex: 1, height: '6px', background: 'var(--surface3)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${data[key]}%`, background: color,
              borderRadius: '3px', transition: 'width 0.4s ease',
            }} />
          </div>
          <span style={{ fontSize: '9px', color, fontWeight: 700, width: '28px', textAlign: 'right', flexShrink: 0 }}>
            {data[key]}%
          </span>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 6: Implement EvidencesList**

Create `src/components/dashboard/dimension/EvidencesList.tsx`:

```tsx
'use client'
import type { IndicatorScore } from '@lib/shared/types/signal'

interface EvidencesListProps {
  indicators:  IndicatorScore[]
  maxPositive?: number
  maxNegative?: number
}

export type EvidenceSymbol = '✓' | '⚠'

export interface Evidence {
  symbol:  EvidenceSymbol
  name:    string
  summary: string
  score:   number
}

export function buildEvidences(
  indicators:  IndicatorScore[],
  maxPositive = 3,
  maxNegative = 2,
): Evidence[] {
  const positive = indicators
    .filter(i => i.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxPositive)
    .map(i => ({ symbol: '✓' as EvidenceSymbol, name: i.name, summary: i.summary, score: i.score }))

  const negative = indicators
    .filter(i => i.score < 0)
    .sort((a, b) => a.score - b.score)
    .slice(0, maxNegative)
    .map(i => ({ symbol: '⚠' as EvidenceSymbol, name: i.name, summary: i.summary, score: i.score }))

  return [...positive, ...negative]
}

export default function EvidencesList({ indicators, maxPositive = 3, maxNegative = 2 }: EvidencesListProps) {
  const evidences = buildEvidences(indicators, maxPositive, maxNegative)
  if (evidences.length === 0) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {evidences.map((ev, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
          <span style={{
            fontSize: '10px', flexShrink: 0, marginTop: '1px',
            color: ev.symbol === '✓' ? '#00C853' : '#FF6D00',
          }}>
            {ev.symbol}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
            <span style={{ color: 'var(--text)', fontWeight: 500 }}>{ev.name}</span>
            {ev.summary ? ` — ${ev.summary}` : ''}
          </span>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 7: Run all tests and verify they pass**

```bash
npx vitest run src/components/dashboard/__tests__/dimension/
```

Expected: 13 tests passing (5 in ConsensusBars + 8 in EvidencesList)

- [ ] **Step 8: Commit**

```bash
git add src/components/dashboard/dimension/ConsensusBars.tsx \
        src/components/dashboard/dimension/EvidencesList.tsx \
        src/components/dashboard/__tests__/dimension/ConsensusBars.test.ts \
        src/components/dashboard/__tests__/dimension/EvidencesList.test.ts
git commit -m "feat(dimension): add ConsensusBars and EvidencesList components with tests"
```

---

## Task 2: DimensionVisual — Dimension-Specific SVG Visuals

**Files:**
- Create: `src/components/dashboard/dimension/DimensionVisual.tsx`

No unit tests — these are purely visual SVG components verified on the dev server in Task 3.

- [ ] **Step 1: Create DimensionVisual**

Create `src/components/dashboard/dimension/DimensionVisual.tsx`:

```tsx
'use client'
import type { IndicatorGroupKey, IndicatorScore } from '@lib/shared/types/signal'

interface DimensionVisualProps {
  groupKey:   IndicatorGroupKey
  score:      number           // raw group score (sum of indicator scores)
  indicators: IndicatorScore[]
}

// group.score = sum of indicator scores. Existing normalization: (score + 10) / 20 * 100
function normalizeToPct(score: number): number {
  return Math.min(100, Math.max(0, (score + 10) / 20 * 100))
}

// ── Trend: horizontal strength meter with zone bands ──────────

function TrendMeter({ score }: { score: number }) {
  const pct    = normalizeToPct(score)
  const markerX = pct * 1.8 + 10  // maps 0–100 to 10–190 in viewBox 200

  const zoneColor = score > 4 ? '#00C853' : score > 0 ? '#4CAF50' : score === 0 ? '#607D8B' : score > -4 ? '#FF9800' : '#FF3D00'

  const zones = [
    { label: 'Bear Forte', color: '#FF3D00', x: 10  },
    { label: 'Fraco',      color: '#FF9800', x: 46  },
    { label: 'Neutro',     color: '#607D8B', x: 82  },
    { label: 'Forte',      color: '#4CAF50', x: 118 },
    { label: 'Bull',       color: '#00C853', x: 154 },
  ]

  return (
    <svg width="100%" height="48" viewBox="0 0 200 48" preserveAspectRatio="none">
      {zones.map((z, i) => (
        <rect key={i} x={10 + i * 36} y={16} width={36} height={12} fill={z.color} opacity={0.2} />
      ))}
      {zones.map((z, i) => (
        <text key={i} x={z.x + 18} y={40} textAnchor="middle" fontSize="6.5" fill={z.color} opacity={0.75}>
          {z.label}
        </text>
      ))}
      <rect x={10} y={16} width={180} height={12} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={0.5} rx={2} />
      {/* Score label */}
      <text x={markerX} y={12} textAnchor="middle" fontSize="9" fill={zoneColor} fontWeight="800">
        {score > 0 ? `+${score.toFixed(1)}` : score.toFixed(1)}
      </text>
      {/* Marker diamond */}
      <polygon
        points={`${markerX},16 ${markerX + 4},22 ${markerX},28 ${markerX - 4},22`}
        fill={zoneColor}
      />
    </svg>
  )
}

// ── Sentiment: fear/greed spectrum with needle ────────────────

function SentimentSpectrum({ score }: { score: number }) {
  const pct     = normalizeToPct(score)
  const needleX = 10 + (pct / 100) * 180
  const color   = score > 2 ? '#00C853' : score < -2 ? '#1565C0' : '#607D8B'

  return (
    <svg width="100%" height="48" viewBox="0 0 200 48" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sent-grad" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%"   stopColor="#1565C0" stopOpacity={0.5} />
          <stop offset="40%"  stopColor="#455A64" stopOpacity={0.3} />
          <stop offset="60%"  stopColor="#455A64" stopOpacity={0.3} />
          <stop offset="100%" stopColor="#E53935" stopOpacity={0.5} />
        </linearGradient>
      </defs>
      <rect x={10} y={20} width={180} height={10} fill="url(#sent-grad)" rx={5} />
      <rect x={10} y={20} width={180} height={10} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={0.5} rx={5} />

      <text x={10}  y={40} textAnchor="start"  fontSize="7" fill="#1565C0" opacity={0.8}>Medo extremo</text>
      <text x={100} y={40} textAnchor="middle" fontSize="7" fill="var(--text-muted)">Neutro</text>
      <text x={190} y={40} textAnchor="end"    fontSize="7" fill="#E53935" opacity={0.8}>Euforia</text>

      <line x1={needleX} y1={16} x2={needleX} y2={34} stroke="rgba(255,255,255,0.5)" strokeWidth={1.5} strokeLinecap="round" />
      <circle cx={needleX} cy={25} r={4.5} fill={color} />
      <text x={needleX} y={12} textAnchor="middle" fontSize="9" fill={color} fontWeight="800">
        {score > 0 ? `+${score.toFixed(1)}` : score.toFixed(1)}
      </text>
    </svg>
  )
}

// ── Derivatives: per-indicator pressure bars ──────────────────

function LeveragePressure({ indicators }: { indicators: IndicatorScore[] }) {
  const items = [
    { label: 'Funding',     name: 'Taxa de Funding' },
    { label: 'Open Int.',   name: 'Open Interest'   },
    { label: 'Liquidações', name: 'Liq. de Longs'   },
  ].map(({ label, name }) => {
    const ind = indicators.find(i => i.name === name)
    return { label, score: ind?.score ?? 0, summary: ind?.summary ?? '—' }
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '4px 0' }}>
      {items.map(item => {
        const pct   = Math.min(100, Math.max(0, (item.score + 2) / 4 * 100))
        const color = item.score > 0 ? '#00C853' : item.score < 0 ? '#FF6D00' : '#607D8B'
        return (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '9px', color: 'var(--text-muted)', width: '64px', flexShrink: 0, lineHeight: 1.2 }}>
              {item.label}
            </span>
            <div style={{ flex: 1, height: '7px', background: 'var(--surface3)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '4px', transition: 'width 0.4s ease' }} />
            </div>
            <span style={{ fontSize: '9px', color, fontWeight: 700, width: '20px', textAlign: 'right', flexShrink: 0 }}>
              {item.score > 0 ? `+${item.score}` : item.score}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Onchain: cycle position arc (semi-circle) ─────────────────

function CycleArc({ score }: { score: number }) {
  const pct   = normalizeToPct(score)
  const cx    = 100
  const cy    = 52
  const r     = 40
  // Arc from left (180°) sweeping clockwise toward right (0°)
  const angle = Math.PI - (pct / 100) * Math.PI
  const dotX  = cx + r * Math.cos(angle)
  const dotY  = cy - r * Math.sin(angle)
  const color = score > 4 ? '#00C853' : score > 0 ? '#4CAF50' : score < -4 ? '#FF3D00' : score < 0 ? '#FF9800' : '#607D8B'

  // Large-arc flag: 1 when more than half the arc is drawn (pct > 50)
  const largeArc = pct > 50 ? 1 : 0

  const labels = [
    { x: 14,  y: 52, text: 'Capitulação', color: '#FF3D00' },
    { x: 42,  y: 16, text: 'Acumulação',  color: '#FF9800' },
    { x: 100, y: 4,  text: 'Crescimento', color: '#607D8B' },
    { x: 158, y: 16, text: 'Euforia',     color: '#F57F17' },
    { x: 186, y: 52, text: 'Topo',        color: '#E53935' },
  ]

  return (
    <svg width="100%" height="60" viewBox="0 0 200 60" preserveAspectRatio="xMidYMid meet">
      {/* Background arc */}
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke="var(--surface3)" strokeWidth={7} strokeLinecap="round" />
      {/* Progress arc (only when pct > 0 and not at start) */}
      {pct > 1 && pct < 99 && (
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 ${largeArc} 1 ${dotX} ${dotY}`}
          fill="none" stroke={color} strokeWidth={7} strokeLinecap="round" />
      )}
      {pct >= 99 && (
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy}`}
          fill="none" stroke={color} strokeWidth={7} strokeLinecap="round" />
      )}
      {/* Position dot */}
      <circle cx={dotX} cy={dotY} r={6} fill={color} />
      <circle cx={dotX} cy={dotY} r={3} fill="var(--surface)" />
      {/* Labels */}
      {labels.map(l => (
        <text key={l.text} x={l.x} y={l.y} textAnchor="middle" fontSize="6" fill={l.color} opacity={0.7}>
          {l.text}
        </text>
      ))}
    </svg>
  )
}

// ── Macro: directional compass/flow indicator ─────────────────

function MacroCompass({ score }: { score: number }) {
  const pct     = normalizeToPct(score)
  const needleX = 10 + (pct / 100) * 180
  const color   = score > 0 ? '#00C853' : score < 0 ? '#FF6D00' : '#607D8B'

  return (
    <svg width="100%" height="48" viewBox="0 0 200 48" preserveAspectRatio="none">
      <defs>
        <linearGradient id="macro-grad" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%"   stopColor="#FF3D00" stopOpacity={0.4} />
          <stop offset="50%"  stopColor="#455A64" stopOpacity={0.2} />
          <stop offset="100%" stopColor="#00C853" stopOpacity={0.4} />
        </linearGradient>
      </defs>
      <rect x={10} y={20} width={180} height={10} fill="url(#macro-grad)" rx={5} />
      <rect x={10} y={20} width={180} height={10} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={0.5} rx={5} />

      <text x={10}  y={40} textAnchor="start"  fontSize="7" fill="#FF3D00" opacity={0.8}>Pressão USD</text>
      <text x={100} y={40} textAnchor="middle" fontSize="7" fill="var(--text-muted)">Neutro</text>
      <text x={190} y={40} textAnchor="end"    fontSize="7" fill="#00C853" opacity={0.8}>Favorável</text>

      <line x1={needleX} y1={16} x2={needleX} y2={34} stroke="rgba(255,255,255,0.5)" strokeWidth={1.5} strokeLinecap="round" />
      <circle cx={needleX} cy={25} r={4.5} fill={color} />
      <text x={needleX} y={12} textAnchor="middle" fontSize="9" fill={color} fontWeight="800">
        {score > 0 ? `+${score.toFixed(1)}` : score.toFixed(1)}
      </text>
    </svg>
  )
}

// ── Synthesis: confluence dot grid ───────────────────────────

function SynthesisDots({ indicators }: { indicators: IndicatorScore[] }) {
  const bullish = indicators.filter(i => i.score > 0).length
  const neutral  = indicators.filter(i => i.score === 0).length
  const bearish  = indicators.filter(i => i.score < 0).length

  const cols = 5
  const dotR = 5
  const gap  = 16

  return (
    <div>
      <svg width={cols * gap + 4} height={Math.ceil(indicators.length / cols) * gap + 8}
        viewBox={`0 0 ${cols * gap + 4} ${Math.ceil(indicators.length / cols) * gap + 8}`}>
        {indicators.map((ind, i) => {
          const col   = i % cols
          const row   = Math.floor(i / cols)
          const color = ind.score > 0 ? '#00C853' : ind.score < 0 ? '#FF6D00' : '#455A64'
          return (
            <circle key={i} cx={col * gap + dotR + 4} cy={row * gap + dotR + 4} r={dotR} fill={color} opacity={0.85} />
          )
        })}
      </svg>
      <div style={{ display: 'flex', gap: '10px', fontSize: '9px', marginTop: '4px' }}>
        <span style={{ color: '#00C853' }}>● {bullish} bullish</span>
        <span style={{ color: '#455A64' }}>● {neutral} neutro</span>
        <span style={{ color: '#FF6D00' }}>● {bearish} bearish</span>
      </div>
    </div>
  )
}

// ── Router ────────────────────────────────────────────────────

export default function DimensionVisual({ groupKey, score, indicators }: DimensionVisualProps) {
  switch (groupKey) {
    case 'trend':       return <TrendMeter score={score} />
    case 'sentiment':   return <SentimentSpectrum score={score} />
    case 'derivatives': return <LeveragePressure indicators={indicators} />
    case 'onchain':     return <CycleArc score={score} />
    case 'macro':       return <MacroCompass score={score} />
    case 'synthesis':   return <SynthesisDots indicators={indicators} />
    default:            return null
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors in `DimensionVisual.tsx`

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/dimension/DimensionVisual.tsx
git commit -m "feat(dimension): add DimensionVisual component with 6 dimension-specific SVG visuals"
```

---

## Task 3: DimensionCard Full Rewrite

**Files:**
- Modify: `src/components/dashboard/DimensionCard.tsx` (complete rewrite)

The new card structure replaces `IndicatorsList` + `MiniGauge` with:
1. Header (icon + label + tooltip)
2. Estado principal (insight text in dimension color)
3. Visualização central (DimensionVisual)
4. Consenso (ConsensusBars)
5. Evidências (EvidencesList)
6. Dados técnicos — collapsible raw indicator table

All three variants (spotlight, medium, compact) keep the same sections; spotlight has more evidence items and a larger insight font. Compact collapses everything except header row.

- [ ] **Step 1: Rewrite DimensionCard.tsx**

Replace the entire contents of `src/components/dashboard/DimensionCard.tsx` with:

```tsx
// src/components/dashboard/DimensionCard.tsx
'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { IndicatorGroup } from '@lib/shared/types/signal'
import Tooltip from '@/components/shared/Tooltip'
import ConsensusBars from './dimension/ConsensusBars'
import EvidencesList from './dimension/EvidencesList'
import DimensionVisual from './dimension/DimensionVisual'

// ── Color / icon / tooltip maps ───────────────────────────────

const GROUP_COLOR: Record<string, string> = {
  sentiment:   '#e08a3a',
  derivatives: '#FF6D00',
  onchain:     '#00C853',
  trend:       '#00BCD4',
  macro:       '#8B8FA8',
  synthesis:   '#FFD600',
}

const GROUP_ICON: Record<string, string> = {
  sentiment:   '🧠',
  derivatives: '📊',
  onchain:     '⛓',
  trend:       '📈',
  macro:       '🌐',
  synthesis:   '✨',
}

const GROUP_TOOLTIP: Record<string, string> = {
  sentiment:   'Agrega Fear & Greed, Long/Short Ratio e BTC Dominância.\n\nFavorável = medo elevado + shorts dominantes + Bitcoin liderando o mercado.\nAlerta = euforia + longs dominantes + altcoins em destaque.\n\nSentimento é contrário por natureza — extremos costumam ser sinais de reversão.',
  derivatives: 'Agrega Funding Rate, Open Interest, Liquidações e Stablecoin Ratio.\n\nFavorável = funding negativo + OI em queda + longs liquidados + stablecoins aguardando entrada.\nAlerta = funding muito alto + OI crescendo + mercado sobreaquecido.\n\nDerivativos refletem alavancagem acumulada — principal fator de risco de curto prazo.',
  onchain:     'Agrega MVRV, Preço Realizado, Hash Ribbon, Pressão de Venda e ETF Institucional.\n\nFavorável = MVRV baixo + preço próximo do realizado + mineradores se recuperando + instituições comprando.\nAlerta = MVRV em zona de euforia + whales distribuindo.\n\nOn-chain revela o comportamento real dos holders de longo prazo — o dado mais difícil de falsificar.',
  trend:       'Agrega Médias Móveis, Variação 7d, Bollinger %B, Mayer Multiple e Pi Cycle Top.\n\nFavorável = preço abaixo das médias históricas + Mayer < 0,8 + Bollinger em oversold.\nAlerta = preço muito acima das médias + Mayer > 2,4 + Pi Cycle próximo do cruzamento histórico.\n\nTendência mostra a saúde estrutural do movimento — contexto de onde o preço está no ciclo.',
  macro:       'Influências externas como dólar (DXY), taxa de juros e fluxos de capital global.\n\nDXY caindo = dólar enfraquecendo = ambiente favorável para Bitcoin.\nDXY subindo forte = pressão sobre ativos de risco.',
  synthesis:   'Confluência de múltiplos indicadores extremos ao mesmo tempo.\n\nQuando vários indicadores batem limites históricos juntos, o sinal de compra é muito mais confiável do que qualquer indicador isolado.',
}

// ── Insight labels ────────────────────────────────────────────

function getGroupInsight(key: string, score: number): string {
  type Tier = { pos: string; neu: string; neg: string }
  const map: Record<string, Tier> = {
    trend:       { pos: 'Alta confirmada nas médias',          neu: 'Tendência em consolidação',        neg: 'Estrutura de alta fragilizada'      },
    onchain:     { pos: 'Valuation ainda saudável',            neu: 'Valuation em zona neutra',         neg: 'Pressão de venda elevada'           },
    sentiment:   { pos: 'Medo moderado — contrário positivo',  neu: 'Sentimento equilibrado',           neg: 'Euforia — risco elevado'            },
    derivatives: { pos: 'Derivativos sem alavancagem',         neu: 'Funding neutro, OI estável',       neg: 'Alavancagem excessiva acumulada'    },
    macro:       { pos: 'Macro favorável ao BTC',              neu: 'Contexto macro neutro',            neg: 'Macro pressionando ativos de risco' },
    synthesis:   { pos: 'Confluência bullish forte',           neu: 'Confluência moderada',             neg: 'Sem confluência favorável'          },
  }
  const entry = map[key] ?? { pos: 'Sinal positivo', neu: 'Sinal neutro', neg: 'Sinal negativo' }
  return score > 2 ? entry.pos : score >= -2 ? entry.neu : entry.neg
}

// ── Raw indicator row (used inside collapsible) ───────────────

function IndicatorRow({ name, score, summary }: { name: string; score: number; summary: string }) {
  const color = score > 0 ? '#00C853' : score < 0 ? '#FF6D00' : 'var(--text-muted)'
  return (
    <div style={{
      padding:    '6px 18px',
      display:    'flex',
      alignItems: 'center',
      gap:        '10px',
      borderBottom: '1px solid var(--border-dim)',
    }}>
      <span style={{ flex: 1, fontSize: '11px', color: 'var(--text)', fontWeight: 500 }}>{name}</span>
      <span style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'right', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {summary}
      </span>
      <span style={{ fontSize: '11px', color, fontWeight: 700, minWidth: '28px', textAlign: 'right', flexShrink: 0 }}>
        {score > 0 ? `+${score}` : score}
      </span>
    </div>
  )
}

// ── Section label ─────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: '8px', fontWeight: 700, color: 'var(--text-muted)',
      textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '5px',
    }}>
      {children}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────

export type CardVariant = 'spotlight' | 'medium' | 'compact'

interface DimensionCardProps {
  group:    IndicatorGroup
  variant?: CardVariant
}

export default function DimensionCard({ group, variant = 'medium' }: DimensionCardProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [expanded,     setExpanded]     = useState(false)

  const color   = GROUP_COLOR[group.key]  ?? 'var(--text-sec)'
  const icon    = GROUP_ICON[group.key]   ?? '·'
  const tooltip = GROUP_TOOLTIP[group.key]
  const insight = getGroupInsight(group.key, group.score)

  const toggleAdvanced = () => setAdvancedOpen(v => !v)
  const toggleExpanded = () => setExpanded(v => !v)
  const onKeyAdvanced  = (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') toggleAdvanced() }
  const onKeyExpanded  = (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') toggleExpanded() }

  // ── COMPACT ────────────────────────────────────────────────
  if (variant === 'compact') {
    return (
      <div style={{
        background:   'var(--surface2)',
        border:       '1px solid var(--border-dim)',
        borderLeft:   `3px solid ${color}`,
        borderRadius: '10px',
        overflow:     'hidden',
      }}>
        <div
          role="button" tabIndex={0}
          onClick={toggleExpanded} onKeyDown={onKeyExpanded}
          style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '8px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '2px' }}>
              {icon} {group.label}
            </div>
            <div style={{ fontSize: '12px', fontWeight: 700, color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {insight}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <span style={{ fontSize: '15px', fontWeight: 900, color }}>
              {group.score > 0 ? `+${group.score.toFixed(1)}` : group.score.toFixed(1)}
            </span>
            <motion.span
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              style={{ display: 'inline-block', fontSize: '10px', color: 'var(--text-muted)', lineHeight: 1 }}
            >
              ▾
            </motion.span>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              key="compact-body"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ padding: '10px 14px 12px', borderTop: '1px solid var(--border-dim)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <DimensionVisual groupKey={group.key} score={group.score} indicators={group.indicators} />
                <div>
                  <SectionLabel>Consenso</SectionLabel>
                  <ConsensusBars indicators={group.indicators} />
                </div>
                <div>
                  <SectionLabel>Evidências</SectionLabel>
                  <EvidencesList indicators={group.indicators} maxPositive={2} maxNegative={1} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // ── SPOTLIGHT + MEDIUM (shared layout, different sizing) ───
  const isSpot    = variant === 'spotlight'
  const padH      = isSpot ? '20px 22px' : '16px 18px'
  const insightFs = isSpot ? '17px' : '14px'
  const labelFs   = isSpot ? '9px'  : '8px'
  const maxPos    = isSpot ? 3      : 2
  const maxNeg    = isSpot ? 2      : 1

  return (
    <div style={{
      background:   'var(--surface)',
      border:       '1px solid var(--border-dim)',
      borderTop:    `3px solid ${color}`,
      borderRadius: '12px',
      overflow:     'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: padH, paddingBottom: '0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
          <span style={{
            fontSize: labelFs, fontWeight: 700, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.12em',
          }}>
            {icon} {group.label}
          </span>
          {tooltip && <Tooltip text={tooltip} position="right" wide />}
        </div>

        {/* Estado principal */}
        <div style={{ fontSize: insightFs, fontWeight: 800, color, marginBottom: '14px', lineHeight: 1.25 }}>
          {insight}
        </div>

        {/* Visualização central */}
        <div style={{ marginBottom: '14px' }}>
          <DimensionVisual groupKey={group.key} score={group.score} indicators={group.indicators} />
        </div>

        {/* Consenso */}
        <div style={{ marginBottom: '12px' }}>
          <SectionLabel>Consenso</SectionLabel>
          <ConsensusBars indicators={group.indicators} />
        </div>

        {/* Evidências */}
        <div style={{ marginBottom: '14px' }}>
          <SectionLabel>Evidências</SectionLabel>
          <EvidencesList indicators={group.indicators} maxPositive={maxPos} maxNegative={maxNeg} />
        </div>
      </div>

      {/* Advanced toggle */}
      <div
        role="button" tabIndex={0}
        onClick={toggleAdvanced} onKeyDown={onKeyAdvanced}
        style={{
          borderTop: '1px solid var(--border-dim)',
          padding: '7px 22px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          cursor: 'pointer', userSelect: 'none',
        }}
      >
        <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Dados técnicos ({group.indicators.length} indicadores)
        </span>
        <motion.span
          animate={{ rotate: advancedOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          style={{ display: 'inline-block', color: 'var(--text-muted)', fontSize: '10px', lineHeight: 1 }}
        >
          ▾
        </motion.span>
      </div>

      <AnimatePresence initial={false}>
        {advancedOpen && (
          <motion.div
            key="advanced"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ paddingBottom: '4px' }}>
              {group.indicators.map(ind => (
                <IndicatorRow key={ind.name} name={ind.name} score={ind.score} summary={ind.summary} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
```

- [ ] **Step 2: Run all existing tests to ensure nothing broke**

```bash
npx vitest run
```

Expected: all 24+ tests pass (score-explanation, score-weights, ConsensusBars, EvidencesList)

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors

- [ ] **Step 4: Start dev server and verify dashboard visually**

```bash
npm run dev
```

Navigate to `http://localhost:3000/dashboard`.

Verify:
- Dimensões do Mercado section renders without crashes
- Spotlight card (Tendência) shows: insight text, trend meter bar, consensus bars, evidence bullets, "Dados técnicos" toggle at bottom
- Medium cards (On-chain, Sentimento) show same structure, slightly smaller
- Compact cards (Derivativos, Macro, Síntese) show header row; clicking expands to show visual + consensus + evidences
- Clicking "Dados técnicos" reveals raw indicator rows
- No indicator list visible by default (only inside "Dados técnicos")
- No MiniGauge visible anywhere

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/DimensionCard.tsx
git commit -m "feat(dashboard): rewrite DimensionCard — visual insight cards with SVG visuals, consensus bars, evidence bullets"
```

---

## Self-Review Checklist

**Spec coverage:**
- ✅ Remove indicator lists — replaced by EvidencesList (✓/⚠ bullets) + collapsible raw table
- ✅ Remove MiniGauge — removed; replaced by DimensionVisual
- ✅ Visual storytelling — each dimension has its own SVG visual (meter, spectrum, bars, arc, compass, dots)
- ✅ Consensus visual (Bullish/Neutro/Bearish %) — ConsensusBars
- ✅ Evidence bullets (✓/⚠) — EvidencesList
- ✅ Dados avançados hidden behind expand — "Dados técnicos" toggle
- ✅ Spotlight/medium/compact variants — all three updated
- ✅ Tests for pure logic — computeConsensus and buildEvidences fully unit-tested

**Placeholder scan:** No TBD, TODO, or "implement later" in any code block above.

**Type consistency:**
- `IndicatorGroup.key` typed as `IndicatorGroupKey` — passed to `DimensionVisual` as `groupKey`
- `buildEvidences` returns `Evidence[]` — `EvidenceSymbol` is `'✓' | '⚠'` (not `'·'`)
- `computeConsensus` returns `ConsensusData` with `bullish/neutral/bearish: number`
- All three consistent throughout plan
