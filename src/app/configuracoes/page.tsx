import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppNav from '@/components/shared/AppNav'
import ThemePicker from '@/components/shared/ThemePicker'
import SubscriptionSettings from '@/components/alerts/SubscriptionSettings'
import { getSubscription } from '@/repositories/alert-subscriptions'

export const metadata = { title: 'Configurações — BTC Monitor' }

function SectionHeader({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
      <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.16em', color: 'var(--text-muted)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <div style={{ flex: 1, height: '1px', background: 'var(--border-dim)' }} />
    </div>
  )
}

export default async function ConfiguracoesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const avatarUrl    = (user.user_metadata?.avatar_url ?? null) as string | null
  const subscription = await getSubscription(supabase, user.id)

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      <AppNav userEmail={user.email ?? ''} userAvatarUrl={avatarUrl} />

      <main style={{ padding: '32px 24px' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>

          {/* Page header */}
          <div style={{ marginBottom: '36px' }}>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.16em', color: 'var(--orange)', textTransform: 'uppercase', marginBottom: '8px' }}>
                Conta
              </div>
              <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1.1 }}>
                Configurações
              </h1>
              <p style={{ margin: '8px 0 0', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Perfil, tema visual e preferências de notificação.
              </p>
            </div>
            <div style={{ height: '1px', background: 'var(--border)' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>

            {/* Perfil */}
            <section>
              <SectionHeader label="Perfil" />
              <div style={{
                background:   'var(--surface)',
                border:       '1px solid var(--border)',
                borderTop:    '2px solid var(--orange)',
                borderRadius: '12px',
                overflow:     'hidden',
              }}>
                <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-dim)', display: 'grid', gridTemplateColumns: '80px 1fr', gap: '8px', alignItems: 'baseline' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Email</div>
                  <div style={{ fontSize: '14px', color: 'var(--text)' }}>{user.email}</div>
                </div>
                <div style={{ padding: '18px 24px', display: 'grid', gridTemplateColumns: '80px 1fr', gap: '8px', alignItems: 'baseline' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Login</div>
                  <div style={{ fontSize: '14px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Google
                  </div>
                </div>
              </div>
            </section>

            {/* Tema visual */}
            <section>
              <SectionHeader label="Tema visual" />
              <div style={{
                background:   'var(--surface)',
                border:       '1px solid var(--border)',
                borderTop:    '2px solid var(--orange)',
                borderRadius: '12px',
                padding:      '20px',
              }}>
                <ThemePicker />
              </div>
            </section>

            {/* Notificações */}
            <section>
              <SectionHeader label="Alertas & notificações" />
              <SubscriptionSettings initial={subscription} />
            </section>

          </div>
        </div>
      </main>
    </div>
  )
}
