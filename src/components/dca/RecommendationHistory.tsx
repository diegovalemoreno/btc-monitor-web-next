import type { DcaRecommendationRow, DcaAction } from '@/lib/db/types'

const ACTION_COLOR: Record<DcaAction, string> = {
  WAIT:           '#FF1744',
  REDUCED_DCA:    '#FF6D00',
  NORMAL_DCA:     '#FFD600',
  REINFORCED_DCA: '#69F0AE',
  AGGRESSIVE_DCA: '#00C853',
}

const ACTION_LABEL: Record<DcaAction, string> = {
  WAIT:           'Aguardar',
  REDUCED_DCA:    'DCA Reduzido',
  NORMAL_DCA:     'DCA Normal',
  REINFORCED_DCA: 'DCA Reforçado',
  AGGRESSIVE_DCA: 'DCA Agressivo',
}

function formatBRL(n: number | null): string {
  if (n === null) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

export default function RecommendationHistory({ recs }: { recs: DcaRecommendationRow[] }) {
  return (
    <section>
      <h2 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 16px' }}>
        Histórico de recomendações
      </h2>

      {recs.length === 0 ? (
        <div style={{ padding: '40px 24px', textAlign: 'center', background: 'var(--surface)', border: '1px solid var(--border-dim)', borderRadius: '12px' }}>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>
            Nenhuma recomendação ainda. Configure seu plano para receber análises diárias.
          </p>
        </div>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border-dim)', borderRadius: '12px', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 120px 120px', padding: '10px 20px', borderBottom: '1px solid var(--border-dim)' }}>
            {['Data', 'Ação', 'Aporte', 'Reserva'].map((h) => (
              <span key={h} style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</span>
            ))}
          </div>

          {recs.map((rec, i) => {
            const action = rec.action as DcaAction
            const color  = ACTION_COLOR[action] ?? 'var(--text-sec)'
            const isLast = i === recs.length - 1
            return (
              <div
                key={rec.id}
                style={{
                  display:     'grid',
                  gridTemplateColumns: '120px 1fr 120px 120px',
                  padding:     '12px 20px',
                  borderBottom: isLast ? 'none' : '1px solid var(--border-dim)',
                  alignItems:  'center',
                }}
              >
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{formatDate(rec.created_at)}</span>
                <span style={{
                  fontSize:   '12px',
                  fontWeight: 600,
                  color,
                  display:    'inline-flex',
                  alignItems: 'center',
                  gap:        '6px',
                }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                  {ACTION_LABEL[action] ?? action}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text)' }}>{formatBRL(rec.recommended_amount_brl)}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-sec)' }}>{formatBRL(rec.reserve_amount_brl)}</span>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
