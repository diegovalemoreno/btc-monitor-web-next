'use client'

import type { WhyNowItem } from '@/lib/dca/why-now'

interface Props { items: WhyNowItem[] }

export default function DcaWhyNow({ items }: Props) {
  if (items.length === 0) return null

  return (
    <div style={{
      background:   'var(--surface)',
      border:       '1px solid var(--border)',
      borderRadius: '12px',
      overflow:     'hidden',
      marginBottom: '16px',
    }}>
      <div style={{ padding: '20px 28px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
          Por que este momento?
        </div>
      </div>

      {items.map((item, idx) => {
        const color = item.isPositive ? '#84cc16' : '#f97316'
        return (
          <div key={item.indicatorName} style={{
            padding:      '20px 28px',
            borderBottom: idx < items.length - 1 ? '1px solid var(--border-dim)' : 'none',
            display:      'flex',
            gap:          '16px',
            alignItems:   'flex-start',
          }}>
            <div style={{
              fontSize:      'clamp(18px, 4vw, 28px)',
              fontWeight:    900,
              color,
              letterSpacing: '-1px',
              flexShrink:    0,
              minWidth:      '60px',
              lineHeight:    1,
              paddingTop:    '2px',
            }}>
              {item.currentValue}
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
                {item.indicatorName}
              </div>
              <div style={{ fontSize: '14px', color: 'var(--text-sec)', lineHeight: 1.5 }}>
                {item.narrative}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
