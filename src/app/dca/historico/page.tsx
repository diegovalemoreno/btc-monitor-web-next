import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { listDcaContributions } from '@/repositories/dca-contributions'
import AppNav from '@/components/shared/AppNav'
import DcaContributionHistory from '@/components/dca-tactical/DcaContributionHistory'

export const metadata = { title: 'Histórico de Aportes — BTC Monitor' }

export default async function DcaHistoricoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const contributions = await listDcaContributions(supabase, user.id, 1000)

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      <AppNav userEmail={user.email ?? ''} />

      <main style={{ padding: '32px 24px' }}>

        <div style={{ marginBottom: '32px' }}>
          <a
            href="/dca?tab=tactical"
            style={{ fontSize: '12px', color: 'var(--text-muted)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '16px' }}
          >
            ← DCA Tático
          </a>
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.15em', color: 'var(--orange)', textTransform: 'uppercase', marginBottom: '6px' }}>
            Histórico de Aportes
          </div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700 }}>Todos os aportes registrados</h1>
          <p style={{ margin: '8px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
            Registro completo de aportes táticos, estruturais e manuais. Aportes deletados são ocultados.
          </p>
        </div>

        <DcaContributionHistory initialContributions={contributions} />

      </main>
    </div>
  )
}
