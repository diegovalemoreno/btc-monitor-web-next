# Dashboard Premium Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor dashboard components from an organized technical grid into a premium institutional experience where the user understands scenario, risk, and direction in 5 seconds.

**Architecture:** Refactor in-place — modify existing 6 components plus create `ConsensusSection.tsx`. No new data fetching, no type changes. All visuals use existing CSS tokens and inline rgba. Three DimensionCard variants (spotlight/medium/compact) driven by a `variant` prop passed from `DimensionGrid`.

**Tech Stack:** Next.js 14 App Router, React, framer-motion (already installed), TypeScript, inline styles + CSS classes in globals.css.

---

## File Map

| Action | File |
|--------|------|
| Modify | `src/app/globals.css` |
| Rewrite | `src/components/dashboard/HeroSection.tsx` |
| Rewrite | `src/components/dashboard/DimensionCard.tsx` |
| Rewrite | `src/components/dashboard/DimensionGrid.tsx` |
| **Create** | `src/components/dashboard/ConsensusSection.tsx` |
| Rewrite | `src/components/dashboard/InsightsPanel.tsx` |
| Modify | `src/app/dashboard/page.tsx` |
| Delete | `src/components/dashboard/ConsensusBadge.tsx` |

`ScoreGauge.tsx` is unchanged — no longer used by `HeroSection` but still used internally by `DimensionCard`.

---

## Task 1: Add grid classes to globals.css

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Add the grid classes after the existing `.grid-3` block**

Open `src/app/globals.css`. After the `.grid-3` responsive block (around line 158), add:

```css
/* ── Dashboard dimension grid ─────────────────────────────── */

.grid-dimension {
  display:               grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap:                   12px;
  margin-bottom:         24px;
}

.grid-dimension-compact {
  grid-column:           1 / -1;
  display:               grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap:                   12px;
}

@media (max-width: 960px) {
  .grid-dimension { grid-template-columns: 1fr 1fr; }
}

@media (max-width: 640px) {
  .grid-dimension         { grid-template-columns: 1fr; }
  .grid-dimension-compact { grid-template-columns: 1fr; }
}
```

- [ ] **Step 2: Verify no syntax errors**

```bash
npm run build 2>&1 | grep -i "error\|css" | head -20
```

