import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDcaPlan } from '@/repositories/dca-plans'
import { getLatestRecommendation, getRecentRecommendations } from '@/repositories/dca-recommendations'
import AppNav from '@/components/shared/AppNav'
import RecommendationCard from '@/components/dca/RecommendationCard'
import DcaPlanForm from '@/components/dca/DcaPlanForm'
import RecommendationHistory from '@/components/dca/RecommendationHistory'

export const metadata = { title: 'DCA Intelligence — BTC Monitor' }

export default async function DcaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const plan = await getDcaPlan(supabase, user.id)

  const [latestRec, history] = plan
    ? await Promise.all([
        getLatestRecommendation(supabase, user.id),
        getRecentRecommendations(supabase, user.id, 10),
      ])
    : [null, []]

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      <AppNav userEmail={user.email ?? ''} />

      <main style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.15em', color: 'var(--orange)', textTransform: 'uppercase', marginBottom: '6px' }}>
            Acumulação inteligente
          </div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700 }}>DCA Intelligence</h1>
          <p style={{ margin: '8px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
            Orientação de aporte baseada em contexto de mercado — não em previsão de preço.
          </p>
        </div>

        {/* No plan yet */}
        {!plan && (
          <div style={{ padding: '20px 24px', background: 'var(--orange-subtle)', border: '1px solid var(--border-strong)', borderRadius: '10px', marginBottom: '32px' }}>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-sec)' }}>
              Configure seu plano abaixo para receber recomendações diárias de aporte.
            </p>
          </div>
        )}

        {/* Latest recommendation */}
        {latestRec && (
          <RecommendationCard rec={{
            action:                 latestRec.action,
            recommended_amount_brl: latestRec.recommended_amount_brl,
            reserve_amount_brl:     latestRec.reserve_amount_brl,
            confidence:             latestRec.confidence,
            rationale:              latestRec.rationale,
            context:                latestRec.context,
            created_at:             latestRec.created_at,
          }} />
        )}

        {/* Plan form */}
        <DcaPlanForm initial={plan} />

        {/* History */}
        {history.length > 0 && <RecommendationHistory recs={history} />}

      </main>
    </div>
  )
}
