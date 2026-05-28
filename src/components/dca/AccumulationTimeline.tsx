'use client'
import { useState } from 'react'

interface RecEntry {
  id:                     string
  action:                 string
  recommended_amount_brl: number | null
  reserve_amount_brl:     number | null
  rationale:              string
  created_at?:            string
}

interface Props { recs: RecEntry[] }

const ACTION_LABEL: Record<string, string> = {
  WAIT:           'Aguardar',
  REDUCED_DCA:    'Aporte reduzido',
  NORMAL_DCA:     'Aporte regular',
  REINFORCED_DCA: 'Aporte reforçado',
  AGGRESSIVE_DCA: 'Aporte máximo',
}

const ACTION_COLOR: Record<string, string> = {
  WAIT:           '#f87171',
  REDUCED_DCA:    '#fbbf24',
  NORMAL_DCA:     '#94a3b8',
  REINFORCED_DCA: '#86efac',
  AGGRESSIVE_DCA: '#4ade80',
}

const fmt = (n: number | null) =>
  n === null
    ? '—'
    : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n)

function fmtDate(s?: string) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export default function AccumulationTimeline({ recs }: Props) {
  const [visible, setVisible] = useState(8)
  if (recs.length === 0) return null

  const shown = recs.slice(0, visible)

  return (
    <div>
      <div style={{
        fontSize:      '10px',
        fontWeight:    700,
        color:         'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '2px',
        marginBottom:  '16px',
      }}>
        Histórico
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {shown.map((rec, i) => {
          const color  = ACTION_COLOR[rec.action] ?? '#94a3b8'
          const label  = ACTION_LABEL[rec.action] ?? rec.action
          const isLast = i === shown.length - 1
          return (
            <div
              key={rec.id}
              style={{
                display:             'grid',
                gridTemplateColumns: '52px 1fr auto',
                gap:                 '16px',
                padding:             '14px 0',
                borderBottom:        isLast ? 'none' : '1px solid rgba(255,255,255,0.04)',
                alignItems:          'start',
              }}
            >
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', paddingTop: '3px' }}>
                {fmtDate(rec.created_at)}
              </span>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <div style={{
                    width:     '6px',
                    height:    '6px',
                    borderRadius: '50%',
                    background: color,
                    flexShrink: 0,
                    marginTop:  '1px',
                  }} />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{label}</span>
                </div>
                {rec.rationale && (
                  <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.6, paddingLeft: '14px' }}>
                    {rec.rationale.length > 90 ? rec.rationale.slice(0, 90) + '…' : rec.rationale}
                  </p>
                )}
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
                  {fmt(rec.recommended_amount_brl)}
                </div>
                {rec.reserve_amount_brl ? (
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    +{fmt(rec.reserve_amount_brl)} reservado
                  </div>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
      {recs.length > visible && (
        <button
          onClick={() => setVisible(v => v + 8)}
          style={{
            marginTop:    '16px',
            width:        '100%',
            background:   'none',
            border:       '1px solid rgba(255,255,255,0.08)',
            borderRadius: '8px',
            padding:      '8px 16px',
            fontSize:     '12px',
            color:        'var(--text-muted)',
            cursor:       'pointer',
          }}
        >
          Ver mais ({recs.length - visible} restantes)
        </button>
      )}
    </div>
  )
}
