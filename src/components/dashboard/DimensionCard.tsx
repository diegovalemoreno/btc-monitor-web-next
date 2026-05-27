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

// ── Raw indicator row (inside collapsible advanced section) ───

function IndicatorRow({ name, score, summary }: { name: string; score: number; summary: string }) {
  const color = score > 0 ? '#00C853' : score < 0 ? '#FF6D00' : 'var(--text-muted)'
  return (
    <div style={{
      padding:      '6px 18px',
      borderBottom: '1px solid var(--border-dim)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
        <span style={{ flex: 1, fontSize: '11px', color: 'var(--text)', fontWeight: 500 }}>{name}</span>
        <span style={{ fontSize: '11px', color, fontWeight: 700, flexShrink: 0 }}>
          {score > 0 ? `+${score}` : score}
        </span>
      </div>
      {summary && (
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
          {summary}
        </div>
      )}
    </div>
  )
}

// ── Section label ─────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize:      '8px',
      fontWeight:    700,
      color:         'var(--text-muted)',
      textTransform: 'uppercase',
      letterSpacing: '0.12em',
      marginBottom:  '5px',
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
          padding:   '7px 22px',
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
