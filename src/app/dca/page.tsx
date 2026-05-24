import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDcaPlan } from '@/repositories/dca-plans'
import { getLatestRecommendation, getRecentRecommendations } from '@/repositories/dca-recommendations'
import AppNav from '@/components/shared/AppNav'
import RecommendationCard from '@/components/dca/RecommendationCard'
import DcaPlanForm from '@/components/dca/DcaPlanForm'
import RecommendationHistory from '@/components/dca/RecommendationHistory'
import DcaTacticalPage from '@/components/dca-tactical/DcaTacticalPage'

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

  const tabs = [
    { id: 'intelligence', label: 'DCA Intelligence' },
    { id: 'tactical',     label: 'DCA Tático'       },
  ]

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      <AppNav userEmail={user.email ?? ''} />

      <main style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 24px' }}>

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
                  padding:         '7px 18px',
                  borderRadius:    '7px',
                  fontSize:        '13px',
                  fontWeight:      active ? 600 : 400,
                  color:           active ? 'var(--text)' : 'var(--text-muted)',
                  background:      active ? 'var(--orange-subtle)' : 'transparent',
                  border:          active ? '1px solid var(--border-strong)' : '1px solid transparent',
                  textDecoration:  'none',
                  whiteSpace:      'nowrap',
                  transition:      'all 0.15s',
                }}
              >
                {t.label}
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

            <DcaPlanForm initial={plan} />

            {history.length > 0 && <RecommendationHistory recs={history} />}
          </>
        )}

        {/* ── Tab: DCA Tático ───────────────────────────── */}
        {tab === 'tactical' && (
          <DcaTacticalPage plan={plan} />
        )}

      </main>
    </div>
  )
}
