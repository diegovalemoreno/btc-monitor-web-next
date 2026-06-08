'use client'

import { useState } from 'react'
import type { DcaIndicatorSignal, DcaImpact } from '@/lib/dca-tactical/types'

// User-friendly description of what each indicator measures.
const INDICATOR_WHAT: Record<string, string> = {
  'Medo & Ganância':
    'Índice 0–100 de sentimento. Medo extremo (≤20) = todos vendendo em pânico = historicamente os melhores pontos de entrada. Ganância extrema (≥80) = euforia de topo = pior hora para comprar.',

  'Taxa de Funding':
    'Taxa paga entre compradores e vendedores de contratos perpétuos. Funding negativo = shorts pagam longs = mercado alavancado na baixa, possível exaustão dos vendedores e reversão.',

  'Variação 7d':
    'Queda forte em 7 dias pode indicar capitulação ou excesso de pessimismo — janelas históricas de acumulação. Alta forte pode sinalizar sobrecompra de curto prazo.',

  'Open Interest':
    'Volume total em contratos futuros abertos. OI alto com preço elevado = risco de liquidações em cascata. OI caindo após queda = limpeza de alavancagem, possivelmente estabilizando.',

  'Liq. de Longs':
    'Liquidações em massa de posições compradas sinalizam capitulação de curto prazo e criam fundos locais — oportunidade para quem está fora do mercado.',

  'MVRV':
    'Relação entre preço de mercado e custo médio de todos os BTCs. Abaixo de 1: BTC abaixo do custo médio — historicamente raro e muito favorável. Acima de 3.5: holders em grande lucro, sinal de topo.',

  'Preço Realizado':
    'Preço médio pelo qual cada BTC mudou de mãos pela última vez. Preço de mercado abaixo do Preço Realizado = maioria dos holders no prejuízo — zona histórica de acumulação.',

  'Mayer Multiple':
    'Preço atual dividido pela média móvel de 200 dias. Abaixo de 1.0 = historicamente barato. Abaixo de 0.7 = zona rara de acumulação. Acima de 2.4 = extremo histórico de sobrevalorização.',

  'Hash Ribbon':
    'Compara médias do hashrate dos mineradores. Quando capitulam (hashrate cai), pode sinalizar fundo. Cruzamento de recuperação = sinal histórico de compra.',

  'Pressão venda':
    'Fluxo líquido de BTC para exchanges. Alta pressão = mais BTC chegando ao mercado = pressão baixista. Baixa pressão = holders retendo, expectativa de valorização.',

  'Médias Móveis':
    'Posição do preço vs médias de 50d, 100d e 200d. Abaixo de múltiplas MAs = zona de desconto histórico. Golden Cross / Death Cross sinalizam mudança de tendência.',

  'ETF Institucional':
    'Fluxo líquido nos ETFs de Bitcoin à vista (BlackRock, Fidelity etc). Entradas positivas = instituições comprando. Saídas = desinvestimento — reflete demanda do mercado tradicional.',

  'Pi Cycle Top':
    'Quando a MM111 cruza o dobro da MM350, historicamente coincide com topos de ciclo. Longe do cruzamento = bom para acumular. Próximo = cautela máxima.',

  'Bollinger %B':
    'Posição do preço dentro das Bandas de Bollinger. Abaixo de 0: sobrevendido. Acima de 1: sobrecomprado. Extremos indicam reversão iminente.',

  'DXY (Dólar Index)':
    'Força do dólar frente a cesta de moedas. DXY forte = pressão sobre BTC. DXY fraco = condições historicamente favoráveis para criptomoedas.',

  'Long/Short Ratio':
    'Proporção de posições compradas vs vendidas. Excesso de longs = otimismo excessivo, risco. Excesso de shorts = pessimismo extremo, potencial reversão.',

  'BTC Dominância':
    'Percentual do Bitcoin no market cap total de cripto. Crescendo = capital migrando para BTC. Caindo = altcoins superando — geralmente ocorre em topos de ciclo.',

  'Heatmap Liquidações':
    'Zonas de preço com alta concentração de ordens de stop. Identifica "imãs de liquidez" — preços onde o mercado tende a se mover para liquidar posições alavancadas antes de reverter.',

  'Stablecoin Ratio':
    'Relação entre volume de stablecoins e market cap do BTC. Ratio alto = muito capital parado esperando entrar — sinal de demanda futura reprimida.',

  'Regime de Mercado':
    'Classificação sintética do estado atual: capitulação, compra tática, neutro, risk-off, alavancagem excessiva ou euforia — combina múltiplos indicadores.',

  'Sinais Compostos':
    'Regras compostas que detectam padrões multi-indicadores, como "funding negativo + OI caindo + medo extremo", que individualmente seriam inconclusivos.',
}

