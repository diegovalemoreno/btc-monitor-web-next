import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { listDcaContributions } from '@/repositories/dca-contributions'
import AppNav from '@/components/shared/AppNav'
import DcaResumoView from '@/components/dca-tactical/DcaResumoView'
import BtcPriceInline from '@/components/shared/BtcPriceInline'

export const metadata = { title: 'Resumo — BTC Monitor' }

export default async function ResumoPage() {
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
            Portfólio
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700 }}>Resumo</h1>
              <p style={{ margin: '8px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                Visão consolidada do portfólio, análise de custos e evolução de patrimônio.
              </p>
            </div>
            <BtcPriceInline />
          </div>
        </div>

        <DcaResumoView initialContributions={contributions} />

      </div>
      </main>
    </div>
  )
}
