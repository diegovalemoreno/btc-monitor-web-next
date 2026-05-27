// src/components/dashboard/DimensionCard.tsx
'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { IndicatorGroup } from '@lib/shared/types/signal'
import Tooltip from '@/components/shared/Tooltip'

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
    trend:       { pos: 'Alta confirmada nas médias',          neu: 'Tendência em consolidação',       neg: 'Estrutura de alta fragilizada'     },
    onchain:     { pos: 'Valuation ainda saudável',            neu: 'Valuation em zona neutra',        neg: 'Pressão de venda elevada'          },
    sentiment:   { pos: 'Medo moderado — contrário positivo',  neu: 'Sentimento equilibrado',          neg: 'Euforia — risco elevado'           },
    derivatives: { pos: 'Derivativos sem alavancagem',         neu: 'Funding neutro, OI estável',      neg: 'Alavancagem excessiva acumulada'   },
    macro:       { pos: 'Macro favorável ao BTC',              neu: 'Contexto macro neutro',           neg: 'Macro pressionando ativos de risco' },
    synthesis:   { pos: 'Confluência bullish forte',           neu: 'Confluência moderada',            neg: 'Sem confluência favorável'         },
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

// ── Shared indicators list ────────────────────────────────────

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

  const color    = GROUP_COLOR[group.key]   ?? 'var(--text-sec)'
  const icon     = GROUP_ICON[group.key]    ?? '·'
  const tooltip  = GROUP_TOOLTIP[group.key]
  const pct      = Math.min(100, Math.max(0, (group.score + 10) / 20 * 100))
  const insight  = getGroupInsight(group.key, group.score)
  const quote    = group.indicators[0]?.summary ?? ''
  const scoreStr = group.score > 0 ? `+${group.score.toFixed(1)}` : group.score.toFixed(1)

  const toggle = () => setExpanded(v => !v)
  const onKey  = (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') toggle() }

  // ── SPOTLIGHT ──────────────────────────────────────────────
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
        <div style={{
          position:      'absolute',
          top: 0, left: 0, right: 0,
          height:        '80px',
          background:    `linear-gradient(180deg, ${color}07 0%, transparent 100%)`,
          pointerEvents: 'none',
        }} />

        <div style={{ padding: '20px 22px 0', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
            <span style={{
              fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.15em',
            }}>
              {icon} {group.label} · Spotlight
            </span>
            {tooltip && <Tooltip text={tooltip} position="right" wide />}
          </div>

          <div style={{ fontSize: '16px', fontWeight: 800, color, lineHeight: 1.25, marginBottom: '8px' }}>
            {insight}
          </div>

          <div style={{
            fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.6,
            borderLeft: `2px solid ${color}25`, paddingLeft: '10px', marginBottom: '16px',
          }}>
            {quote}
          </div>

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

        <div
          role="button"
          tabIndex={0}
          onClick={toggle}
          onKeyDown={onKey}
          style={{
            borderTop: '1px solid var(--border-dim)', padding: '8px 22px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            cursor: 'pointer', userSelect: 'none',
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

  // ── MEDIUM ─────────────────────────────────────────────────
  if (variant === 'medium') {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={toggle}
        onKeyDown={onKey}
        style={{
          background:   'var(--surface)',
          border:       '1px solid rgba(255,255,255,0.04)',
          borderTop:    `2px solid ${color}`,
          borderRadius: '12px',
          overflow:     'hidden',
          cursor:       'pointer',
          userSelect:   'none',
          position:     'relative',
          transition:   'border-color 0.2s',
        }}
      >
        <div style={{
          position: 'absolute', top: 0, right: 0, width: '80px', height: '80px',
          background: `radial-gradient(circle, ${color}07 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />

        <div style={{ padding: '14px 16px 0', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '10px' }}>
            <span style={{
              fontSize: '8px', fontWeight: 700, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.12em',
            }}>
              {icon} {group.label}
            </span>
            {tooltip && (
              <span onClick={e => e.stopPropagation()}>
                <Tooltip text={tooltip} position="right" wide />
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
            <MiniGauge value={pct} color={color} size={44} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color, lineHeight: 1.3, marginBottom: '3px' }}>
                {insight}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{scoreStr}</div>
            </div>
          </div>

          <div style={{
            fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.6,
            borderLeft: `2px solid ${color}20`, paddingLeft: '8px', marginBottom: '10px',
          }}>
            {quote}
          </div>
        </div>

        <div style={{
          borderTop: '1px solid var(--border-dim)', padding: '7px 16px',
          display: 'flex', alignItems: 'center', gap: '8px',
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

  // ── COMPACT ────────────────────────────────────────────────
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
          padding: '11px 14px', display: 'flex', alignItems: 'center',
          gap: '10px', cursor: 'pointer', userSelect: 'none',
        }}
      >
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: color, flexShrink: 0 }} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '9px', color: 'var(--text-muted)', fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '2px',
          }}>
            {icon} {group.label}
          </div>
          <div style={{
            fontSize: '12px', fontWeight: 700, color,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {insight}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <span style={{ fontSize: '16px', fontWeight: 900, color }}>{scoreStr}</span>
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
