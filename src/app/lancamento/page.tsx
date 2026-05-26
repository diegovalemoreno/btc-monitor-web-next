import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { listDcaContributions } from '@/repositories/dca-contributions'
import AppNav from '@/components/shared/AppNav'
import DcaContributionHistory from '@/components/dca-tactical/DcaContributionHistory'

export const metadata = { title: 'Lançamento — BTC Monitor' }

export default async function LancamentoPage() {
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
            Registro
          </div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700 }}>Lançamento</h1>
          <p style={{ margin: '8px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
            Consolidação e evolução dos aportes registrados.
          </p>
        </div>

        <DcaContributionHistory
          initialContributions={contributions}
          initialTab="consolidacao"
          chartCompact
        />

      </div>
      </main>
    </div>
  )
}
