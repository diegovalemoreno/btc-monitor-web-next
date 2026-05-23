import type { AlertEventRow } from '@/lib/db/types'
import AlertCard from './AlertCard'

const SEV_ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const
const SEV_COLOR: Record<string, string> = {
  CRITICAL: '#FF1744',
  HIGH:     '#FF6D00',
  MEDIUM:   '#FFD600',
  LOW:      '#b0a090',
}
const SEV_LABEL: Record<string, string> = {
  CRITICAL: 'crítico',
  HIGH:     'alto',
  MEDIUM:   'médio',
  LOW:      'baixo',
}

export default function AlertFeed({ alerts }: { alerts: AlertEventRow[] }) {
  const counts = SEV_ORDER.reduce<Record<string, number>>((acc, s) => {
    acc[s] = alerts.filter(a => a.severity === s).length
    return acc
  }, {})

  const activeSev = SEV_ORDER.filter(s => counts[s] > 0)

  return (
    <section style={{ marginBottom: '40px' }}>

      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Histórico de alertas
        </span>
        <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>últimos 30 disparos</span>
      </div>

      {/* Stats strip */}
      {alerts.length > 0 && (
        <div style={{
          display:      'flex',
          alignItems:   'center',
          gap:          '20px',
          padding:      '10px 16px',
          background:   'var(--surface2)',
          border:       '1px solid rgba(224,138,58,0.08)',
          borderRadius: '8px',
          marginBottom: '12px',
          flexWrap:     'wrap',
        }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>
            {alerts.length} {alerts.length === 1 ? 'alerta' : 'alertas'}
          </span>
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            {activeSev.map(s => (
              <span key={s} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{
                  width:        '6px',
                  height:       '6px',
                  borderRadius: '50%',
                  background:   SEV_COLOR[s],
                  display:      'inline-block',
                  flexShrink:   0,
                }} />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {counts[s]} {SEV_LABEL[s]}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* List / empty state */}
      {alerts.length === 0 ? (
        <div style={{
          padding:      '56px 24px',
          textAlign:    'center',
          background:   'var(--surface)',
          border:       '1px solid rgba(224,138,58,0.07)',
          borderRadius: '12px',
        }}>
          <div style={{
            width:        '36px',
            height:       '36px',
            borderRadius: '50%',
            background:   'var(--surface2)',
            border:       '1px solid rgba(224,138,58,0.1)',
            margin:       '0 auto 16px',
            display:      'flex',
            alignItems:   'center',
            justifyContent: 'center',
          }}>
            <span style={{ fontSize: '15px', color: '#3a3a3a', lineHeight: 1 }}>—</span>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>
            Nenhum alerta registrado
          </p>
          <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--text-dim)', lineHeight: 1.6 }}>
            Alertas aparecem aqui quando o mercado atingir os critérios configurados.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {alerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </div>
      )}

    </section>
  )
}
