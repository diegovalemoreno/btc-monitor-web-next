'use client'

import { useState } from 'react'
import type { DcaIndicatorSignal, DcaImpact } from '@/lib/dca-tactical/types'

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
        <div style={{ fontSize: '13px', color: 'var(--text)', fontWeight: 500 }}>
          {sig.name}
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
          padding:    '12px 24px 14px',
          background: 'var(--surface2)',
          borderBottom: '1px solid var(--border-dim)',
          fontSize:   '12px',
          color:      'var(--text-sec)',
          lineHeight: 1.6,
        }}>
          {sig.summary || '—'}
        </div>
      )}
    </>
  )
}
