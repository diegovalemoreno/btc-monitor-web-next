import type { AlertEventRow } from '@/lib/db/types'

const SEVERITY_COLOR: Record<string, string> = {
  LOW:      'var(--text-sec)',
  MEDIUM:   '#FFD600',
  HIGH:     '#FF6D00',
  CRITICAL: '#FF1744',
}

const SEVERITY_LABEL: Record<string, string> = {
  LOW:      'Baixa',
  MEDIUM:   'Média',
  HIGH:     'Alta',
  CRITICAL: 'Crítica',
}

const TYPE_LABEL: Record<string, string> = {
  TACTICAL_OPPORTUNITY:   'Oportunidade tática',
  AGGRESSIVE_OPPORTUNITY: 'Oportunidade agressiva',
  HIGH_RISK:              'Risco elevado',
  EUPHORIA_WARNING:       'Alerta de euforia',
  CAPITULATION_SIGNAL:    'Sinal de capitulação',
  DELEVERAGING_SIGNAL:    'Desalavancagem',
  REGIME_CHANGE:          'Mudança de regime',
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

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3_600_000)
  const d = Math.floor(diff / 86_400_000)
  if (h < 1)  return 'há menos de 1h'
  if (h === 1) return 'há 1h'
  if (h < 24)  return `há ${h}h`
  if (d === 1) return 'há 1 dia'
  if (d < 30)  return `há ${d} dias`
  return formatDate(iso)
}

export default function AlertCard({ alert }: { alert: AlertEventRow }) {
  const color     = SEVERITY_COLOR[alert.severity] ?? 'var(--text-sec)'
  const sevLabel  = SEVERITY_LABEL[alert.severity] ?? alert.severity
  const typeLabel = TYPE_LABEL[alert.type] ?? alert.type

  return (
    <div style={{
      padding:      '16px 20px',
      background:   'var(--surface)',
      border:       `1px solid ${color}1a`,
      borderLeft:   `3px solid ${color}`,
      borderRadius: '8px',
    }}>

      {/* Title + severity badge */}
      <div style={{
        display:        'flex',
        alignItems:     'flex-start',
        justifyContent: 'space-between',
        gap:            '12px',
        flexWrap:       'wrap',
        marginBottom:   '4px',
      }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', flex: 1, minWidth: '160px', lineHeight: 1.3 }}>
          {alert.title}
        </span>
        <span style={{
          padding:       '2px 8px',
          background:    `${color}18`,
          border:        `1px solid ${color}44`,
          borderRadius:  '4px',
          fontSize:      '10px',
          fontWeight:    600,
          color,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          flexShrink:    0,
          alignSelf:     'flex-start',
        }}>
          {sevLabel}
        </span>
      </div>

      {/* Type + relative time */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{typeLabel}</span>
        <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>·</span>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }} title={formatDate(alert.created_at)}>
          {relativeTime(alert.created_at)}
        </span>
      </div>

      <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-sec)', lineHeight: 1.65 }}>
        {alert.message}
      </p>

    </div>
  )
}