Expected: no CSS-related errors (build may fail on TypeScript until later tasks — that's fine).

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "style(dashboard): add grid-dimension CSS classes for asymmetric layout"
```

---

## Task 2: Rewrite HeroSection.tsx — Score as Protagonist

**Files:**
- Rewrite: `src/components/dashboard/HeroSection.tsx`

The hero becomes a centered panel. Giant score number (88px) is the visual protagonist. Regime color drives a top radial glow. Score color drives a secondary glow ring. No `ScoreGauge` component — raw number only. `ConsensusBadge` removed (it moves to `ConsensusSection` in Task 5).

- [ ] **Step 1: Replace the entire file content**

```tsx
// src/components/dashboard/HeroSection.tsx
import type { TacticalSignal, MarketRegime, RiskLevel, ActionBias } from '@lib/shared/types/signal'

const REGIME_LABEL: Record<MarketRegime, string> = {
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

const REGIME_COLOR: Record<MarketRegime, string> = {
  CAPITULATION_ZONE:       '#69F0AE',
  TACTICAL_BUY_AGGRESSIVE: '#00C853',
  TACTICAL_BUY_MODERATE:   '#00BCD4',
  TACTICAL_BUY_LIGHT:      '#e08a3a',
  NEUTRAL:                 '#b0a090',
  RISK_OFF:                '#FFD600',
  EXTREME_RISK:            '#FF6D00',
  OVERLEVERAGED_MARKET:    '#FF1744',
  EUPHORIA_ZONE:           '#b71c1c',
}

const RISK_LABEL: Record<RiskLevel, string> = {
  LOW:     'Baixo',
  MEDIUM:  'Médio',
  HIGH:    'Alto',
  EXTREME: 'Extremo',
}

const RISK_COLOR: Record<RiskLevel, string> = {
  LOW:     '#00C853',
  MEDIUM:  '#e08a3a',
  HIGH:    '#FF6D00',
  EXTREME: '#FF1744',
}

const BIAS_LABEL: Record<ActionBias, string> = {
  DCA_NORMAL:              'DCA Normal',
  TACTICAL_BUY_LIGHT:      'Compra leve',
  TACTICAL_BUY_MODERATE:   'Compra moderada',
  TACTICAL_BUY_AGGRESSIVE: 'Compra agressiva',
  WAIT:                    'Aguardar',
  RISK_OFF:                'Risk-off',
}

function formatBTC(price: number | null): string {
  if (!price) return '—'
  return new Intl.NumberFormat('en-US', {
    style:                 'currency',
    currency:              'USD',
    maximumFractionDigits: 0,
  }).format(price)
}

function scoreColor(score: number): string {
  if (score > 60) return '#00C853'
  if (score > 40) return '#e08a3a'
  return '#FF1744'
}

interface HeroSectionProps {
  signal:           TacticalSignal
  opportunityScore: number
  updatedAt:        string
}

export default function HeroSection({ signal, opportunityScore, updatedAt }: HeroSectionProps) {
  const regimeColor = REGIME_COLOR[signal.regime]   ?? '#b0a090'
  const regimeLabel = REGIME_LABEL[signal.regime]   ?? signal.regime
  const riskColor   = RISK_COLOR[signal.riskLevel]  ?? 'var(--text-muted)'
  const riskLabel   = RISK_LABEL[signal.riskLevel]  ?? signal.riskLevel
  const biasLabel   = BIAS_LABEL[signal.actionBias] ?? signal.actionBias
  const numColor    = scoreColor(opportunityScore)

  return (
    <div style={{
      position:     'relative',
      background:   'var(--surface)',
      border:       '1px solid var(--border-dim)',
      borderRadius: '16px',
      padding:      '40px 48px',
      marginBottom: '24px',
      overflow:     'hidden',
      textAlign:    'center',
    }}>
      {/* Regime glow — top radial */}
      <div style={{
        position:      'absolute',
        inset:         0,
        background:    `radial-gradient(ellipse 70% 120% at 50% -10%, ${regimeColor}13 0%, transparent 60%)`,
        pointerEvents: 'none',
      }} />
      {/* Score glow ring behind the number */}
      <div style={{
        position:      'absolute',
        top:           '50%',
        left:          '50%',
        transform:     'translate(-50%, -50%)',
        width:         '320px',
        height:        '320px',
        background:    `radial-gradient(circle, ${numColor}08 0%, transparent 65%)`,
        pointerEvents: 'none',
      }} />

      {/* Label */}
      <div style={{
        fontSize:      '10px',
        fontWeight:    700,
        letterSpacing: '0.2em',
        color:         'var(--orange)',
        textTransform: 'uppercase',
        marginBottom:  '16px',
        position:      'relative',
      }}>
        Oportunidade de Entrada
      </div>

      {/* Score */}
      <div style={{
        fontSize:      '88px',
        fontWeight:    900,
        color:         numColor,
        lineHeight:    1,
        letterSpacing: '-4px',
        position:      'relative',
        textShadow:    `0 0 80px ${numColor}30`,
      }}>
        {Math.round(opportunityScore)}
      </div>

      {/* /100 */}
      <div style={{
        fontSize:      '11px',
        color:         'var(--text-muted)',
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        marginTop:     '4px',
        position:      'relative',
      }}>
        / 100
      </div>

      {/* Regime label */}
      <div style={{
        fontSize:   '18px',
        fontWeight: 800,
        color:      'var(--text)',
        marginTop:  '20px',
        position:   'relative',
      }}>
        {regimeLabel}
      </div>

      {/* Price · timestamp */}
      <div style={{
        fontSize:  '13px',
        color:     'var(--text-muted)',
        marginTop: '6px',
        position:  'relative',
      }}>
        {formatBTC(signal.btcPrice)} · {updatedAt}
      </div>

      {/* Narrative reading */}
      {signal.reading && (
        <div style={{
          fontSize:   '12px',
          color:      'var(--text-muted)',
          lineHeight: 1.7,
          maxWidth:   '480px',
          margin:     '12px auto 0',
          position:   'relative',
        }}>
          {signal.reading}
        </div>
      )}

      {/* Pills */}
      <div style={{
        display:        'flex',
        gap:            '8px',
        justifyContent: 'center',
        marginTop:      '20px',
        position:       'relative',
      }}>
        <div style={{
          fontSize:     '10px',
          fontWeight:   600,
          borderRadius: '5px',
          padding:      '4px 14px',
          background:   `${riskColor}15`,
          border:       `1px solid ${riskColor}33`,
          color:        riskColor,
        }}>
          Risco: {riskLabel}
        </div>
        <div style={{
          fontSize:     '10px',
          fontWeight:   600,
          borderRadius: '5px',
          padding:      '4px 14px',
          background:   'var(--surface2)',
          border:       '1px solid var(--border-dim)',
          color:        'var(--text-muted)',
        }}>
          {biasLabel}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npm run build 2>&1 | grep -E "HeroSection|error TS" | head -20
```

Expected: no errors referencing `HeroSection.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/HeroSection.tsx
git commit -m "feat(dashboard): hero score-as-protagonist — centered giant number, regime glow"
```

---

## Task 3: Rewrite DimensionCard.tsx — Three Variants

**Files:**
- Rewrite: `src/components/dashboard/DimensionCard.tsx`

Adds `variant: 'spotlight' | 'medium' | 'compact'` prop. Each variant has a different visual treatment. The expandable indicators list is shared across spotlight and medium variants. Compact has a simpler bottom drawer. Adds `MiniGauge` (inline SVG, no label) and `getGroupInsight` (score-range-based short text) as file-local helpers.

- [ ] **Step 1: Replace the entire file**

```tsx
// src/components/dashboard/DimensionCard.tsx
'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { IndicatorGroup } from '@lib/shared/types/signal'
import Tooltip from '@/components/shared/Tooltip'

// ── Color / icon maps (unchanged) ────────────────────────────

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

const INDICATOR_TOOLTIP: Record<string, string> = {
  'Medo & Ganância':     'Mede o sentimento geral do mercado de 0 (pânico total) a 100 (euforia total).\n\nAbaixo de 25 = medo extremo — historicamente bom momento para comprar.\nAcima de 75 = euforia — risco alto de correção.',
  'Taxa de Funding':     'Taxa paga entre traders de futuros a cada 8 horas.\n\nPositiva e alta (>0,03%) = a maioria está alavancada comprando — mercado sobreaquecido.\nNegativa = maioria apostando na queda — sinal de fundo.',
  'Variação 7d':         'Variação percentual do BTC nos últimos 7 dias.\n\nQuedas fortes (>10% em uma semana) costumam ser bons pontos de entrada para DCA tático.',
  'Open Interest':       'Valor total de contratos futuros abertos no mercado.\n\nPreço cai + OI cai forte = desalavancagem saudável.\nPreço sobe + OI sobe muito = mercado cada vez mais alavancado.',
  'Liq. de Longs':       'Volume de posições compradas forçadas a fechar por falta de margem.\n\nLiquidações massivas costumam marcar fundos de curto prazo.',
  'MVRV':                'Market Value to Realized Value.\n\nAbaixo de 1 = zona de capitulação histórica.\nAcima de 6 = zona de euforia.',
  'Preço Realizado':     'Preço médio ao qual cada BTC foi movimentado pela última vez.\n\nBTC abaixo do preço realizado = oportunidade histórica muito rara.',
  'Mayer Multiple':      'Preço atual dividido pela média móvel de 200 dias.\n\nAbaixo de 0,8 = BTC extremamente barato.\nAcima de 2,4 = zona de topo de ciclo.',
  'Hash Ribbon':         'Compara o poder computacional de mineração dos últimos 30 e 60 dias.\n\nCapitulação dos mineradores terminando = um dos sinais de compra mais confiáveis.',
  'Pressão venda':       'Mede a proporção de volume de venda em relação ao de compra.\n\nAlta pressão = whales distribuindo BTC.',
  'Médias Móveis':       'Posição do preço em relação às médias de 50d, 200d e 50 semanas.\n\nAbaixo das três = zona historicamente barata.',
  'ETF Institucional':   'Monitora o volume dos maiores ETFs de Bitcoin: IBIT, FBTC, GBTC e ARKB.',
  'Pi Cycle Top':        'Indicador técnico que compara médias móveis de longo prazo.\n\nCruzamento = sinal histórico de topo de ciclo.',
  'Bollinger %B':        'Mostra onde o preço está dentro das Bandas de Bollinger.\n\n0% ou abaixo = muito vendido. 100% ou acima = muito comprado.',
  'DXY (Dólar Index)':   'Índice que mede a força do dólar americano.\n\nDXY subindo = pressão sobre Bitcoin. DXY caindo = ambiente favorável.',
  'Long/Short Ratio':    'Proporção de traders com posições compradas versus vendidas.\n\nRatio acima de 1,5 = risco elevado. Abaixo de 0,7 = possível reversão.',
  'BTC Dominância':      'Percentual do Bitcoin no valor total do mercado cripto.\n\nAcima de 60% = bom contexto para acumular. Abaixo de 40% = euforia extrema.',
  'Stablecoin Ratio':    'Compara o mercado de stablecoins com o market cap do Bitcoin.\n\nSSR baixo = força compradora disponível.',
  'Heatmap Liquidações': 'Estima onde estão as liquidações forçadas por faixa de preço.\n\nCluster acima = shorts em risco. Cluster abaixo = longs em risco.',
}

// ── Helpers ───────────────────────────────────────────────────

function getGroupInsight(key: string, score: number): string {
  type Tier = { pos: string; neu: string; neg: string }
  const map: Record<string, Tier> = {
    trend:       { pos: 'Alta confirmada nas médias',         neu: 'Tendência em consolidação',      neg: 'Estrutura de alta fragilizada'    },
    onchain:     { pos: 'Valuation ainda saudável',           neu: 'Valuation em zona neutra',       neg: 'Pressão de venda elevada'         },
    sentiment:   { pos: 'Medo moderado — contrário positivo', neu: 'Sentimento equilibrado',         neg: 'Euforia — risco elevado'          },
    derivatives: { pos: 'Derivativos sem alavancagem',        neu: 'Funding neutro, OI estável',     neg: 'Alavancagem excessiva acumulada'  },
    macro:       { pos: 'Macro favorável ao BTC',             neu: 'Contexto macro neutro',          neg: 'Macro pressionando ativos de risco' },
    synthesis:   { pos: 'Confluência bullish forte',          neu: 'Confluência moderada',           neg: 'Sem confluência favorável'        },
  }
  const entry = map[key] ?? { pos: 'Sinal positivo', neu: 'Sinal neutro', neg: 'Sinal negativo' }
  return score > 2 ? entry.pos : score >= -2 ? entry.neu : entry.neg
}

interface MiniGaugeProps { value: number; color: string; size: number }

function MiniGauge({ value, color, size }: MiniGaugeProps) {
  const r    = (size / 2) - (size * 0.09)
  const circ = 2 * Math.PI * r
  const pct  = Math.min(100, Math.max(0, value))
  const dash = (pct / 100) * circ
  const cx   = size / 2
  const cy   = size / 2
  const fs   = Math.round(size * 0.22)

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--surface3)" strokeWidth={size * 0.09} />
      <circle
        cx={cx} cy={cy} r={r}
        fill="none" stroke={color} strokeWidth={size * 0.09}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      <text
        x={cx} y={cy + fs * 0.38}
        textAnchor="middle"
        fill={color}
        fontSize={fs}
        fontWeight="800"
        fontFamily="Inter, system-ui, sans-serif"
      >
        {Math.round(pct)}
      </text>
    </svg>
  )
}

// ── Indicators list (shared between spotlight and medium) ─────

interface IndicatorsListProps { group: IndicatorGroup; color: string }

function IndicatorsList({ group, color }: IndicatorsListProps) {
  return (
    <div style={{ borderTop: '1px solid var(--border-dim)', paddingBottom: '8px' }}>
      {group.indicators.map(ind => {
        const indColor   = ind.score > 0 ? '#00C853' : ind.score < 0 ? '#FF6D00' : 'var(--text-muted)'
        const indTooltip = INDICATOR_TOOLTIP[ind.name]
        return (
          <div key={ind.name} style={{
            display:     'flex',
            alignItems:  'center',
            gap:         '8px',
            padding:     '6px 14px 6px 12px',
            borderLeft:  `2px solid ${color}33`,
            marginLeft:  '8px',
            marginRight: '8px',
            marginTop:   '4px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', width: '100px', flexShrink: 0 }}>
              <span style={{
                fontSize: '11px', color: 'var(--text-sec)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                minWidth: 0, flex: 1,
              }}>
                {ind.name}
              </span>
              {indTooltip && (
                <span onClick={e => e.stopPropagation()}>
                  <Tooltip text={indTooltip} position="right" wide />
                </span>
              )}
            </div>
            <span style={{
              fontSize: '11px', color: 'var(--text-muted)', flex: 1,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {ind.summary}
            </span>
            <span style={{
              fontSize: '11px', color: indColor, fontWeight: 600,
              flexShrink: 0, minWidth: '36px', textAlign: 'right',
            }}>
              {ind.score > 0 ? `+${ind.score.toFixed(1)}` : ind.score.toFixed(1)}
            </span>
          </div>
        )
      })}
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
  const [expanded, setExpanded] = useState(false)

  const color   = GROUP_COLOR[group.key]   ?? 'var(--text-sec)'
  const icon    = GROUP_ICON[group.key]    ?? '·'
  const tooltip = GROUP_TOOLTIP[group.key]
  const pct     = Math.min(100, Math.max(0, (group.score + 10) / 20 * 100))
  const insight = getGroupInsight(group.key, group.score)
  const quote   = group.indicators[0]?.summary ?? ''
  const scoreStr = group.score > 0 ? `+${group.score.toFixed(1)}` : group.score.toFixed(1)

  const toggle = () => setExpanded(v => !v)
  const onKey  = (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') toggle() }

  // ── SPOTLIGHT ──
  if (variant === 'spotlight') {
    return (
      <div style={{
        background:   'var(--surface)',
        border:       '1px solid var(--border-dim)',
        borderLeft:   `3px solid ${color}`,
        borderRadius: '12px',
        overflow:     'hidden',
        position:     'relative',
      }}>
        {/* Top gradient overlay */}
        <div style={{
          position:      'absolute',
          top: 0, left: 0, right: 0,
          height:        '80px',
          background:    `linear-gradient(180deg, ${color}07 0%, transparent 100%)`,
          pointerEvents: 'none',
        }} />

        <div style={{ padding: '20px 22px 0', position: 'relative' }}>
          {/* Tag */}
          <div style={{
            display:       'flex',
            alignItems:    'center',
            gap:           '6px',
            marginBottom:  '10px',
          }}>
            <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
              {icon} {group.label} · Spotlight
            </span>
            {tooltip && (
              <Tooltip text={tooltip} position="right" wide />
            )}
          </div>

          {/* Insight */}
          <div style={{ fontSize: '16px', fontWeight: 800, color, lineHeight: 1.25, marginBottom: '8px' }}>
            {insight}
          </div>

          {/* Citation quote */}
          <div style={{
            fontSize:    '11px',
            color:       'var(--text-muted)',
            lineHeight:  1.6,
            borderLeft:  `2px solid ${color}25`,
            paddingLeft: '10px',
            marginBottom: '16px',
          }}>
            {quote}
          </div>

          {/* Bottom row: score + bar + gauge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            <span style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text)', flexShrink: 0 }}>
              {scoreStr}
            </span>
            <div style={{ flex: 1, height: '3px', background: 'var(--surface3)', borderRadius: '2px' }}>
              <div style={{ height: '3px', width: `${pct}%`, background: color, borderRadius: '2px' }} />
            </div>
            <MiniGauge value={pct} color={color} size={44} />
          </div>
        </div>

        {/* Expand footer */}
        <div
          role="button"
          tabIndex={0}
          onClick={toggle}
          onKeyDown={onKey}
          style={{
            borderTop:      '1px solid var(--border-dim)',
            padding:        '8px 22px',
            display:        'flex',
            justifyContent: 'space-between',
            alignItems:     'center',
            cursor:         'pointer',
            userSelect:     'none',
          }}
        >
          <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {group.indicators.length} indicadores
          </span>
          <motion.span
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            style={{ display: 'inline-block', color: 'var(--text-muted)', fontSize: '12px', lineHeight: 1 }}
          >
            ▾
          </motion.span>
        </div>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              key="indicators"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              style={{ overflow: 'hidden' }}
            >
              <IndicatorsList group={group} color={color} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // ── MEDIUM ──
  if (variant === 'medium') {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={toggle}
        onKeyDown={onKey}
        style={{
          background:   'var(--surface)',
          border:       `1px solid rgba(255,255,255,0.04)`,
          borderTop:    `2px solid ${color}`,
          borderRadius: '12px',
          overflow:     'hidden',
          cursor:       'pointer',
          userSelect:   'none',
          position:     'relative',
          transition:   'border-color 0.2s',
        }}
      >
        {/* Top-right glow */}
        <div style={{
          position:      'absolute',
          top: 0, right: 0,
          width:         '80px',
          height:        '80px',
          background:    `radial-gradient(circle, ${color}07 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />

        <div style={{ padding: '14px 16px 0', position: 'relative' }}>
          {/* Tag */}
          <div style={{
            display:      'flex',
            alignItems:   'center',
            gap:          '4px',
            marginBottom: '10px',
          }}>
            <span style={{ fontSize: '8px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
              {icon} {group.label}
            </span>
            {tooltip && (
              <span onClick={e => e.stopPropagation()}>
                <Tooltip text={tooltip} position="right" wide />
              </span>
            )}
          </div>

          {/* Gauge + insight row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
            <MiniGauge value={pct} color={color} size={40} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color, lineHeight: 1.3, marginBottom: '2px' }}>
                {insight}
              </div>
              <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                {scoreStr}
              </div>
            </div>
          </div>

          {/* Citation quote */}
          <div style={{
            fontSize:    '9px',
            color:       'var(--text-muted)',
            lineHeight:  1.5,
            borderLeft:  `2px solid ${color}20`,
            paddingLeft: '8px',
            marginBottom: '10px',
          }}>
            {quote}
          </div>
        </div>

        {/* Footer: bar + expand hint */}
        <div style={{
          borderTop:      '1px solid var(--border-dim)',
          padding:        '7px 16px',
          display:        'flex',
          alignItems:     'center',
          gap:            '8px',
        }}>
          <div style={{ flex: 1, height: '2px', background: 'var(--surface3)', borderRadius: '1px' }}>
            <div style={{ height: '2px', width: `${pct}%`, background: color, borderRadius: '1px' }} />
          </div>
          <motion.span
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            style={{ display: 'inline-block', fontSize: '9px', color: 'var(--text-muted)', lineHeight: 1, flexShrink: 0 }}
          >
            ▾
          </motion.span>
        </div>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              key="indicators"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              style={{ overflow: 'hidden' }}
            >
              <IndicatorsList group={group} color={color} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // ── COMPACT ──
  return (
    <div style={{
      background:   'var(--surface2)',
      border:       '1px solid var(--border-dim)',
      borderRadius: '10px',
      overflow:     'hidden',
      transition:   'background 0.15s, border-color 0.15s',
    }}>
      <div
        role="button"
        tabIndex={0}
        onClick={toggle}
        onKeyDown={onKey}
        style={{
          padding:        '11px 14px',
          display:        'flex',
          alignItems:     'center',
          gap:            '10px',
          cursor:         'pointer',
          userSelect:     'none',
        }}
      >
        {/* Colored dot */}
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: color, flexShrink: 0 }} />

        {/* Label + insight */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '8px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1px' }}>
            {icon} {group.label}
          </div>
          <div style={{
            fontSize:     '10px',
            fontWeight:   700,
            color,
            whiteSpace:   'nowrap',
            overflow:     'hidden',
            textOverflow: 'ellipsis',
          }}>
            {insight}
          </div>
        </div>

        {/* Score + chevron */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <span style={{ fontSize: '14px', fontWeight: 900, color }}>
            {scoreStr}
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
            key="indicators"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <IndicatorsList group={group} color={color} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npm run build 2>&1 | grep -E "DimensionCard|error TS" | head -20
```

Expected: no errors referencing `DimensionCard.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/DimensionCard.tsx
git commit -m "feat(dashboard): DimensionCard — spotlight/medium/compact variants with MiniGauge"
```

---

## Task 4: Rewrite DimensionGrid.tsx — Asymmetric Layout

**Files:**
- Rewrite: `src/components/dashboard/DimensionGrid.tsx`

Uses the new `.grid-dimension` and `.grid-dimension-compact` CSS classes. Fixed assignment: `trend` → spotlight, `onchain` + `sentiment` → medium, `derivatives` + `macro` + `synthesis` → compact. Any unmatched group falls back to compact.

- [ ] **Step 1: Replace the entire file**

```tsx
// src/components/dashboard/DimensionGrid.tsx
'use client'

import type { IndicatorGroup } from '@lib/shared/types/signal'
import DimensionCard from './DimensionCard'

interface DimensionGridProps {
  groups: IndicatorGroup[]
}

export default function DimensionGrid({ groups }: DimensionGridProps) {
  if (!groups || groups.length === 0) return null

  const spotlight = groups.find(g => g.key === 'trend')
  const medium1   = groups.find(g => g.key === 'onchain')
  const medium2   = groups.find(g => g.key === 'sentiment')

  const assignedKeys = new Set(['trend', 'onchain', 'sentiment'])
  const preferredCompacts = groups.filter(g =>
    g.key === 'derivatives' || g.key === 'macro' || g.key === 'synthesis'
  )
  const overflowCompacts = groups.filter(g => !assignedKeys.has(g.key) && g.key !== 'derivatives' && g.key !== 'macro' && g.key !== 'synthesis')
  const compacts = [...preferredCompacts, ...overflowCompacts]

  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{
        fontSize:      '10px',
        fontWeight:    700,
        color:         'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.15em',
        marginBottom:  '12px',
      }}>
        Dimensões do Mercado
      </div>

      <div className="grid-dimension">
        {spotlight && <DimensionCard group={spotlight} variant="spotlight" />}
        {medium1   && <DimensionCard group={medium1}   variant="medium" />}
        {medium2   && <DimensionCard group={medium2}   variant="medium" />}

        {compacts.length > 0 && (
          <div className="grid-dimension-compact">
            {compacts.map(g => (
              <DimensionCard key={g.key} group={g} variant="compact" />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npm run build 2>&1 | grep -E "DimensionGrid|error TS" | head -20
```

Expected: no errors referencing `DimensionGrid.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/DimensionGrid.tsx
git commit -m "feat(dashboard): DimensionGrid — asymmetric spotlight + medium + compact layout"
```

---

## Task 5: Create ConsensusSection.tsx

**Files:**
- Create: `src/components/dashboard/ConsensusSection.tsx`

New standalone section with a donut SVG (100px, 3 arcs proportional to indicator counts), a legend with numbers, a vertical divider, and a narrative text block. Replaces `ConsensusBadge` which was inside `HeroSection`.

- [ ] **Step 1: Create the file**

```tsx
// src/components/dashboard/ConsensusSection.tsx
import type { IndicatorGroup } from '@lib/shared/types/signal'

interface ConsensusSectionProps {
  groups: IndicatorGroup[]
}

function narrativeTitle(pos: number, total: number): string {
  const r = pos / total
  if (r >= 0.7) return 'Maioria dos indicadores favorável'
  if (r >= 0.5) return 'Leve maioria favorável'
  if (r >= 0.3) return 'Cenário misto'
  return 'Maioria dos indicadores em alerta'
}

function narrativeBody(pos: number, neg: number, total: number): string {
  if (neg === 0) return `${pos} de ${total} indicadores bullish. Nenhum em zona de risco. Momento propício para acumulação.`
  if (neg === 1) return `${pos} de ${total} indicadores bullish. ${neg} indicador em alerta — monitorar de perto.`
  return `${pos} de ${total} indicadores bullish. ${neg} indicadores em alerta — cautela recomendada.`
}

export default function ConsensusSection({ groups }: ConsensusSectionProps) {
  const all   = groups.flatMap(g => g.indicators)
  const pos   = all.filter(i => i.score > 1).length
  const neu   = all.filter(i => i.score >= -1 && i.score <= 1).length
  const neg   = all.filter(i => i.score < -1).length
  const total = all.length || 1

  const r     = 38
  const circ  = 2 * Math.PI * r  // ≈ 238.76

  // Arc lengths with 2px gap between segments
  const gap     = total > 1 ? 2 : 0
  const posArc  = Math.max(0, (pos / total) * circ - gap)
  const neuArc  = Math.max(0, (neu / total) * circ - gap)
  const negArc  = Math.max(0, (neg / total) * circ - gap)

  // Cumulative offsets (negative = forward rotation from -90deg start)
  const neuOffset = -(posArc + gap)
  const negOffset = -(posArc + gap + neuArc + gap)

  const bullPct = Math.round((pos / total) * 100)

  return (
    <div style={{
      background:   'var(--surface)',
      border:       '1px solid var(--border-dim)',
      borderRadius: '12px',
      padding:      '20px 24px',
      marginBottom: '24px',
    }}>
      <div style={{
        fontSize:      '10px',
        fontWeight:    700,
        color:         'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.15em',
        marginBottom:  '16px',
      }}>
        Consenso do Mercado
      </div>

      <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>

        {/* Donut */}
        <svg width="100" height="100" viewBox="0 0 100 100" style={{ flexShrink: 0 }}>
          {/* Background track */}
          <circle cx="50" cy="50" r={r} fill="none" stroke="var(--surface3)" strokeWidth="12" />

          {/* Bullish arc */}
          {pos > 0 && (
            <circle cx="50" cy="50" r={r} fill="none" stroke="#00C853" strokeWidth="12"
              strokeDasharray={`${posArc} ${circ}`}
              strokeDashoffset={0}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
            />
          )}

          {/* Neutro arc */}
          {neu > 0 && (
            <circle cx="50" cy="50" r={r} fill="none" stroke="var(--surface3)" strokeWidth="12"
              strokeDasharray={`${neuArc} ${circ}`}
              strokeDashoffset={neuOffset}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
            />
          )}

          {/* Alerta arc */}
          {neg > 0 && (
            <circle cx="50" cy="50" r={r} fill="none" stroke="var(--orange)" strokeWidth="12"
              strokeDasharray={`${negArc} ${circ}`}
              strokeDashoffset={negOffset}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
            />
          )}

          {/* Center text */}
          <text x="50" y="46" textAnchor="middle"
            fill="var(--text)" fontSize="20" fontWeight="900"
            fontFamily="Inter, system-ui, sans-serif">
            {bullPct}%
          </text>
          <text x="50" y="60" textAnchor="middle"
            fill="var(--text-muted)" fontSize="9"
            fontFamily="Inter, system-ui, sans-serif">
            bullish
          </text>
        </svg>

        {/* Legend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00C853', flexShrink: 0 }} />
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', flex: 1, minWidth: '52px' }}>Bullish</span>
            <span style={{ fontSize: '16px', fontWeight: 900, color: '#00C853' }}>{pos}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--surface3)', border: '1px solid var(--border)', flexShrink: 0 }} />
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', flex: 1, minWidth: '52px' }}>Neutro</span>
            <span style={{ fontSize: '16px', fontWeight: 900, color: 'var(--text-muted)' }}>{neu}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--orange)', flexShrink: 0 }} />
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', flex: 1, minWidth: '52px' }}>Alerta</span>
            <span style={{ fontSize: '16px', fontWeight: 900, color: 'var(--orange)' }}>{neg}</span>
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: '1px', background: 'var(--border-dim)', alignSelf: 'stretch', flexShrink: 0 }} />

        {/* Narrative */}
        <div style={{ flex: 1, minWidth: '160px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>
            {narrativeTitle(pos, total)}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            {narrativeBody(pos, neg, total)}
          </div>
        </div>

      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npm run build 2>&1 | grep -E "ConsensusSection|error TS" | head -20
```

Expected: no errors referencing `ConsensusSection.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/ConsensusSection.tsx
git commit -m "feat(dashboard): ConsensusSection — donut chart with legend and narrative reading"
```

---

## Task 6: Rewrite InsightsPanel.tsx — Institutional Feed

**Files:**
- Rewrite: `src/components/dashboard/InsightsPanel.tsx`

Each insight gets an icon circle (✓ green / ⚠ orange / · neutral), the first sentence bolded, and a bottom separator except on the last item. Section label changes from "Observações" to "Observações Institucionais".

- [ ] **Step 1: Replace the entire file**

```tsx
// src/components/dashboard/InsightsPanel.tsx

interface InsightsPanelProps {
  insights: string[]
}

type InsightType = 'bull' | 'warn' | 'neutral'

function insightType(text: string): InsightType {
  if (text.startsWith('✓') || text.startsWith('✅')) return 'bull'
  if (text.startsWith('⚠') || text.startsWith('⚡')) return 'warn'
  return 'neutral'
}

function splitText(text: string): { bold: string; rest: string } {
  const clean  = text.replace(/^[✓✅⚠⚡]\s*/, '').trim()
  const dotIdx = clean.indexOf('.')
  if (dotIdx === -1) return { bold: clean, rest: '' }
  return {
    bold: clean.slice(0, dotIdx),
    rest: clean.slice(dotIdx + 1).trim(),
  }
}

export default function InsightsPanel({ insights }: InsightsPanelProps) {
  if (!insights || insights.length === 0) return null

  return (
    <div style={{
      background:   'var(--surface)',
      border:       '1px solid var(--border-dim)',
      borderRadius: '12px',
      padding:      '20px 24px',
      marginBottom: '24px',
    }}>
      <div style={{
        fontSize:      '10px',
        fontWeight:    700,
        color:         'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.15em',
        marginBottom:  '14px',
      }}>
        Observações Institucionais
      </div>

      <div>
        {insights.map((ins, i) => {
          const type    = insightType(ins)
          const { bold, rest } = splitText(ins)
          const isLast  = i === insights.length - 1

          const iconBg    = type === 'bull'    ? 'rgba(0,200,83,0.12)'   : type === 'warn' ? 'rgba(224,138,58,0.12)' : 'var(--surface3)'
          const iconColor = type === 'bull'    ? '#00C853'                : type === 'warn' ? 'var(--orange)'         : 'var(--text-muted)'
          const iconChar  = type === 'bull'    ? '✓'                      : type === 'warn' ? '⚠'                     : '·'

          return (
            <div key={i} style={{
              display:      'flex',
              gap:          '12px',
              alignItems:   'flex-start',
              padding:      '10px 0',
              borderBottom: isLast ? 'none' : '1px solid var(--border-dim)',
            }}>
              <div style={{
                width:          '22px',
                height:         '22px',
                borderRadius:   '50%',
                background:     iconBg,
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                fontSize:       '10px',
                color:          iconColor,
                flexShrink:     0,
                marginTop:      '1px',
              }}>
                {iconChar}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-sec)', lineHeight: 1.6 }}>
                {bold && (
                  <strong style={{ color: 'var(--text)', fontWeight: 600 }}>
                    {bold}.{' '}
                  </strong>
                )}
                {rest}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npm run build 2>&1 | grep -E "InsightsPanel|error TS" | head -20
```

Expected: no errors referencing `InsightsPanel.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/InsightsPanel.tsx
git commit -m "feat(dashboard): InsightsPanel — institutional feed with icon circles and bold sentences"
```

---

## Task 7: Wire dashboard/page.tsx

**Files:**
- Modify: `src/app/dashboard/page.tsx`

Add `ConsensusSection` import. Insert `<ConsensusSection>` between `<DimensionGrid>` and `<InsightsPanel>`. Remove the old `ConsensusBadge` import (it was used only in `HeroSection` which no longer imports it, but page.tsx might have a stale import).

- [ ] **Step 1: Update the file**

Replace the full contents of `src/app/dashboard/page.tsx`:

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentMarketData } from '@/services/market-data'
import { deriveSnapshotScores } from '@/domain/snapshot-scores'
import AppNav from '@/components/shared/AppNav'
import HeroSection from '@/components/dashboard/HeroSection'
import DimensionGrid from '@/components/dashboard/DimensionGrid'
import ConsensusSection from '@/components/dashboard/ConsensusSection'
import InsightsPanel from '@/components/dashboard/InsightsPanel'

export const metadata = { title: 'Dashboard — BTC Monitor' }
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { signal } = await getCurrentMarketData()
  const scores = deriveSnapshotScores(signal)

  const updatedAt = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day:      '2-digit',
    month:    '2-digit',
    year:     'numeric',
    hour:     '2-digit',
    minute:   '2-digit',
  }).format(new Date(signal.generatedAt))

  const avatarUrl = (user.user_metadata?.avatar_url ?? null) as string | null

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      <AppNav userEmail={user.email ?? ''} userAvatarUrl={avatarUrl} />
      <main style={{ padding: '32px 24px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <HeroSection
            signal={signal}
            opportunityScore={scores.opportunityScore}
            updatedAt={updatedAt}
          />
          <DimensionGrid groups={signal.indicatorGroups} />
          <ConsensusSection groups={signal.indicatorGroups} />
          <InsightsPanel insights={signal.insights} />
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Full build check**

```bash
npm run build 2>&1 | tail -20
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "feat(dashboard): wire ConsensusSection into page between grid and insights"
```

---

## Task 8: Remove ConsensusBadge.tsx and visual verification

**Files:**
- Delete: `src/components/dashboard/ConsensusBadge.tsx`

`ConsensusBadge` is now unused — `HeroSection` no longer imports it and it has been superseded by `ConsensusSection`.

- [ ] **Step 1: Verify no remaining imports**

```bash
grep -r "ConsensusBadge" /Users/diegomoreno/development/btc-monitor-web-next/src --include="*.tsx" --include="*.ts"
```

Expected: no output. If any file still imports it, fix that import before deleting.

- [ ] **Step 2: Delete the file**

```bash
git rm src/components/dashboard/ConsensusBadge.tsx
```

- [ ] **Step 3: Final build check**

```bash
npm run build 2>&1 | tail -30
```

Expected: clean build, zero errors.

- [ ] **Step 4: Start dev server and verify visually**

```bash
npm run dev
```

Navigate to `http://localhost:3000/dashboard`. Verify:
- [ ] Hero shows large centered score number with glow, not the old gauge+pills layout
- [ ] Regime color drives background glow (top radial gradient)
- [ ] Score color matches threshold (green >60, orange >40, red else)
- [ ] Grid shows Tendência as wide spotlight card on left, On-chain + Sentimento as medium cards on right
- [ ] Three compact cards (Derivativos, Macro, Síntese) in a row below
- [ ] Clicking any card expands its indicator list with animation
- [ ] Consensus section shows donut + legend + narrative below the grid
- [ ] Insights feed shows icon circles (✓/⚠) with bold first sentences
- [ ] All four themes (dark/light/orange/celeste) render correctly without broken colors

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(dashboard): remove ConsensusBadge — superseded by ConsensusSection"
```