const IMPACT_COLOR: Record<DcaImpact, string> = {
  STRONG_POSITIVE: '#22c55e',
  POSITIVE:        '#84cc16',
  NEUTRAL:         '#71717a',
  NEGATIVE:        '#f97316',
  STRONG_NEGATIVE: '#ef4444',
}

const IMPACT_DOT_LEVEL: Record<DcaImpact, number> = {
  STRONG_POSITIVE:  2,
  POSITIVE:         1,
  NEUTRAL:          0,
  NEGATIVE:        -1,
  STRONG_NEGATIVE: -2,
}

const DOT_SPECS = [
  { level: -2, color: '#ef4444' },
  { level: -1, color: '#f97316' },
  { level:  0, color: '#71717a' },
  { level:  1, color: '#84cc16' },
  { level:  2, color: '#22c55e' },
]

// Extracts the raw indicator value and an optional specific label from
// the summary string produced by the signal engine.
// Examples:
//   "8 — Medo Extremo (+2)"      → { rawValue: "8",          specificLabel: "Medo Extremo" }
//   "-0.0080% (0)"               → { rawValue: "-0.0080%",   specificLabel: null }
//   "BTC dominância 56.3% (0)"   → { rawValue: "56.3%",      specificLabel: null }
//   "indisponível (0)"           → { rawValue: null,          specificLabel: null }
function parseSummary(summary: string): { rawValue: string | null; specificLabel: string | null } {
  if (!summary || summary.startsWith('indisponível')) return { rawValue: null, specificLabel: null }

  // Strip trailing score like " (+2)" or " (0)"
  const clean = summary.replace(/\s*\([+-]?\d+\)\s*$/, '').trim()
  if (!clean) return { rawValue: null, specificLabel: null }

  const dashIdx = clean.indexOf(' — ')
  if (dashIdx !== -1) {
    const raw   = clean.slice(0, dashIdx).trim()
    const label = clean.slice(dashIdx + 3).trim()
    return { rawValue: raw || null, specificLabel: label || null }
  }

  // For "BTC dominância 56.3%" keep only the numeric part with unit
  const numMatch = clean.match(/[-+]?[\d.,]+[%×xkKmMbB$]?/)
  return { rawValue: numMatch ? numMatch[0] : clean, specificLabel: null }
}

const INITIAL_VISIBLE = 8

interface Props {
  signals: DcaIndicatorSignal[]
}

