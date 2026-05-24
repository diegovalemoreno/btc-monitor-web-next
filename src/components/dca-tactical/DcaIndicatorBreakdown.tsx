'use client'

import { useState } from 'react'
import type { DcaIndicatorSignal, DcaImpact } from '@/lib/dca-tactical/types'

// Static explanations of what each indicator measures (independent of current reading).
// Key = exact name from signal engine pipeline.ts.
const INDICATOR_WHAT: Record<string, string> = {
  'Medo & Ganância':
    'Índice 0-100 que mede o sentimento geral do mercado de criptomoedas. ' +
    '0 = medo extremo (históricamente favorável a compras), 100 = ganância extrema (sinal de cautela). ' +
    'Períodos de medo prolongado costumam preceder recuperações.',

  'Taxa de Funding':
    'Taxa paga entre compradores e vendedores de contratos perpétuos a cada 8h. ' +
    'Funding positivo = longs pagam shorts (mercado alavancado na alta). ' +
    'Funding negativo = shorts pagam longs (mercado alavancado na queda, possível exaustão dos vendedores).',

  'Variação 7d':
    'Variação percentual do preço do BTC nos últimos 7 dias. ' +
    'Quedas fortes podem indicar capitulação ou excesso de pessimismo, ' +
    'criando janelas históricas de acumulação.',

  'Open Interest':
    'Valor total em contratos futuros/perpétuos abertos no mercado. ' +
    'OI alto com preço elevado = mercado alavancado, risco de liquidações em cascata. ' +
    'OI caindo após queda = limpeza de alavancagem, possivelmente estabilizando.',

  'Liq. de Longs':
    'Volume de posições compradas (long) liquidadas nas últimas horas. ' +
    'Liquidações em massa de longs podem sinalizar capitulação de curto prazo e criar fundos locais.',

  'MVRV':
    'Market Value to Realized Value — relação entre o preço de mercado e o custo médio de todos os BTCs. ' +
    'MVRV < 1: BTC está abaixo do custo médio de todos os holders (históricamente raro e favorável). ' +
    'MVRV > 3.5: mercado aquecido, holders em grande lucro não realizado.',

  'Preço Realizado':
    'Preço médio ponderado ao qual cada BTC mudou de mãos pela última vez. ' +
    'Quando o preço de mercado fica abaixo do Preço Realizado, ' +
    'a maioria dos holders está no prejuízo — historicamente uma zona de acumulação.',

  'Mayer Multiple':
    'Relação entre o preço atual do BTC e sua média móvel de 200 dias. ' +
    'Abaixo de 1.0: preço está abaixo da MA200 (históricamente barato). ' +
    'Acima de 2.4: extremo histórico de sobrevalorização (17 vezes em toda a história do BTC).',

  'Hash Ribbon':
    'Compara médias móveis do hashrate dos mineradores. ' +
    'Quando mineradores capitulam (hashrate cai), pode sinalizar fundo. ' +
    'Cruzamento de recuperação do hashrate = sinal histórico de compra ("Hash Ribbon Buy").',

  'Pressão venda':
    'Mede o fluxo líquido de BTC para exchanges e movimentações de grandes holders. ' +
    'Alta pressão de venda = mais BTC chegando ao mercado = pressão baixista. ' +
    'Baixa pressão = holders retendo, expectativa de valorização.',

  'Médias Móveis':
    'Posição do preço atual em relação a médias móveis-chave (50d, 100d, 200d). ' +
    'Preço abaixo de múltiplas MAs = mercado em correção significativa. ' +
    'Cruzamentos de MAs (Golden Cross / Death Cross) sinalizam mudança de tendência.',

  'ETF Institucional':
    'Fluxo líquido de capital nos ETFs de Bitcoin à vista (ex: BlackRock, Fidelity). ' +
    'Entradas positivas = instituições comprando BTC. ' +
    'Saídas = desinvestimento institucional. Reflete demanda do mercado tradicional.',

  'Pi Cycle Top':
    'Indicador técnico para identificar topos de ciclo. ' +
    'Quando a MA de 111 dias cruza com o dobro da MA de 350 dias, históricamente coincide com topos de mercado. ' +
    'Útil para sinalizar quando evitar compras agressivas.',

  'Bollinger %B':
    'Posição do preço dentro das Bandas de Bollinger (2 desvios padrão da MA de 20 dias). ' +
    '%B < 0: preço abaixo da banda inferior (sobrevendido). ' +
    '%B > 1: preço acima da banda superior (sobrecomprado). ' +
    'Extremos geralmente indicam reversão iminente.',

  'DXY (Dólar Index)':
    'Força do dólar americano frente a cesta de moedas. ' +
    'DXY forte = capital fluindo para dólar = pressão sobre ativos de risco como BTC. ' +
    'DXY fraco = condições historicamente favoráveis para criptomoedas.',

  'Long/Short Ratio':
    'Proporção de posições compradas (long) vs vendidas (short) nos mercados futuros. ' +
    'Ratio muito alto (excesso de longs) = mercado otimista demais, risco de short squeeze reverso. ' +
    'Ratio muito baixo (excesso de shorts) = pessimismo extremo, potencial para squeeze de baixistas.',

  'BTC Dominância':
    'Percentual do Bitcoin no total da capitalização do mercado de criptomoedas. ' +
    'Dominância crescente = capital migrando para BTC (risk-off em cripto). ' +
    'Dominância caindo = altcoins performando melhor (risk-on, geralmente em topos de ciclo).',

  'Heatmap Liquidações':
    'Mapa de zonas de preço com alta concentração de ordens de stop e liquidações. ' +
    'Identifica "imãs de liquidez" — preços onde o mercado tende a se mover para liquidar posições alavancadas antes de reverter.',

  'Stablecoin Ratio':
    'Relação entre o volume de stablecoins disponíveis e a capitalização do BTC. ' +
    'Ratio alto = muito capital em stablecoins esperando para entrar no mercado (dry powder). ' +
    'Sinal potencial de demanda futura por BTC.',

  'Regime de Mercado':
    'Classificação sintética do estado atual do mercado pelo motor de análise. ' +
    'Combina múltiplos indicadores para determinar se estamos em: capitulação, compra tática, neutro, risk-off, alavancagem excessiva ou euforia.',

  'Sinais Compostos':
    'Resultado de regras compostas que combinam múltiplos indicadores simultaneamente. ' +
    'Detecta padrões que individualmente seriam inconclusivos, ' +
    'como "funding negativo + OI caindo + Fear & Greed em medo extremo".',
}

