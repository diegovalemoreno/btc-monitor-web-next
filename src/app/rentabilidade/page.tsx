import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { listDcaContributions } from '@/repositories/dca-contributions'
import { fetchBtcPriceHistoryBrl } from '@lib/rentabilidade/fetch-price-history'
import { computePatrimonio } from '@lib/rentabilidade/compute'
import AppNav from '@/components/shared/AppNav'
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

          <RentabilidadeView patrimonio={patrimonio} />

        </div>
      </main>
    </div>
  )
}
