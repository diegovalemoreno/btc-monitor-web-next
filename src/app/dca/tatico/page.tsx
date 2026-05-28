import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDcaPlan } from '@/repositories/dca-plans'
import { getLatestRecommendation } from '@/repositories/dca-recommendations'
import { getCurrentMarketData } from '@/services/market-data'
import { getOrCreateDcaRecommendation } from '@/services/dca'
import { insertDcaRecommendation } from '@/repositories/dca-recommendations'
import { getServiceClient } from '@/lib/supabase/service'
import AppNav from '@/components/shared/AppNav'
import AccumulationHero from '@/components/dca/AccumulationHero'
import DcaTacticalPage from '@/components/dca-tactical/DcaTacticalPage'

export const metadata = { title: 'DCA Tático — BTC Monitor' }

const ACTION_HERO: Record<string, { label: string; color: string }> = {
  AGGRESSIVE_DCA: { label: 'Excepcional', color: '#4ade80' },
  REINFORCED_DCA: { label: 'Favorável',   color: '#86efac' },
  NORMAL_DCA:     { label: 'Neutro',      color: '#94a3b8' },
  REDUCED_DCA:    { label: 'Cauteloso',   color: '#fbbf24' },
  WAIT:           { label: 'Em cautela',  color: '#f87171' },
}

const CONF_LABEL: Record<string, string> = { HIGH: 'Alta', MEDIUM: 'Média', LOW: 'Baixa' }
const CONF_COLOR: Record<string, string> = { HIGH: '#4ade80', MEDIUM: '#fbbf24', LOW: '#f87171' }

export default async function DcaTaticoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const avatarUrl = (user.user_metadata?.avatar_url ?? null) as string | null

  const plan = await getDcaPlan(supabase, user.id)

  const latestRec = plan ? await getLatestRecommendation(supabase, user.id) : null

  let displayRec = latestRec
  if (plan && latestRec && plan.updated_at > latestRec.created_at) {
    try {
      const { signal, snapshot } = await getCurrentMarketData()
      const fresh = await getOrCreateDcaRecommendation(signal, plan, snapshot?.id ?? null)
      displayRec = await insertDcaRecommendation(getServiceClient(), fresh)
    } catch { /* non-fatal */ }
  }

  let heroMeta        = ACTION_HERO.NORMAL_DCA
  let heroSuggest: number | null = null
  let heroReserve: number | null = null
  let heroExplanation = ''
  let confLabel = 'Média'
  let confColor = '#fbbf24'
  let oppScore:  number | null = null
  let riskScore: number | null = null

  if (displayRec) {
    heroMeta        = ACTION_HERO[displayRec.action] ?? ACTION_HERO.NORMAL_DCA
    heroSuggest     = displayRec.recommended_amount_brl
    heroReserve     = displayRec.reserve_amount_brl
    heroExplanation = displayRec.rationale
    confLabel       = CONF_LABEL[displayRec.confidence] ?? 'Média'
    confColor       = CONF_COLOR[displayRec.confidence] ?? '#fbbf24'
    const ctx = (displayRec.context ?? {}) as Record<string, unknown>
    oppScore  = typeof ctx.opportunityScore === 'number' ? ctx.opportunityScore : null
    riskScore = typeof ctx.riskScore        === 'number' ? ctx.riskScore        : null
  }

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      <AppNav userEmail={user.email ?? ''} userAvatarUrl={avatarUrl} />

      <main style={{ padding: '32px 24px' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>

        <div style={{ marginBottom: '32px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.15em', color: 'var(--orange)', textTransform: 'uppercase', marginBottom: '6px' }}>
            Acumulação inteligente
          </div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700 }}>DCA Tático</h1>
          <p style={{ margin: '8px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
            Análise de oportunidades táticas — momentos excepcionais para acelerar aportes.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Plano de acumulação — contexto estratégico */}
          {displayRec && (
            <AccumulationHero
              label="Plano de acumulação"
              monthlyAmount={plan?.monthly_amount_brl ?? 0}
              suggestAmount={heroSuggest}
              reserveAmount={heroReserve}
              marketLabel={heroMeta.label}
              marketColor={heroMeta.color}
              explanation={heroExplanation}
            >
              <div style={{ padding: '20px 24px', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '6px' }}>Convicção</div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: confColor }}>{confLabel}</span>
                </div>
                {oppScore !== null && (
                  <div>
                    <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '6px' }}>Oportunidade</div>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: oppScore >= 70 ? '#4ade80' : oppScore >= 40 ? '#fbbf24' : '#f87171' }}>{oppScore}/100</span>
                  </div>
                )}
                {riskScore !== null && (
                  <div>
                    <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '6px' }}>Risco</div>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: riskScore < 30 ? '#4ade80' : riskScore < 60 ? '#fbbf24' : '#f87171' }}>{riskScore}/100</span>
                  </div>
                )}
              </div>
            </AccumulationHero>
          )}

          {/* Análise tática */}
          <DcaTacticalPage plan={plan} />
        </div>

      </div>
      </main>
    </div>
  )
}
