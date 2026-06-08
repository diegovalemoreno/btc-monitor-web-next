import { redirect }               from 'next/navigation'
import { createClient }           from '@/lib/supabase/server'
import { getDcaPlan }             from '@/repositories/dca-plans'
import { listDcaContributions }   from '@/repositories/dca-contributions'
import { getCurrentMarketData }   from '@/services/market-data'
import AppNav                     from '@/components/shared/AppNav'
import DcaRecommendationHero      from '@/components/dca/DcaRecommendationHero'
import DcaTacticalAlert           from '@/components/dca/DcaTacticalAlert'
import DcaWhyNow                  from '@/components/dca/DcaWhyNow'
import DcaHistoricalReturns       from '@/components/dca/DcaHistoricalReturns'
import DcaPlanForm                from '@/components/dca/DcaPlanForm'
import DcaContributionHistory     from '@/components/dca-tactical/DcaContributionHistory'
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

  const contributions = plan
    ? await listDcaContributions(supabase, user.id)
    : []

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

          {!plan && (
            <div style={{ marginBottom: '24px' }}>
              <DcaPlanForm initial={null} />
            </div>
          )}

          {recommendation && plan && (
            <DcaRecommendationHero
              recommendation={recommendation}
              monthlyAmountBrl={plan.monthly_amount_brl}
            />
          )}

          <DcaTacticalAlert patterns={patterns} />

          <DcaWhyNow items={whyNow} />

          <DcaHistoricalReturns rows={historicalRows} />

          {plan && (
            <div style={{ marginTop: '32px' }}>
              <DcaContributionHistory initialContributions={contributions} />
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
