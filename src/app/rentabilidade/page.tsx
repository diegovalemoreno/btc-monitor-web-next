import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { listDcaContributions } from '@/repositories/dca-contributions'
import { fetchBtcPriceHistoryBrl } from '@lib/rentabilidade/fetch-price-history'
import { computePatrimonio } from '@lib/rentabilidade/compute'
import AppNav from '@/components/shared/AppNav'
import BtcPriceInline from '@/components/shared/BtcPriceInline'
import RentabilidadeView from '@/components/rentabilidade/RentabilidadeView'

export const metadata = { title: 'Rentabilidade — BTC Monitor' }

export default async function RentabilidadePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [contributions, { history, currentPrice }] = await Promise.all([
    listDcaContributions(supabase, user.id, 1000),
    fetchBtcPriceHistoryBrl(),
  ])

  const patrimonio = computePatrimonio(contributions, history, currentPrice)
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
                  Portfólio
                </div>
                <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1.1 }}>Rentabilidade</h1>
                <p style={{ margin: '8px 0 0', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  Retorno por aporte, calculado sobre o preço atual do Bitcoin.
                </p>
              </div>
              <BtcPriceInline />
            </div>
            <div style={{ height: '1px', background: 'var(--border)' }} />
          </div>

          <RentabilidadeView patrimonio={patrimonio} />

        </div>
      </main>
    </div>
  )
}
