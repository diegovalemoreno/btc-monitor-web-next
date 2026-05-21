import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppNav from '@/components/shared/AppNav'

export const metadata = { title: 'Configurações — BTC Monitor' }

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: '#0a0a0a', color: '#e8e0d5' }}>
      <AppNav userEmail={user.email ?? ''} />

      <main style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.15em', color: '#e08a3a', textTransform: 'uppercase', marginBottom: '6px' }}>
            Conta
          </div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>Configurações</h1>
        </div>

        {/* Profile info */}
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '13px', fontWeight: 600, color: '#5a5040', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 16px' }}>
            Perfil
          </h2>
          <div style={{ background: '#111111', border: '1px solid rgba(224,138,58,0.13)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(224,138,58,0.07)' }}>
              <div style={{ fontSize: '12px', color: '#5a5040', marginBottom: '4px' }}>Email</div>
              <div style={{ fontSize: '14px', color: '#e8e0d5' }}>{user.email}</div>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <div style={{ fontSize: '12px', color: '#5a5040', marginBottom: '4px' }}>Login via</div>
              <div style={{ fontSize: '14px', color: '#e8e0d5' }}>Google</div>
            </div>
          </div>
        </section>

        {/* Quick links */}
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '13px', fontWeight: 600, color: '#5a5040', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 16px' }}>
            Configurações avançadas
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { href: '/alerts',  label: 'Alertas & notificações', desc: 'Gerir assinaturas, perfil de risco, Telegram e email' },
              { href: '/dca',     label: 'Plano DCA',               desc: 'Valor mensal, reserva estratégica e perfil de risco' },
            ].map(({ href, label, desc }) => (
              <a
                key={href}
                href={href}
                style={{
                  display:       'flex',
                  alignItems:    'center',
                  justifyContent: 'space-between',
                  padding:       '16px 20px',
                  background:    '#111111',
                  border:        '1px solid rgba(224,138,58,0.1)',
                  borderRadius:  '10px',
                  textDecoration: 'none',
                  gap:           '12px',
                }}
              >
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: '#e8e0d5', marginBottom: '2px' }}>{label}</div>
                  <div style={{ fontSize: '12px', color: '#5a5040' }}>{desc}</div>
                </div>
                <span style={{ color: '#5a5040', fontSize: '16px', flexShrink: 0 }}>›</span>
              </a>
            ))}
          </div>
        </section>

      </main>
    </div>
  )
}
