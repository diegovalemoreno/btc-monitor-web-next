import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { listDcaContributions } from '@/repositories/dca-contributions'
import AppNav from '@/components/shared/AppNav'
import RentabilidadeView from '@/components/rentabilidade/RentabilidadeView'

export const metadata = { title: 'Rentabilidade — BTC Monitor' }

export default async function RentabilidadePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const contributions = await listDcaContributions(supabase, user.id, 1000)
  const avatarUrl = (user.user_metadata?.avatar_url ?? null) as string | null

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      <AppNav userEmail={user.email ?? ''} userAvatarUrl={avatarUrl} />

      <main style={{ padding: '32px 24px' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>

        <div style={{ marginBottom: '32px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.15em', color: 'var(--orange)', textTransform: 'uppercase', marginBottom: '6px' }}>
            Performance
          </div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700 }}>Rentabilidade</h1>
          <p style={{ margin: '8px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
            Retorno por ano e mês de aporte, calculado sobre o preço atual do Bitcoin.
          </p>
        </div>

        <RentabilidadeView initialContributions={contributions} />

      </div>
      </main>
    </div>
  )
}
