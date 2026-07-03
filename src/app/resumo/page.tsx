import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { listDcaContributions } from '@/repositories/dca-contributions'
import AppNav from '@/components/shared/AppNav'
import DcaResumoView from '@/components/dca-tactical/DcaResumoView'
import BtcPriceInline from '@/components/shared/BtcPriceInline'
import HalvingCountdown from '@/components/shared/HalvingCountdown'

export const metadata = { title: 'Resumo — BTC Monitor' }
export const dynamic  = 'force-dynamic'

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

        <div style={{ marginBottom: '36px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.16em', color: 'var(--orange)', textTransform: 'uppercase', marginBottom: '8px' }}>
                Portfólio
              </div>
              <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1.1 }}>Resumo</h1>
              <p style={{ margin: '8px 0 0', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Visão consolidada do portfólio, análise de custos e evolução de patrimônio.
              </p>
            </div>
            <BtcPriceInline />
          </div>
          <div style={{ height: '1px', background: 'var(--border)' }} />
        </div>

        <HalvingCountdown />

        <DcaResumoView initialContributions={contributions} />

      </div>
      </main>
    </div>
  )
}
