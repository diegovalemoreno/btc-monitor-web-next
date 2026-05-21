import type { AlertEventRow } from '@/lib/db/types'

const SEVERITY_COLOR: Record<string, string> = {
  LOW:      '#b0a090',
  MEDIUM:   '#FFD600',
  HIGH:     '#FF6D00',
  CRITICAL: '#FF1744',
}

const TYPE_ICON: Record<string, string> = {
  TACTICAL_OPPORTUNITY:   '🎯',
  AGGRESSIVE_OPPORTUNITY: '🚀',
  HIGH_RISK:              '⚠️',
  EUPHORIA_WARNING:       '🔴',
  CAPITULATION_SIGNAL:    '📉',
  DELEVERAGING_SIGNAL:    '📊',
  REGIME_CHANGE:          '🔄',
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day:    '2-digit',
    month:  '2-digit',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

export default function AlertCard({ alert }: { alert: AlertEventRow }) {
  const color = SEVERITY_COLOR[alert.severity] ?? '#b0a090'
  const icon  = TYPE_ICON[alert.type] ?? '📌'

  return (
    <div style={{
      padding:      '16px 20px',
      background:   '#111111',
      border:       `1px solid ${color}33`,
      borderLeft:   `3px solid ${color}`,
      borderRadius: '8px',
    }}>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>{icon}</span>
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#e8e0d5' }}>{alert.title}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <span style={{
            padding:         '2px 8px',
            background:      `${color}22`,
            border:          `1px solid ${color}55`,
            borderRadius:    '4px',
            fontSize:        '10px',
            fontWeight:      600,
            color,
            textTransform:   'uppercase',
            letterSpacing:   '0.08em',
          }}>
            {alert.severity}
          </span>
          <span style={{ fontSize: '11px', color: '#5a5040' }}>{formatDate(alert.created_at)}</span>
        </div>
      </div>

      <p style={{ margin: 0, fontSize: '13px', color: '#b0a090', lineHeight: 1.6 }}>
        {alert.message}
      </p>

    </div>
  )
}
