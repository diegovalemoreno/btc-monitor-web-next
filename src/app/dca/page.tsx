import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDcaPlan } from '@/repositories/dca-plans'
import { getLatestRecommendation, insertDcaRecommendation } from '@/repositories/dca-recommendations'
import { getCurrentMarketData } from '@/services/market-data'
import { getOrCreateDcaRecommendation } from '@/services/dca'
import { getServiceClient } from '@/lib/supabase/service'
import AppNav from '@/components/shared/AppNav'

export const metadata = { title: 'DCA — BTC Monitor' }

const ACTION_META: Record<string, { label: string; color: string }> = {
  AGGRESSIVE_DCA: { label: 'Excepcional', color: '#4ade80' },
  REINFORCED_DCA: { label: 'Favorável',   color: '#86efac' },
  NORMAL_DCA:     { label: 'Neutro',      color: '#94a3b8' },
  REDUCED_DCA:    { label: 'Cauteloso',   color: '#fbbf24' },
  WAIT:           { label: 'Em cautela',  color: '#f87171' },
}

const CONF_LABEL: Record<string, string> = { HIGH: 'Alta', MEDIUM: 'Média', LOW: 'Baixa' }
const CONF_COLOR: Record<string, string> = { HIGH: '#4ade80', MEDIUM: '#fbbf24', LOW: '#f87171' }

const fmt0 = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n)

export default async function DcaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const avatarUrl = (user.user_metadata?.avatar_url ?? null) as string | null
  const plan      = await getDcaPlan(supabase, user.id)
  const latestRec = plan ? await getLatestRecommendation(supabase, user.id) : null

  let displayRec = latestRec
  if (plan && latestRec && plan.updated_at > latestRec.created_at) {
    try {
      const { signal, snapshot } = await getCurrentMarketData()
      const fresh = await getOrCreateDcaRecommendation(signal, plan, snapshot?.id ?? null)
      displayRec = await insertDcaRecommendation(getServiceClient(), fresh)
    } catch { /* non-fatal — fallback to stale */ }
  }

  const monthly    = plan?.monthly_amount_brl ?? 0
  const investNow  = displayRec?.recommended_amount_brl ?? null
  const reserve    = displayRec?.reserve_amount_brl ?? null
  const rationale  = displayRec?.rationale ?? ''
  const action     = displayRec?.action ?? 'NORMAL_DCA'
  const conf       = displayRec?.confidence ?? 'MEDIUM'
  const ctx        = (displayRec?.context ?? {}) as Record<string, unknown>
  const score      = typeof ctx.opportunityScore === 'number' ? ctx.opportunityScore : null

  const actionMeta = ACTION_META[action] ?? ACTION_META.NORMAL_DCA
  const confLabel  = CONF_LABEL[conf] ?? 'Média'
  const confColor  = CONF_COLOR[conf] ?? '#fbbf24'
  const investPct  = monthly > 0 && investNow !== null ? Math.round((investNow / monthly) * 100) : null
  const reservePct = monthly > 0 && reserve   !== null ? Math.round((reserve   / monthly) * 100) : null

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      <AppNav userEmail={user.email ?? ''} userAvatarUrl={avatarUrl} />

      <main style={{ padding: '32px 24px' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>

        <div style={{ marginBottom: '36px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.15em', color: 'var(--orange)', textTransform: 'uppercase', marginBottom: '6px' }}>
            Acumulação inteligente
          </div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700 }}>DCA</h1>
          <p style={{ margin: '8px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
            Orientação de aporte baseada em contexto de mercado — não em previsão de preço.
          </p>
        </div>

        {!plan ? (
          <div style={{ padding: '24px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>
            Configure seu plano em{' '}
            <a href="/settings" style={{ color: 'var(--orange)', textDecoration: 'none', fontWeight: 600 }}>Configurações</a>
            {' '}para receber recomendações de aporte.
          </div>
        ) : !displayRec ? (
          <div style={{ padding: '24px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>
            Gerando recomendação…
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '720px' }}>

            {/* Context line */}
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Plano mensal:{' '}
              <strong style={{ color: 'var(--text)', fontFamily: "'Courier New', monospace" }}>
                {fmt0(monthly)}
              </strong>
            </div>

            {/* Split — two cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

              <div style={{
                padding:      '28px 24px',
                background:   'var(--surface)',
                border:       '1px solid var(--border)',
                borderLeft:   '4px solid var(--orange)',
                borderRadius: '14px',
              }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px' }}>
                  Aportar agora
                </div>
                <div style={{ fontSize: '34px', fontWeight: 800, color: 'var(--orange)', fontFamily: "'Courier New', monospace", letterSpacing: '-1px', lineHeight: 1, marginBottom: '8px' }}>
                  {investNow !== null ? fmt0(investNow) : '—'}
                </div>
                {investPct !== null && (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{investPct}% do plano mensal</div>
                )}
              </div>

              <div style={{
                padding:      '28px 24px',
                background:   'var(--surface)',
                border:       '1px solid var(--border)',
                borderLeft:   '4px solid var(--border-strong)',
                borderRadius: '14px',
              }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px' }}>
                  Manter em reserva
                </div>
                <div style={{ fontSize: '34px', fontWeight: 800, color: 'var(--text-sec)', fontFamily: "'Courier New', monospace", letterSpacing: '-1px', lineHeight: 1, marginBottom: '8px' }}>
                  {reserve !== null ? fmt0(reserve) : '—'}
                </div>
                {reservePct !== null && (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{reservePct}% aguardando oportunidade tática</div>
                )}
              </div>

            </div>

            {/* 3 indicator pills */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {score !== null && (
                <Pill
                  label="Score"
                  value={`${score}/100`}
                  color={score >= 70 ? '#4ade80' : score >= 40 ? '#fbbf24' : '#f87171'}
                />
              )}
              <Pill label="Mercado"    value={actionMeta.label} color={actionMeta.color} />
              <Pill label="Convicção"  value={confLabel}        color={confColor} />
            </div>

            {/* Rationale */}
            {rationale && (
              <div style={{
                padding:      '16px 20px',
                background:   'var(--surface)',
                border:       '1px solid var(--border-dim)',
                borderRadius: '10px',
                fontSize:     '13px',
                color:        'var(--text-sec)',
                lineHeight:   1.65,
              }}>
                {rationale}
              </div>
            )}

          </div>
        )}

      </div>
      </main>
    </div>
  )
}

function Pill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      padding:      '8px 16px',
      background:   `${color}12`,
      border:       `1px solid ${color}38`,
      borderRadius: '20px',
      display:      'flex',
      alignItems:   'center',
      gap:          '7px',
    }}>
      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontSize: '13px', fontWeight: 700, color, fontFamily: "'Courier New', monospace" }}>{value}</span>
    </div>
  )
}
