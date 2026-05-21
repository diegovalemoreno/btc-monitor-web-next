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

const ACTION_META: Record<DcaAction, { label: string; color: string; bg: string; desc: string }> = {
  WAIT:           { label: 'Aguardar',           color: '#FF1744', bg: 'rgba(255,23,68,0.1)',    desc: 'Não aportar agora' },
  REDUCED_DCA:    { label: 'DCA Reduzido',        color: '#FF6D00', bg: 'rgba(255,109,0,0.1)',   desc: 'Aporte mínimo' },
  NORMAL_DCA:     { label: 'DCA Normal',          color: '#FFD600', bg: 'rgba(255,214,0,0.1)',   desc: 'Cadência regular' },
  REINFORCED_DCA: { label: 'DCA Reforçado',       color: '#69F0AE', bg: 'rgba(105,240,174,0.1)', desc: 'Aumentar aporte' },
  AGGRESSIVE_DCA: { label: 'DCA Agressivo',       color: '#00C853', bg: 'rgba(0,200,83,0.1)',    desc: 'Aporte máximo' },
}

const CONFIDENCE_META: Record<Confidence, { label: string; color: string }> = {
  LOW:    { label: 'Convicção baixa',   color: '#5a5040' },
  MEDIUM: { label: 'Convicção média',   color: '#b0a090' },
  HIGH:   { label: 'Convicção alta',    color: '#e08a3a' },
}

function formatBRL(n: number | null): string {
  if (n === null) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.min(100, Math.max(0, value))
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <span style={{ fontSize: '11px', color: '#5a5040', width: '90px', flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, background: '#1e1e1e', borderRadius: '3px', height: '5px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '5px', background: color, borderRadius: '3px' }} />
      </div>
      <span style={{ fontSize: '11px', color: '#b0a090', width: '28px', textAlign: 'right' }}>{value}</span>
    </div>
  )
}

export default function RecommendationCard({ rec }: { rec: RecommendationData }) {
  const action = (rec.action as DcaAction) in ACTION_META ? (rec.action as DcaAction) : 'NORMAL_DCA'
  const meta   = ACTION_META[action]
  const conf   = CONFIDENCE_META[(rec.confidence as Confidence)] ?? CONFIDENCE_META.MEDIUM
  const ctx    = rec.context ?? {}

  return (
    <div style={{ background: '#111111', border: `1px solid ${meta.color}33`, borderRadius: '12px', overflow: 'hidden', marginBottom: '40px' }}>

      {/* Action header */}
      <div style={{ padding: '24px', background: meta.bg, borderBottom: `1px solid ${meta.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: meta.color, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '4px' }}>
            Recomendação atual
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: meta.color }}>{meta.label}</div>
          <div style={{ fontSize: '12px', color: '#b0a090', marginTop: '2px' }}>{meta.desc}</div>
        </div>
        <div style={{
          padding:      '4px 12px',
          background:   '#0a0a0a',
          border:       `1px solid ${meta.color}44`,
          borderRadius: '6px',
          fontSize:     '11px',
          color:        conf.color,
          fontWeight:   500,
        }}>
          {conf.label}
        </div>
      </div>

      {/* Amounts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid rgba(224,138,58,0.07)' }}>
        <div style={{ padding: '20px 24px', borderRight: '1px solid rgba(224,138,58,0.07)' }}>
          <div style={{ fontSize: '11px', color: '#5a5040', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Aportar agora</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#e8e0d5' }}>{formatBRL(rec.recommended_amount_brl)}</div>
        </div>
        <div style={{ padding: '20px 24px' }}>
          <div style={{ fontSize: '11px', color: '#5a5040', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Manter em reserva</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#b0a090' }}>{formatBRL(rec.reserve_amount_brl)}</div>
        </div>
      </div>

      {/* Rationale */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(224,138,58,0.07)' }}>
        <div style={{ fontSize: '11px', color: '#5a5040', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Racional</div>
        <p style={{ margin: 0, fontSize: '13px', color: '#b0a090', lineHeight: 1.7 }}>{rec.rationale}</p>
      </div>

      {/* Context scores */}
      {(ctx.opportunityScore !== undefined || ctx.riskScore !== undefined) && (
        <div style={{ padding: '20px 24px' }}>
          <div style={{ fontSize: '11px', color: '#5a5040', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Contexto de mercado</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <ScoreBar label="Oportunidade" value={Number(ctx.opportunityScore ?? 0)} color="#00C853" />
            <ScoreBar label="Risco"        value={Number(ctx.riskScore        ?? 0)} color="#FF6D00" />
            <ScoreBar label="Convicção"    value={Number(ctx.convictionScore  ?? 0)} color="#e08a3a" />
          </div>
        </div>
      )}

    </div>
  )
}
