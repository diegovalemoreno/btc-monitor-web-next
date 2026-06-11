import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentMarketData } from '@/services/market-data'
import AppNav from '@/components/shared/AppNav'
import BtcPriceInline from '@/components/shared/BtcPriceInline'
import TacticalContent from '@/components/dashboard/TacticalContent'

export const metadata = { title: 'Análise Tática — BTC Monitor' }
export const dynamic = 'force-dynamic'

export default async function AnaliseTaticaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { signal } = await getCurrentMarketData()

  const avatarUrl = (user.user_metadata?.avatar_url ?? null) as string | null

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      <AppNav userEmail={user.email ?? ''} userAvatarUrl={avatarUrl} />
      <main style={{ padding: '32px 24px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>

          <div style={{ marginBottom: '36px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.16em', color: 'var(--orange)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Mercado
                </div>
                <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1.1 }}>Análise Tática</h1>
                <p style={{ margin: '8px 0 0', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  Score de oportunidade e indicadores de mercado em tempo real.
                </p>
              </div>
              <BtcPriceInline />
            </div>
            <div style={{ height: '1px', background: 'var(--border)' }} />
          </div>

          <TacticalContent
            signal={signal}
            opportunityScore={signal.explanation.smoothedScore}
          />

        </div>
      </main>
    </div>
  )
}
