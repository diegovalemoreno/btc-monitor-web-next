'use client'

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

export interface TacticalCardData {
  name:        string
  statusLabel: string
  description: string
  value:       string | null
  dotLevel:    number   // -2 to +2
  score:       number   // raw score for chip label
}

interface Props {
  data:   TacticalCardData
  delay?: number
}

export default function TacticalCard({ data, delay = 0 }: Props) {
  const { name, statusLabel, description, value, dotLevel, score } = data
  const clampedLevel = Math.max(-2, Math.min(2, dotLevel))
  const color = IMPACT_COLOR[String(clampedLevel)] ?? '#71717a'
  const sign  = score > 0 ? '+' : ''

  return (
    <div
      className="ind-card"
      style={{
        display:             'grid',
        gridTemplateColumns: '1fr auto',
        alignItems:          'start',
        gap:                 '20px',
        padding:             '24px 32px',
        borderBottom:        '1px solid var(--border)',
        transition:          'background 0.15s',
        animationName:           'fadeIn',
        animationDuration:       '0.4s',
        animationTimingFunction: 'ease',
        animationDelay:          `${delay}s`,
        animationFillMode:       'both',
      }}
      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--orange-subtle)')}
      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
    >
      {/* Left */}
      <div>
        <div style={{
          fontSize:      '11px',
          fontWeight:    700,
          color:         'var(--text)',
          textTransform: 'uppercase',
          letterSpacing: '0.9px',
          marginBottom:  '7px',
        }}>
          {name}
        </div>
        <div style={{ fontSize: '15px', fontWeight: 700, color, marginBottom: '8px', lineHeight: 1.2 }}>
          {statusLabel}
        </div>
        {description && (
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: '520px' }}>
            {description}
          </div>
        )}
      </div>

      {/* Right */}
      <div className="ind-card-right" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px', flexShrink: 0 }}>
        <div className="ind-card-value" style={{
          fontSize:           value && value.length > 6 ? '22px' : '36px',
          fontWeight:         900,
          letterSpacing:      '-1.5px',
          color,
          lineHeight:         1,
          fontVariantNumeric: 'tabular-nums',
          textAlign:          'right',
          maxWidth:           '130px',
          wordBreak:          'break-all',
        }}>
          {value ?? '—'}
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {DOT_SPECS.map(({ level, color: dc }) => {
            const active = level === clampedLevel
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
          {sign}{Math.round(score)} {Math.abs(Math.round(score)) !== 1 ? 'pontos' : 'ponto'}
        </div>
      </div>
    </div>
  )
}
