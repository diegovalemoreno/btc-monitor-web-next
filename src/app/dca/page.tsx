import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDcaPlan } from '@/repositories/dca-plans'
import { getLatestRecommendation, getRecentRecommendations, insertDcaRecommendation } from '@/repositories/dca-recommendations'
import { getCurrentMarketData } from '@/services/market-data'
import { getOrCreateDcaRecommendation } from '@/services/dca'
import { getServiceClient } from '@/lib/supabase/service'
import AppNav from '@/components/shared/AppNav'
import RecommendationCard from '@/components/dca/RecommendationCard'
import DcaPlanForm from '@/components/dca/DcaPlanForm'
import RecommendationHistory from '@/components/dca/RecommendationHistory'
import DcaTacticalPage from '@/components/dca-tactical/DcaTacticalPage'
import Tooltip from '@/components/shared/Tooltip'

export const metadata = { title: 'DCA — BTC Monitor' }

type SearchParams = Promise<{ tab?: string }>

export default async function DcaPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { tab = 'intelligence' } = await searchParams

  const plan = await getDcaPlan(supabase, user.id)

  const [latestRec, history] = plan
    ? await Promise.all([
        getLatestRecommendation(supabase, user.id),
        getRecentRecommendations(supabase, user.id, 10),
      ])
    : [null, []]

  // If plan was updated after the latest recommendation was generated (e.g. user changed
  // monthly amount), regenerate so the displayed amounts reflect the current plan.
  let displayRec = latestRec
  if (plan && latestRec && plan.updated_at > latestRec.created_at) {
    try {
      const { signal, snapshot } = await getCurrentMarketData()
      const fresh = await getOrCreateDcaRecommendation(signal, plan, snapshot?.id ?? null)
      displayRec = await insertDcaRecommendation(getServiceClient(), fresh)
    } catch {
      // non-fatal — fall back to stale latestRec
    }
  }

  const tabs: Array<{ id: string; label: string; tooltip: string }> = [
    {
      id:      'intelligence',
      label:   'DCA Intelligence',
      tooltip: 'Recomendação diária gerada pelo motor de análise. Sugere ação (aguardar, DCA normal, reforçado ou agressivo) com base no perfil de risco configurado e snapshot de mercado mais recente.',
    },
    {
      id:      'tactical',
      label:   'DCA Tático',
      tooltip: 'Divide seu aporte mensal entre DCA estrutural (recorrência fixa) e caixa tático (capital para janelas favoráveis). Usa indicadores em tempo real para sugerir a intensidade de alocação ideal no momento atual.',
    },
  ]

  const avatarUrl = (user.user_metadata?.avatar_url ?? null) as string | null

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      <AppNav userEmail={user.email ?? ''} userAvatarUrl={avatarUrl} />

      <main style={{ padding: '32px 24px' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.15em', color: 'var(--orange)', textTransform: 'uppercase', marginBottom: '6px' }}>
            Acumulação inteligente
          </div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700 }}>DCA</h1>
          <p style={{ margin: '8px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
            Orientação de aporte baseada em contexto de mercado — não em previsão de preço.
          </p>
        </div>

        {/* Tab switcher */}
        <div style={{
          display:      'flex',
          gap:          '4px',
          marginBottom: '28px',
          background:   'var(--surface)',
          border:       '1px solid var(--border)',
          borderRadius: '10px',
          padding:      '4px',
          width:        'fit-content',
        }}>
          {tabs.map(t => {
            const active = t.id === tab
            return (
              <a
                key={t.id}
                href={`/dca?tab=${t.id}`}
                style={{
                  padding:        '7px 14px',
                  borderRadius:   '7px',
                  fontSize:       '13px',
                  fontWeight:     active ? 600 : 400,
                  color:          active ? 'var(--text)' : 'var(--text-muted)',
                  background:     active ? 'var(--orange-subtle)' : 'transparent',
                  border:         active ? '1px solid var(--border-strong)' : '1px solid transparent',
                  textDecoration: 'none',
                  whiteSpace:     'nowrap',
                  transition:     'all 0.15s',
                  display:        'flex',
                  alignItems:     'center',
                  gap:            '6px',
                }}
              >
                {t.label}
                <Tooltip text={t.tooltip} position="bottom" wide />
              </a>
            )
          })}
        </div>

        {/* ── Tab: DCA Intelligence ─────────────────────── */}
        {tab === 'intelligence' && (
          <>
            {!plan && (
              <div style={{ padding: '20px 24px', background: 'var(--orange-subtle)', border: '1px solid var(--border-strong)', borderRadius: '10px', marginBottom: '32px' }}>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-sec)' }}>
                  Configure seu plano abaixo para receber recomendações diárias de aporte.
                </p>
              </div>
            )}

            {displayRec && (
              <RecommendationCard rec={{
                action:                 displayRec.action,
                recommended_amount_brl: displayRec.recommended_amount_brl,
                reserve_amount_brl:     displayRec.reserve_amount_brl,
                confidence:             displayRec.confidence,
                rationale:              displayRec.rationale,
                context:                displayRec.context,
                created_at:             displayRec.created_at,
              }} />
            )}

            <DcaPlanForm initial={plan} />

            {history.length > 0 && <RecommendationHistory recs={history} />}
          </>
        )}

        {/* ── Tab: DCA Tático ───────────────────────────── */}
        {tab === 'tactical' && (
          <DcaTacticalPage plan={plan} />
        )}

      </div>
      </main>
    </div>
  )
}
