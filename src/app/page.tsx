// src/app/page.tsx
import { createClient } from '@/lib/supabase/server'
import LandingHeader          from '@/components/landing/LandingHeader'
import LandingHero            from '@/components/landing/LandingHero'
import AppPreviewTabs         from '@/components/landing/AppPreviewTabs'
import IndicatorsSection      from '@/components/landing/IndicatorsSection'
import HowItWorksSection      from '@/components/landing/HowItWorksSection'
import DifferentialsSection   from '@/components/landing/DifferentialsSection'
import LandingCTA             from '@/components/landing/LandingCTA'

export const dynamic = 'force-dynamic'

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isAuthenticated = !!user

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      <LandingHeader isAuthenticated={isAuthenticated} />

      <main>
        <LandingHero          isAuthenticated={isAuthenticated} />
        <AppPreviewTabs />
        <IndicatorsSection />
        <HowItWorksSection />
        <DifferentialsSection />
        <LandingCTA           isAuthenticated={isAuthenticated} />
      </main>

      <footer style={{
        borderTop:  '1px solid var(--border-dim)',
        padding:    '24px',
        textAlign:  'center',
        fontSize:   '11px',
        color:      'var(--text-muted)',
      }}>
        BTC Monitor · Dados de mercado com caráter educacional e analítico
      </footer>
    </div>
  )
}