export default function DcaIndicatorBreakdown({ signals }: Props) {
  const [expanded, setExpanded] = useState(false)

  if (signals.length === 0) return null

  const visible = expanded ? signals : signals.slice(0, INITIAL_VISIBLE)
  const hasMore = signals.length > INITIAL_VISIBLE

  return (
    <div style={{
      background:   'var(--surface)',
      border:       '1px solid var(--border)',
      borderRadius: '12px',
      overflow:     'hidden',
      marginBottom: '24px',
    }}>
      <div style={{
        padding:      '14px 24px 12px',
        borderBottom: '1px solid var(--border-dim)',
        display:      'flex',
        alignItems:   'center',
        gap:          '8px',
      }}>
        <div style={{ width: '3px', height: '14px', background: 'var(--orange)', borderRadius: '2px', flexShrink: 0 }} />
        <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.2px' }}>
          Indicadores de Mercado
        </div>
        <div style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--text-muted)' }}>
          {signals.length} indicadores
        </div>
      </div>

      <div>
        {visible.map((sig, i) => (
          <IndicatorCard key={sig.name + i} sig={sig} delay={i * 0.05} />
        ))}
      </div>

      {hasMore && (
        <button
          onClick={() => setExpanded(v => !v)}
          style={{
            display:    'block',
            width:      '100%',
            padding:    '14px 24px',
            background: 'transparent',
            border:     'none',
            borderTop:  '1px solid var(--border-dim)',
            color:      'var(--text-muted)',
            fontSize:   '12px',
            cursor:     'pointer',
            textAlign:  'center',
            fontFamily: 'inherit',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--text)')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--text-muted)')}
        >
          {expanded
            ? 'Mostrar menos'
            : `Ver mais ${signals.length - INITIAL_VISIBLE} indicadores`}
        </button>
      )}
    </div>
  )
}

function IndicatorCard({ sig, delay }: { sig: DcaIndicatorSignal; delay: number }) {
  const color          = IMPACT_COLOR[sig.impact]
  const dotLevel       = IMPACT_DOT_LEVEL[sig.impact]
  const sign           = sig.score > 0 ? '+' : ''
  const desc           = INDICATOR_WHAT[sig.name] ?? ''
  const { rawValue, specificLabel } = parseSummary(sig.summary)
  const statusLabel    = specificLabel ?? sig.impactLabel

  return (
    <div
      className="ind-card"
      style={{
        display:             'grid',
        gridTemplateColumns: '1fr auto',
        alignItems:          'start',
        gap:                 '20px',
        padding:             '22px 24px',
        borderBottom:        '1px solid var(--border-dim)',
        transition:          'background 0.15s',
        animationName:           'fadeIn',
        animationDuration:       '0.4s',
        animationTimingFunction: 'ease',
        animationDelay:          `${delay}s`,
        animationFillMode:       'both',
      }}
      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--surface2)')}
      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
    >
      {/* Left: name → status → description */}
      <div>
        <div style={{
          fontSize:      '11px',
          fontWeight:    700,
          color:         '#fff',
          textTransform: 'uppercase',
          letterSpacing: '0.9px',
          marginBottom:  '7px',
        }}>
          {sig.name}
        </div>
        <div style={{
          fontSize:     '15px',
          fontWeight:   700,
          color,
          marginBottom: '8px',
          lineHeight:   1.2,
        }}>
          {statusLabel}
        </div>
        {desc && (
          <div style={{
            fontSize:   '12px',
            color:      'var(--text-muted)',
            lineHeight: 1.6,
            maxWidth:   '460px',
          }}>
            {desc}
          </div>
        )}
      </div>

      {/* Right: raw value → dots → score chip */}
      <div className="ind-card-right" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px', flexShrink: 0 }}>
        <div className="ind-card-value" style={{
          fontSize:           rawValue && rawValue.length > 6 ? '22px' : '34px',
          fontWeight:         900,
          letterSpacing:      '-1px',
          color,
          lineHeight:         1,
          fontVariantNumeric: 'tabular-nums',
          textAlign:          'right',
          maxWidth:           '120px',
          wordBreak:          'break-all',
        }}>
          {rawValue ?? '—'}
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {DOT_SPECS.map(({ level, color: dc }) => {
            const active = level === dotLevel
            return (
              <div
                key={level}
                style={{
                  width:        '11px',
                  height:       '11px',
                  borderRadius: '50%',
                  background:   dc,
                  opacity:      active ? 1 : 0.15,
                  transform:    active ? 'scale(1.35)' : 'scale(1)',
                  boxShadow:    active ? `0 0 8px ${dc}` : 'none',
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
          padding:      '3px 11px',
          borderRadius: '999px',
          border:       `1.5px solid ${color}`,
          color,
          whiteSpace:   'nowrap',
        }}>
          {sign}{sig.score} {Math.abs(sig.score) !== 1 ? 'pontos' : 'ponto'}
        </div>
      </div>
    </div>
  )
}
