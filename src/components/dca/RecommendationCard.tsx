import type { DcaAction, Confidence } from '@/lib/db/types'

export interface RecommendationData {
  action:                 string
  recommended_amount_brl: number | null
  reserve_amount_brl:     number | null
  confidence:             string
  rationale:              string
  context:                Record<string, unknown> | null
  created_at?:            string
}

const ACTION_META: Record<DcaAction, { label: string; desc: string; color: string; glow: string }> = {
  WAIT:           { label: 'Aguardar',       desc: 'Não aportar agora',         color: '#f87171', glow: 'rgba(248,113,113,0.12)' },
  REDUCED_DCA:    { label: 'DCA Reduzido',   desc: 'Aporte mínimo recomendado', color: '#fb923c', glow: 'rgba(251,146,60,0.12)'  },
  NORMAL_DCA:     { label: 'DCA Normal',     desc: 'Cadência regular de aporte', color: '#fbbf24', glow: 'rgba(251,191,36,0.10)'  },
  REINFORCED_DCA: { label: 'DCA Reforçado',  desc: 'Aporte reforçado recomendado', color: '#86efac', glow: 'rgba(134,239,172,0.10)' },
  AGGRESSIVE_DCA: { label: 'DCA Agressivo',  desc: 'Aporte máximo recomendado', color: '#4ade80', glow: 'rgba(74,222,128,0.10)' },
}

const CONFIDENCE_META: Record<Confidence, { label: string }> = {
  LOW:    { label: 'Convicção baixa'  },
  MEDIUM: { label: 'Convicção média'  },
  HIGH:   { label: 'Convicção alta'   },
}

const fmt0 = (n: number | null) =>
  n === null ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n)

function fmtDateTime(iso?: string) {
  if (!iso) return null
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

function ConvictionBar({ score, color }: { score: number; color: string }) {
  const pct = Math.min(100, Math.max(0, score))
  return (
    <div style={{ height: '8px', background: 'var(--surface3)', borderRadius: '4px', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '4px' }} />
    </div>
  )
}

function ContextBar({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.min(100, Math.max(0, value))
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <span style={{ fontSize: '11px', color: 'var(--text-sec)', width: '95px', flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: '5px', background: 'var(--surface2)', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '3px' }} />
      </div>
      <span style={{ fontSize: '12px', color: 'var(--text)', width: '28px', textAlign: 'right', flexShrink: 0, fontWeight: 600 }}>{value}</span>
    </div>
  )
}

export default function RecommendationCard({ rec }: { rec: RecommendationData }) {
  const action = (rec.action as DcaAction) in ACTION_META ? (rec.action as DcaAction) : 'NORMAL_DCA'
  const meta   = ACTION_META[action]
  const conf   = CONFIDENCE_META[(rec.confidence as Confidence)] ?? CONFIDENCE_META.MEDIUM
  const ctx    = rec.context ?? {}

  const convictionScore = typeof ctx.convictionScore === 'number'
    ? ctx.convictionScore
    : rec.confidence === 'HIGH' ? 80 : rec.confidence === 'MEDIUM' ? 55 : 25

  const oppScore  = typeof ctx.opportunityScore === 'number' ? ctx.opportunityScore : null
  const riskScore = typeof ctx.riskScore        === 'number' ? ctx.riskScore        : null
  const hasCtx    = oppScore !== null || riskScore !== null

  return (
    <div style={{
      background:   'var(--surface2)',
      border:       `1px solid ${meta.color}28`,
      borderLeft:   `3px solid ${meta.color}`,
      borderRadius: '16px',
      overflow:     'hidden',
    }}>

      {/* Top accent */}
      <div style={{
        background: meta.glow,
        borderBottom: `1px solid ${meta.color}1a`,
        padding: '20px 24px',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase',
            letterSpacing: '2px', fontWeight: 700, marginBottom: '8px',
          }}>
            Recomendação atual
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: meta.color, letterSpacing: '-0.5px', lineHeight: 1, marginBottom: '4px' }}>
            {meta.label}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-sec)' }}>{meta.desc}</div>
        </div>

        {/* Conviction badge */}
        <div style={{
          padding:      '5px 12px',
          background:   'var(--surface3)',
          border:       `1px solid ${meta.color}30`,
          borderRadius: '8px',
          fontSize:     '11px',
          color:        meta.color,
          fontWeight:   600,
          flexShrink:   0,
          alignSelf:    'flex-start',
        }}>
          {conf.label}
        </div>
      </div>

      {/* Conviction bar */}
      <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-sec)', textTransform: 'uppercase', letterSpacing: '1px' }}>Convicção</span>
          <span style={{ fontSize: '18px', fontWeight: 800, color: meta.color }}>{convictionScore}<span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>/100</span></span>
        </div>
        <ConvictionBar score={convictionScore} color={meta.color} />
      </div>

      {/* Amounts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ padding: '18px 24px', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '8px', fontWeight: 700 }}>
            Aportar agora
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.5px' }}>
            {fmt0(rec.recommended_amount_brl)}
          </div>
        </div>
        <div style={{ padding: '18px 24px' }}>
          <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '8px', fontWeight: 700 }}>
            Manter em reserva
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-sec)', letterSpacing: '-0.5px' }}>
            {fmt0(rec.reserve_amount_brl)}
          </div>
        </div>
      </div>

      {/* Rationale */}
      <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '8px', fontWeight: 700 }}>
          Racional
        </div>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text)', lineHeight: 1.7 }}>{rec.rationale}</p>
      </div>

      {/* Market context */}
      {hasCtx && (
        <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '12px', fontWeight: 700 }}>
            Contexto de mercado
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
            {oppScore  !== null && <ContextBar label="Oportunidade" value={oppScore}         color="#4ade80" />}
            {riskScore !== null && <ContextBar label="Risco"        value={riskScore}        color="#f87171" />}
            <ContextBar label="Convicção"    value={convictionScore}    color={meta.color}  />
          </div>
          {/* Legend */}
          <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
            {[
              { label: '≥ 70 Favorável',  color: '#4ade80' },
              { label: '40–70 Neutro',    color: '#fbbf24' },
              { label: '< 40 Desfavorável', color: '#f87171' },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: l.color, display: 'inline-block', flexShrink: 0 }} />
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      {rec.created_at && (
        <div style={{ padding: '12px 24px', display: 'flex', justifyContent: 'flex-end' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
            Última atualização: {fmtDateTime(rec.created_at)}
          </span>
        </div>
      )}
    </div>
  )
}