const IMPACT_COLOR: Record<DcaImpact, string> = {
  STRONG_POSITIVE: '#00C853',
  POSITIVE:        '#69F0AE',
  NEUTRAL:         'var(--text-muted)',
  NEGATIVE:        '#FF6D00',
  STRONG_NEGATIVE: '#FF1744',
}

const IMPACT_BG: Record<DcaImpact, string> = {
  STRONG_POSITIVE: 'rgba(0,200,83,0.12)',
  POSITIVE:        'rgba(105,240,174,0.10)',
  NEUTRAL:         'var(--surface3)',
  NEGATIVE:        'rgba(255,109,0,0.10)',
  STRONG_NEGATIVE: 'rgba(255,23,68,0.12)',
}

const SCORE_ICON: Record<DcaImpact, string> = {
  STRONG_POSITIVE: '▲▲',
  POSITIVE:        '▲',
  NEUTRAL:         '—',
  NEGATIVE:        '▼',
  STRONG_NEGATIVE: '▼▼',
}

const INITIAL_VISIBLE = 8

interface Props {
  signals: DcaIndicatorSignal[]
}

export default function DcaIndicatorBreakdown({ signals }: Props) {
  const [expanded, setExpanded] = useState(false)

  if (signals.length === 0) return null

  const visible = expanded ? signals : signals.slice(0, INITIAL_VISIBLE)
  const hasMore  = signals.length > INITIAL_VISIBLE

  return (
    <div style={{
      background:   'var(--surface)',
      border:       '1px solid var(--border)',
      borderRadius: '12px',
      overflow:     'hidden',
      marginBottom: '24px',
    }}>
      {/* Header */}
      <div style={{
        padding:      '18px 24px',
        borderBottom: '1px solid var(--border-dim)',
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Breakdown de indicadores
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          {signals.length} indicadores
        </div>
      </div>

      {/* Column headers */}
      <div style={{
        display:          'grid',
        gridTemplateColumns: '1fr 100px 60px 120px',
        padding:          '10px 24px',
        borderBottom:     '1px solid var(--border-dim)',
        background:       'var(--surface2)',
        gap:              '12px',
      }}>
        {['Indicador', 'Grupo', 'Score', 'Impacto'].map(h => (
          <div key={h} style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {h}
          </div>
        ))}
      </div>

      {/* Rows */}
      <div>
        {visible.map((sig, i) => (
          <Row key={sig.name + i} sig={sig} />
        ))}
      </div>

      {/* Show more */}
      {hasMore && (
        <button
          onClick={() => setExpanded(v => !v)}
          style={{
            display:     'block',
            width:       '100%',
            padding:     '12px 24px',
            background:  'transparent',
            border:      'none',
            borderTop:   '1px solid var(--border-dim)',
            color:       'var(--text-muted)',
            fontSize:    '12px',
            cursor:      'pointer',
            textAlign:   'center',
          }}
        >
          {expanded
            ? `Mostrar menos`
            : `Ver mais ${signals.length - INITIAL_VISIBLE} indicadores`}
        </button>
      )}
    </div>
  )
}

// Lightweight inline tooltip — hover/click the "?" to see the explanation.
function InlineTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onClick={e => { e.stopPropagation(); setOpen(v => !v) }}
    >
      <span style={{
        width:          '15px',
        height:         '15px',
        borderRadius:   '50%',
        border:         '1px solid rgba(224,138,58,0.3)',
        color:          'var(--text-muted)',
        fontSize:       '9px',
        fontWeight:     700,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        cursor:         'help',
        flexShrink:     0,
        userSelect:     'none',
      }}>
        ?
      </span>
      {open && (
        <div style={{
          position:    'absolute',
          bottom:      'calc(100% + 8px)',
          left:        '50%',
          transform:   'translateX(-50%)',
          zIndex:      200,
          width:       '280px',
          padding:     '10px 12px',
          background:  '#1e1e1e',
          border:      '1px solid rgba(224,138,58,0.2)',
          borderRadius: '8px',
          fontSize:    '12px',
          color:       '#b0a090',
          lineHeight:  1.65,
          whiteSpace:  'pre-wrap',
          boxShadow:   '0 4px 16px rgba(0,0,0,0.4)',
          pointerEvents: 'none',
        }}>
          {text}
        </div>
      )}
    </div>
  )
}

