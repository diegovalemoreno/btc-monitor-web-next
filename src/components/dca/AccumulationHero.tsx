'use client'
import { useState } from 'react'

const fmt = (n: number | null) =>
  n === null || n === undefined
    ? '—'
    : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n)

interface Props {
  label?:        string
  monthlyAmount: number
  suggestAmount: number | null
  reserveAmount: number | null
  marketLabel:   string
  marketColor:   string
  explanation:   string
  children?:     React.ReactNode
}

export default function AccumulationHero({
  label = 'Plano de acumulação',
  monthlyAmount,
  suggestAmount,
  reserveAmount,
  marketLabel,
  marketColor,
  explanation,
  children,
}: Props) {
  const [open, setOpen] = useState(false)
  const noSuggest = suggestAmount === null || suggestAmount <= 0

  return (
    <div style={{
      background:   'var(--surface2)',
      border:       `1px solid ${marketColor}28`,
      borderLeft:   `3px solid ${marketColor}`,
      borderRadius: '16px',
      overflow:     'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding:        '16px 24px',
        borderBottom:   '1px solid rgba(255,255,255,0.05)',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
      }}>
        <span style={{
          fontSize:      '10px',
          fontWeight:    700,
          color:         'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '2px',
        }}>
          {label}
        </span>
        <div style={{
          display:      'flex',
          alignItems:   'center',
          gap:          '6px',
          padding:      '4px 12px',
          background:   `${marketColor}14`,
          border:       `1px solid ${marketColor}28`,
          borderRadius: '20px',
        }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: marketColor }} />
          <span style={{ fontSize: '11px', fontWeight: 600, color: marketColor }}>{marketLabel}</span>
        </div>
      </div>

      {/* Primary numbers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ padding: '28px 24px', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{
            fontSize:      '9px',
            fontWeight:    700,
            color:         'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '1.5px',
            marginBottom:  '12px',
          }}>
            Aportar agora
          </div>
          <div style={{
            fontSize:      '40px',
            fontWeight:    800,
            color:         noSuggest ? 'var(--text-muted)' : marketColor,
            letterSpacing: '-1.5px',
            lineHeight:    1,
          }}>
            {fmt(suggestAmount)}
          </div>
        </div>
        <div style={{ padding: '28px 24px' }}>
          <div style={{
            fontSize:      '9px',
            fontWeight:    700,
            color:         'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '1.5px',
            marginBottom:  '12px',
          }}>
            Manter reservado
          </div>
          <div style={{
            fontSize:      '40px',
            fontWeight:    800,
            color:         'var(--text-sec)',
            letterSpacing: '-1.5px',
            lineHeight:    1,
          }}>
            {fmt(reserveAmount)}
          </div>
        </div>
      </div>

      {/* Explanation */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-sec)', lineHeight: 1.8 }}>
          {explanation || 'Análise baseada em indicadores de mercado atuais.'}
        </p>
      </div>

      {/* Footer */}
      <div style={{
        padding:        '14px 24px',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          Plano mensal:{' '}
          <span style={{ color: 'var(--text)', fontWeight: 600 }}>{fmt(monthlyAmount)}</span>
        </span>
        {children && (
          <button
            onClick={() => setOpen(v => !v)}
            style={{
              background:   'none',
              border:       '1px solid rgba(255,255,255,0.08)',
              borderRadius: '6px',
              padding:      '5px 12px',
              fontSize:     '11px',
              color:        'var(--text-muted)',
              cursor:       'pointer',
              display:      'flex',
              alignItems:   'center',
              gap:          '5px',
            }}
          >
            Entender análise
            <span style={{
              display:    'inline-block',
              transform:  open ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s',
            }}>▾</span>
          </button>
        )}
      </div>

      {/* Accordion */}
      {children && open && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {children}
        </div>
      )}
    </div>
  )
}
