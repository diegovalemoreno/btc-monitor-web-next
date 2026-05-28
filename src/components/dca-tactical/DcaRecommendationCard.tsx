'use client'

import type { DcaAllocation } from '@/lib/dca-tactical/types'
import DcaScoreGauge, { STATE_COLOR, STATE_LABEL, STATE_DESC } from './DcaScoreGauge'

const fmt = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n)

interface Props {
  allocation: DcaAllocation
  summary?:   string
}

const PROFILE_LABEL: Record<string, string> = {
  CONSERVATIVE: 'Conservador',
  BALANCED:     'Equilibrado',
  AGGRESSIVE:   'Agressivo',
}

export default function DcaRecommendationCard({ allocation, summary }: Props) {
  const {
    score, marketState, strategyProfile,
    monthlyContribution, structuralDcaAmount,
    tacticalContributionAmount, tacticalReserveAmount,
    remainingTactical,
  } = allocation

  const color      = STATE_COLOR[marketState]
  const noCapital  = remainingTactical <= 0
  const suggestedAmount = Math.min(tacticalContributionAmount, remainingTactical)

  const rationaleText = summary
    ? summary
    : `Score ${score}/100 — estado ${STATE_LABEL[marketState].toLowerCase()}. Alocação calculada com base em indicadores combinados de mercado.`

  const rationaleNote = noCapital
    ? 'Caixa tático do mês já utilizado. Janela registrada para o próximo ciclo.'
    : null

  return (
    <div style={{
      background:   'rgba(255,255,255,0.02)',
      border:       `1px solid ${color}30`,
      borderRadius: '16px',
      overflow:     'hidden',
      boxShadow:    `0 0 60px ${color}12, 0 8px 32px rgba(0,0,0,0.4)`,
    }}>
      {/* Header strip */}
      <div style={{
        padding:        '8px 24px',
        background:     `linear-gradient(90deg, ${color}14 0%, transparent 60%)`,
        borderBottom:   `1px solid ${color}18`,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ fontSize: '10px', fontWeight: 700, color: color, textTransform: 'uppercase', letterSpacing: '2px' }}>
          Recomendação atual · DCA Tático
        </div>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
          Perfil: <span style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>{PROFILE_LABEL[strategyProfile]}</span>
        </div>
      </div>

      {/* Body: gauge | details */}
      <div style={{
        display:             'grid',
        gridTemplateColumns: 'minmax(220px, 280px) 1fr',
        gap:                 0,
      }}>
        {/* Gauge column — dominant visual center */}
        <div style={{
          padding:         '32px 28px',
          borderRight:     `1px solid ${color}18`,
          display:         'flex',
          flexDirection:   'column',
          alignItems:      'center',
          justifyContent:  'center',
          background:      `radial-gradient(ellipse at center, ${color}10 0%, transparent 70%)`,
          gap:             '12px',
        }}>
          <DcaScoreGauge score={score} marketState={marketState} />
        </div>

        {/* Details column */}
        <div style={{ padding: '28px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Primary: suggested tactical now */}
          <div>
            <div style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '6px' }}>
              Aporte tático sugerido agora
            </div>
            <div style={{ fontSize: '36px', fontWeight: 800, color: noCapital ? 'rgba(255,255,255,0.3)' : color, letterSpacing: '-1px', lineHeight: 1 }}>
              {fmt(Math.max(0, suggestedAmount))}
            </div>
          </div>

          {/* Secondary row: structural + reserve */}
          <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '4px' }}>
                DCA estrutural (mês)
              </div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#f59e0b', fontVariantNumeric: 'tabular-nums' }}>
                {fmt(structuralDcaAmount)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '4px' }}>
                Reserva tática
              </div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', fontVariantNumeric: 'tabular-nums' }}>
                {fmt(tacticalReserveAmount)}
              </div>
            </div>
          </div>

          {/* Racional — premium block */}
          <div style={{
            padding:      '14px 16px',
            background:   'rgba(255,255,255,0.03)',
            border:       '1px solid rgba(255,255,255,0.07)',
            borderLeft:   `3px solid ${color}60`,
            borderRadius: '8px',
          }}>
            <div style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px' }}>
              Racional
            </div>
            <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.7 }}>
              {rationaleText}
            </p>
            {rationaleNote && (
              <p style={{
                margin:     '10px 0 0',
                fontSize:   '11px',
                color:      'rgba(245,158,11,0.7)',
                lineHeight: 1.6,
                paddingTop: '10px',
                borderTop:  '1px solid rgba(255,255,255,0.06)',
              }}>
                {rationaleNote}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Footer: total + CTA */}
      <div style={{
        padding:        '14px 28px',
        borderTop:      `1px solid ${color}18`,
        background:     'rgba(0,0,0,0.2)',
        display:        'flex',
        alignItems:     'center',
        gap:            '16px',
        flexWrap:       'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>Total planejado:</span>
          <span style={{ fontSize: '14px', fontWeight: 700, color: 'rgba(255,255,255,0.7)', fontVariantNumeric: 'tabular-nums' }}>
            {fmt(monthlyContribution)}
          </span>
        </div>
        <a
          href="/lancamento"
          style={{
            marginLeft:     'auto',
            padding:        '9px 22px',
            background:     color,
            color:          '#000',
            borderRadius:   '8px',
            fontSize:       '13px',
            fontWeight:     700,
            textDecoration: 'none',
            flexShrink:     0,
            letterSpacing:  '0.02em',
          }}
        >
          Ir para lançamentos →
        </a>
      </div>
    </div>
  )
}
