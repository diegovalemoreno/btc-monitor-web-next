'use client'

import type { TacticalPattern } from '@/lib/dca/tactical-patterns'

interface Props { patterns: TacticalPattern[] }

export default function DcaTacticalAlert({ patterns }: Props) {
  if (patterns.length === 0) return null

  return (
    <div>
      {patterns.map(p => (
        <div key={p.name} style={{
          background:   'rgba(132, 204, 22, 0.06)',
          border:       '1px solid rgba(132, 204, 22, 0.3)',
          borderRadius: '12px',
          padding:      '24px 28px',
          marginBottom: '8px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#84cc16', boxShadow: '0 0 8px #84cc16', flexShrink: 0 }} />
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#84cc16', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Janela Tática Detectada
            </div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
              {p.name}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
            {p.firedConditions.map((c, i) => (
              <div key={i} style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', gap: '8px' }}>
                <span style={{ color: '#84cc16', flexShrink: 0 }}>✓</span>
                {c}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Ocorreu <strong style={{ color: 'var(--text)' }}>{p.occurrences}× desde 2018</strong>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Retorno médio 12m: <strong style={{ color: '#84cc16' }}>+{p.avgReturn12m}%</strong>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
