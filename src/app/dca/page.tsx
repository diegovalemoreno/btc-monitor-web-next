import { redirect }               from 'next/navigation'
import { createClient }           from '@/lib/supabase/server'
import { getDcaPlan }             from '@/repositories/dca-plans'
import { getCurrentMarketData }   from '@/services/market-data'
import AppNav                     from '@/components/shared/AppNav'
import BtcPriceInline             from '@/components/shared/BtcPriceInline'
import DcaRecommendationHero      from '@/components/dca/DcaRecommendationHero'
import DcaTacticalAlert           from '@/components/dca/DcaTacticalAlert'
import DcaWhyNow                  from '@/components/dca/DcaWhyNow'
import DcaHistoricalReturns       from '@/components/dca/DcaHistoricalReturns'
import DcaPlanForm                from '@/components/dca/DcaPlanForm'
import { buildRecommendation }    from '@/lib/dca/recommendation'
import { buildWhyNow }            from '@/lib/dca/why-now'
import { detectTacticalPatterns } from '@/lib/dca/tactical-patterns'
import { getHistoricalReturns }   from '@/lib/dca/historical-returns'

export const metadata = { title: 'DCA — BTC Monitor' }
export const dynamic  = 'force-dynamic'

export default async function DcaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const avatarUrl = (user.user_metadata?.avatar_url ?? null) as string | null

  const [plan, { signal }] = await Promise.all([
    getDcaPlan(supabase, user.id),
    getCurrentMarketData(),
  ])

  const score = signal.explanation.smoothedScore

  const recommendation = plan
    ? buildRecommendation(score, plan.monthly_amount_brl, plan.risk_profile)
    : null

  const whyNow         = buildWhyNow(signal.indicatorGroups)
  const patterns       = detectTacticalPatterns(signal)
  const historicalRows = getHistoricalReturns(score)

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      <AppNav userEmail={user.email ?? ''} userAvatarUrl={avatarUrl} />
      <main style={{ padding: '32px 24px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>

          <div style={{ marginBottom: '36px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.16em', color: 'var(--orange)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Estratégia
                </div>
                <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1.1 }}>DCA Tático</h1>
                <p style={{ margin: '8px 0 0', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  Recomendação de aporte calibrada pelo score de mercado e seu perfil de risco.
                </p>
              </div>
              <BtcPriceInline />
            </div>
            <div style={{ height: '1px', background: 'var(--border)' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {!plan && <DcaPlanForm initial={null} />}

            {recommendation && plan && (
              <DcaRecommendationHero
                recommendation={recommendation}
                monthlyAmountBrl={plan.monthly_amount_brl}
              />
            )}

            <DcaTacticalAlert patterns={patterns} />

            <DcaWhyNow items={whyNow} />

            <DcaHistoricalReturns rows={historicalRows} />
          </div>

        </div>
      </main>
    </div>
  )
}
