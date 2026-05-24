'use client'

import type { DcaAllocation } from '@/lib/dca-tactical/types'
import DcaScoreGauge, { STATE_COLOR, STATE_LABEL } from './DcaScoreGauge'

const fmt = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

interface Props {
  allocation: DcaAllocation
  summary?:   string
}

export default function DcaRecommendationCard({ allocation, summary }: Props) {
  const {
    score,
    marketState,
    strategyProfile,
    monthlyContribution,
    structuralDcaAmount,
    tacticalContributionAmount,
    tacticalReserveAmount,
  } = allocation

  const color = STATE_COLOR[marketState]

  const PROFILE_LABEL: Record<typeof strategyProfile, string> = {
    CONSERVATIVE: 'Conservador',
    BALANCED:     'Equilibrado',
    AGGRESSIVE:   'Agressivo',
  }

  return (
    <div style={{
      background:   'var(--surface)',
      border:       `1px solid ${color}33`,
      borderRadius: '12px',
      overflow:     'hidden',
      marginBottom: '24px',
    }}>
      {/* Header strip */}
      <div style={{
        padding:      '6px 24px',
        background:   `${color}12`,
        borderBottom: `1px solid ${color}22`,
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
          Recomendação atual · DCA Tático
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          Perfil: <span style={{ color: 'var(--text-sec)', fontWeight: 500 }}>{PROFILE_LABEL[strategyProfile]}</span>
        </div>
      </div>

      {/* Main content */}
      <div style={{
        display:   'grid',
        gridTemplateColumns: 'minmax(200px, 260px) 1fr',
        gap:       '0',
      }}>
        {/* Gauge column */}
        <div style={{
          padding:     '28px 24px',
          borderRight: '1px solid var(--border-dim)',
          display:     'flex',
          alignItems:  'center',
          justifyContent: 'center',
        }}>
          <DcaScoreGauge score={score} marketState={marketState} />
        </div>

        {/* Amounts column */}
        <div style={{ padding: '24px' }}>
          {/* Primary: tactical now */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
              Aporte tático sugerido agora
            </div>
            <div style={{ fontSize: '32px', fontWeight: 700, color, fontFamily: "'Courier New', monospace", lineHeight: 1 }}>
              {fmt(tacticalContributionAmount)}
            </div>
          </div>

          {/* Secondary row: structural + reserve */}
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginBottom: '20px' }}>
            <AmountItem
              label="DCA estrutural"
              value={fmt(structuralDcaAmount)}
              color="var(--orange)"
            />
            <AmountItem
              label="Reserva tática"
              value={fmt(tacticalReserveAmount)}
              color="var(--text-muted)"
            />
          </div>

          {/* Summary / rationale */}
          {summary && (
            <p style={{
              margin:     0,
              fontSize:   '12px',
              color:      'var(--text-sec)',
              lineHeight: 1.65,
              borderTop:  '1px solid var(--border-dim)',
              paddingTop: '16px',
            }}>
              {summary}
            </p>
          )}

          {!summary && (
            <p style={{
              margin:     0,
              fontSize:   '12px',
              color:      'var(--text-muted)',
              lineHeight: 1.65,
              borderTop:  '1px solid var(--border-dim)',
              paddingTop: '16px',
            }}>
              Score {score}/100 — estado {STATE_LABEL[marketState].toLowerCase()}.
              Alocação calculada com base em indicadores de mercado combinados.
            </p>
          )}
        </div>
      </div>

      {/* Total bar */}
      <div style={{
        padding:    '12px 24px',
        borderTop:  '1px solid var(--border-dim)',
        background: 'var(--surface2)',
        display:    'flex',
        alignItems: 'center',
        gap:        '8px',
      }}>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total sugerido agora:</span>
        <span style={{
          fontSize:   '13px',
          fontWeight: 700,
          color:      'var(--text)',
          fontFamily: "'Courier New', monospace",
        }}>
          {fmt(structuralDcaAmount + tacticalContributionAmount)}
        </span>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
          de {fmt(monthlyContribution)} planejados
        </span>
      </div>
    </div>
  )
}

function AmountItem({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '3px' }}>
        {label}
      </div>
      <div style={{ fontSize: '16px', fontWeight: 600, color, fontFamily: "'Courier New', monospace" }}>
        {value}
      </div>
    </div>
  )
}
