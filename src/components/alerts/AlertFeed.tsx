import type { AlertEventRow } from '@/lib/db/types'
import AlertCard from './AlertCard'

export default function AlertFeed({ alerts }: { alerts: AlertEventRow[] }) {
  return (
    <section>
      <h2 style={{ fontSize: '13px', fontWeight: 600, color: '#5a5040', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 16px' }}>
        Histórico de alertas
      </h2>

      {alerts.length === 0 ? (
        <div style={{
          padding:      '48px 24px',
          textAlign:    'center',
          background:   '#111111',
          border:       '1px solid rgba(224,138,58,0.07)',
          borderRadius: '12px',
        }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔔</div>
          <p style={{ margin: 0, fontSize: '14px', color: '#5a5040' }}>
            Nenhum alerta ainda. Os alertas aparecem aqui quando o mercado atingir os critérios configurados.
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
