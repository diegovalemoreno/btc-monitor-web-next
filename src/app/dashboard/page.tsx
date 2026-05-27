import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentMarketData } from '@/services/market-data'
import AppNav from '@/components/shared/AppNav'
import HeroSection from '@/components/dashboard/HeroSection'
import DimensionGrid from '@/components/dashboard/DimensionGrid'
import ConsensusSection from '@/components/dashboard/ConsensusSection'
import InsightsPanel from '@/components/dashboard/InsightsPanel'
import ScoreWhyPanel from '@/components/dashboard/ScoreWhyPanel'

export const metadata = { title: 'Dashboard — BTC Monitor' }
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { signal } = await getCurrentMarketData()

  const updatedAt = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day:      '2-digit',
    month:    '2-digit',
    year:     'numeric',
    hour:     '2-digit',
    minute:   '2-digit',
  }).format(new Date(signal.generatedAt))

  const avatarUrl = (user.user_metadata?.avatar_url ?? null) as string | null

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      <AppNav userEmail={user.email ?? ''} userAvatarUrl={avatarUrl} />
      <main style={{ padding: '32px 24px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <HeroSection
            signal={signal}
            opportunityScore={signal.explanation.smoothedScore}
            updatedAt={updatedAt}
          />
          <ScoreWhyPanel explanation={signal.explanation} />
          <DimensionGrid groups={signal.indicatorGroups} />
          <ConsensusSection groups={signal.indicatorGroups} />
          <InsightsPanel insights={signal.insights} />
        </div>
      </main>
    </div>
  )
}
