import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppNav from '@/components/shared/AppNav'
import ThemePicker from '@/components/shared/ThemePicker'
import DcaPlanForm from '@/components/dca/DcaPlanForm'
import SubscriptionSettings from '@/components/alerts/SubscriptionSettings'
import { getDcaPlan } from '@/repositories/dca-plans'
import { getSubscription } from '@/repositories/alert-subscriptions'

export const metadata = { title: 'Configurações — BTC Monitor' }

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const avatarUrl = (user.user_metadata?.avatar_url ?? null) as string | null
  const [plan, subscription] = await Promise.all([
    getDcaPlan(supabase, user.id),
    getSubscription(supabase, user.id),
  ])

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      <AppNav userEmail={user.email ?? ''} userAvatarUrl={avatarUrl} />

      <main style={{ padding: '32px 24px' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.15em', color: 'var(--orange)', textTransform: 'uppercase', marginBottom: '6px' }}>
            Conta
          </div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700 }}>Configurações</h1>
        </div>

        {/* Profile info */}
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 12px' }}>
            Perfil
          </h2>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border-dim)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Email</div>
              <div style={{ fontSize: '14px', color: 'var(--text)' }}>{user.email}</div>
            </div>
            <div style={{ padding: '18px 22px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Login via</div>
              <div style={{ fontSize: '14px', color: 'var(--text)' }}>Google</div>
            </div>
          </div>
        </section>

        {/* Theme */}
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 12px' }}>
            Tema visual
          </h2>
          <ThemePicker />
        </section>

        {/* DCA Plan */}
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 12px' }}>
            Plano DCA
          </h2>
          <DcaPlanForm initial={plan} />
        </section>

        {/* Alertas */}
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 12px' }}>
            Alertas & notificações
          </h2>
          <SubscriptionSettings initial={subscription} />
        </section>

      </div>
      </main>
    </div>
  )
}