function Row({ sig }: { sig: DcaIndicatorSignal }) {
  const [open, setOpen] = useState(false)
  const color = IMPACT_COLOR[sig.impact]
  const bg    = IMPACT_BG[sig.impact]
  const icon  = SCORE_ICON[sig.impact]

  return (
    <>
      <div
        onClick={() => setOpen(v => !v)}
        style={{
          display:          'grid',
          gridTemplateColumns: '1fr 100px 60px 120px',
          padding:          '12px 24px',
          borderBottom:     '1px solid var(--border-dim)',
          gap:              '12px',
          cursor:           'pointer',
          alignItems:       'center',
          transition:       'background 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text)', fontWeight: 500 }}>
            {sig.name}
          </span>
          {INDICATOR_WHAT[sig.name] && (
            <InlineTooltip text={INDICATOR_WHAT[sig.name]} />
          )}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          {sig.group}
        </div>
        <div style={{
          fontSize:   '12px',
          color,
          fontFamily: "'Courier New', monospace",
          fontWeight: 600,
        }}>
          {icon} {sig.score > 0 ? `+${sig.score}` : sig.score}
        </div>
        <div style={{
          padding:      '3px 10px',
          background:   bg,
          borderRadius: '4px',
          fontSize:     '11px',
          color,
          fontWeight:   500,
          display:      'inline-block',
          width:        'fit-content',
        }}>
          {sig.impactLabel}
        </div>
      </div>
      {open && (
        <div style={{
          padding:      '14px 24px 16px',
          background:   'var(--surface2)',
          borderBottom: '1px solid var(--border-dim)',
          display:      'flex',
          flexDirection: 'column',
          gap:          '10px',
        }}>
          {INDICATOR_WHAT[sig.name] && (
            <div>
              <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
                O que é
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.65 }}>
                {INDICATOR_WHAT[sig.name]}
              </p>
            </div>
          )}
          {sig.summary && sig.summary !== 'indisponível' && (
            <div>
              <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
                Leitura atual
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-sec)', lineHeight: 1.65 }}>
                {sig.summary}
              </p>
            </div>
          )}
        </div>
      )}
    </>
  )
}
