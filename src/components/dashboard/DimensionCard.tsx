// src/components/dashboard/DimensionCard.tsx
'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { IndicatorGroup } from '@lib/shared/types/signal'
import Tooltip from '@/components/shared/Tooltip'

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
  'Medo & Ganância':      'Mede o sentimento geral do mercado de 0 (pânico total) a 100 (euforia total).\n\nAbaixo de 25 = medo extremo — historicamente bom momento para comprar.\nAcima de 75 = euforia — risco alto de correção.',
  'Taxa de Funding':      'Taxa paga entre traders de futuros a cada 8 horas.\n\nPositiva e alta (>0,03%) = a maioria está alavancada comprando — mercado sobreaquecido.\nNegativa = maioria apostando na queda — sinal de fundo.',
  'Variação 7d':          'Variação percentual do BTC nos últimos 7 dias.\n\nQuedas fortes (>10% em uma semana) costumam ser bons pontos de entrada para DCA tático.',
  'Open Interest':        'Valor total de contratos futuros abertos no mercado.\n\nPreço cai + OI cai forte = desalavancagem saudável.\nPreço sobe + OI sobe muito = mercado cada vez mais alavancado.',
  'Liq. de Longs':        'Volume de posições compradas forçadas a fechar por falta de margem.\n\nLiquidações massivas costumam marcar fundos de curto prazo.',
  'MVRV':                 'Market Value to Realized Value.\n\nAbaixo de 1 = zona de capitulação histórica.\nAcima de 6 = zona de euforia.',
  'Preço Realizado':      'Preço médio ao qual cada BTC foi movimentado pela última vez.\n\nBTC abaixo do preço realizado = oportunidade histórica muito rara.',
  'Mayer Multiple':       'Preço atual dividido pela média móvel de 200 dias.\n\nAbaixo de 0,8 = BTC extremamente barato.\nAcima de 2,4 = zona de topo de ciclo.',
  'Hash Ribbon':          'Compara o poder computacional de mineração dos últimos 30 e 60 dias.\n\nCapitulação dos mineradores terminando = um dos sinais de compra mais confiáveis.',
  'Pressão venda':        'Mede a proporção de volume de venda em relação ao de compra.\n\nAlta pressão = whales distribuindo BTC.',
  'Médias Móveis':        'Posição do preço em relação às médias de 50d, 200d e 50 semanas.\n\nAbaixo das três = zona historicamente barata.',
  'ETF Institucional':    'Monitora o volume dos maiores ETFs de Bitcoin: IBIT, FBTC, GBTC e ARKB.',
  'Pi Cycle Top':         'Indicador técnico que compara médias móveis de longo prazo.\n\nCruzamento = sinal histórico de topo de ciclo.',
  'Bollinger %B':         'Mostra onde o preço está dentro das Bandas de Bollinger.\n\n0% ou abaixo = muito vendido. 100% ou acima = muito comprado.',
  'DXY (Dólar Index)':    'Índice que mede a força do dólar americano.\n\nDXY subindo = pressão sobre Bitcoin. DXY caindo = ambiente favorável.',
  'Long/Short Ratio':     'Proporção de traders com posições compradas versus vendidas.\n\nRatio acima de 1,5 = risco elevado. Abaixo de 0,7 = possível reversão.',
  'BTC Dominância':       'Percentual do Bitcoin no valor total do mercado cripto.\n\nAcima de 60% = bom contexto para acumular. Abaixo de 40% = euforia extrema.',
  'Stablecoin Ratio':     'Compara o mercado de stablecoins com o market cap do Bitcoin.\n\nSSR baixo = força compradora disponível.',
  'Heatmap Liquidações':  'Estima onde estão as liquidações forçadas por faixa de preço.\n\nCluster acima = shorts em risco. Cluster abaixo = longs em risco.',
}

interface DimensionCardProps {
  group: IndicatorGroup
}

export default function DimensionCard({ group }: DimensionCardProps) {
  const [expanded, setExpanded] = useState(false)

  const color   = GROUP_COLOR[group.key]   ?? 'var(--text-sec)'
  const icon    = GROUP_ICON[group.key]    ?? '·'
  const tooltip = GROUP_TOOLTIP[group.key]
  const pct     = Math.min(100, Math.max(0, (group.score + 10) / 20 * 100))

  return (
    <div style={{
      background:   'var(--surface)',
      border:       '1px solid var(--border-dim)',
      borderTop:    `3px solid ${color}`,
      borderRadius: '12px',
      overflow:     'hidden',
    }}>
      {/* Header — always visible, clickable */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded(v => !v)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setExpanded(v => !v) }}
        style={{ padding: '14px 16px', cursor: 'pointer', userSelect: 'none' }}
      >
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          marginBottom:   '10px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '14px' }}>{icon}</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>{group.label}</span>
            {tooltip && (
              <span onClick={e => e.stopPropagation()}>
                <Tooltip text={tooltip} position="right" wide />
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color }}>
              {group.score > 0 ? `+${group.score.toFixed(1)}` : group.score.toFixed(1)}
            </span>
            <motion.span
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              style={{ display: 'inline-block', color: 'var(--text-muted)', fontSize: '12px', lineHeight: 1 }}
            >
              ▾
            </motion.span>
          </div>
        </div>

        {/* Score bar */}
        <div style={{ height: '3px', background: 'var(--surface3)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '3px', background: color, borderRadius: '2px' }} />
        </div>
      </div>

      {/* Expandable indicators list */}
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
                    <div style={{
                      display:    'flex',
                      alignItems: 'center',
                      gap:        '3px',
                      width:      '100px',
                      flexShrink: 0,
                    }}>
                      <span style={{
                        fontSize:     '11px',
                        color:        'var(--text-sec)',
                        overflow:     'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace:   'nowrap',
                        minWidth:     0,
                        flex:         1,
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
                      fontSize:     '11px',
                      color:        'var(--text-muted)',
                      flex:         1,
                      overflow:     'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace:   'nowrap',
                    }}>
                      {ind.summary}
                    </span>
                    <span style={{
                      fontSize:   '11px',
                      color:      indColor,
                      fontWeight: 600,
                      flexShrink: 0,
                      minWidth:   '36px',
                      textAlign:  'right',
                    }}>
                      {ind.score > 0 ? `+${ind.score.toFixed(1)}` : ind.score.toFixed(1)}
                    </span>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
