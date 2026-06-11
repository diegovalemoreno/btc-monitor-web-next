'use client'

import type { WhyNowItem } from '@/lib/dca/why-now'

const IMPACT_COLOR: Record<string, string> = {
  '2':  '#22c55e',
  '1':  '#84cc16',
  '0':  '#71717a',
  '-1': '#f97316',
  '-2': '#ef4444',
}

const DOT_SPECS = [
  { level: -2, color: '#ef4444' },
  { level: -1, color: '#f97316' },
  { level:  0, color: '#71717a' },
  { level:  1, color: '#84cc16' },
  { level:  2, color: '#22c55e' },
]

interface Props { items: WhyNowItem[] }

export default function DcaWhyNow({ items }: Props) {
  if (items.length === 0) return null

  return (
    <div style={{
      background:   'var(--surface)',
      border:       '1px solid var(--border)',
      borderRadius: '12px',
      overflow:     'hidden',
    }}>
      <div style={{ padding: '20px 32px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
          Por que este momento?
        </div>
      </div>

      {items.map((item, idx) => {
        const dotLevel   = Math.max(-2, Math.min(2, Math.round(item.score)))
        const color      = IMPACT_COLOR[String(dotLevel)] ?? '#71717a'
        const sign       = item.score > 0 ? '+' : ''
        const absScore   = Math.abs(Math.round(item.score))
        const scoreSuffix = absScore !== 1 ? 'pontos' : 'ponto'
        const isLast     = idx === items.length - 1

        return (
          <div
            key={item.indicatorName}
            style={{
              display:             'grid',
              gridTemplateColumns: '1fr auto',
              alignItems:          'start',
              gap:                 '20px',
              padding:             '24px 32px',
              borderBottom:        isLast ? 'none' : '1px solid var(--border)',
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.015)')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
          >
            {/* Left */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.9px', marginBottom: '7px' }}>
                {item.indicatorName}
              </div>
              <div style={{ fontSize: '15px', fontWeight: 700, color, marginBottom: '8px', lineHeight: 1.2 }}>
                {item.statusLabel}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: '520px' }}>
                {item.description}
              </div>
            </div>

            {/* Right */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px', flexShrink: 0 }}>
              <div style={{
                fontSize:           item.currentValue.length > 6 ? '22px' : '36px',
                fontWeight:         900,
                letterSpacing:      '-1.5px',
                color,
                lineHeight:         1,
                fontVariantNumeric: 'tabular-nums',
                textAlign:          'right',
                maxWidth:           '130px',
                wordBreak:          'break-all',
              }}>
                {item.currentValue}
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                {DOT_SPECS.map(({ level, color: dc }) => {
                  const active = level === dotLevel
                  return (
                    <div
                      key={level}
                      style={{
                        width:        '12px',
                        height:       '12px',
                        borderRadius: '50%',
                        background:   dc,
                        opacity:      active ? 1 : 0.15,
                        transform:    active ? 'scale(1.35)' : 'scale(1)',
                        boxShadow:    active ? `0 0 9px ${dc}` : 'none',
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
                padding:      '3px 12px',
                borderRadius: '999px',
                border:       `1.5px solid ${color}`,
                color,
                whiteSpace:   'nowrap',
              }}>
                {sign}{Math.round(item.score)} {scoreSuffix}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
