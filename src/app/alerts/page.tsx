import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getRecentAlerts } from '@/repositories/alert-events'
import AppNav from '@/components/shared/AppNav'
import AlertsView from '@/components/alerts/AlertsView'

export const metadata = { title: 'Alertas — BTC Monitor' }

export default async function AlertsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const alerts = await getRecentAlerts(supabase, user.id, 200)

  const avatarUrl = (user.user_metadata?.avatar_url ?? null) as string | null

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      <AppNav userEmail={user.email ?? ''} userAvatarUrl={avatarUrl} />

      <main style={{ padding: '32px 24px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>

          {/* Page header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '2px', color: '#f59e0b', textTransform: 'uppercase', marginBottom: '6px' }}>
                Monitoramento
              </div>
              <h1 style={{ margin: '0 0 6px', fontSize: '24px', fontWeight: 700, color: 'var(--text)' }}>
                Alertas de mercado
              </h1>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-sec)', lineHeight: 1.5 }}>
                Notificações automáticas quando condições relevantes de mercado são detectadas.
              </p>
            </div>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(245,158,11,0.15), transparent 70%)',
              border: '1px solid rgba(245,158,11,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              position: 'relative',
            }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 01-3.46 0"/>
              </svg>
              {alerts.filter(a => a.severity === 'HIGH' || a.severity === 'CRITICAL').length > 0 && (
                <span style={{
                  position: 'absolute', top: '4px', right: '4px',
                  background: '#f59e0b', color: '#000', borderRadius: '50%',
                  width: '18px', height: '18px', fontSize: '9px', fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {alerts.filter(a => a.severity === 'HIGH' || a.severity === 'CRITICAL').length}
                </span>
              )}
            </div>
          </div>

          <AlertsView alerts={alerts} />

        </div>
      </main>
    </div>
  )
}
