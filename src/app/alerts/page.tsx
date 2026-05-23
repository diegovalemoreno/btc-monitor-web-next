import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getRecentAlerts } from '@/repositories/alert-events'
import { getSubscription } from '@/repositories/alert-subscriptions'
import AppNav from '@/components/shared/AppNav'
import AlertFeed from '@/components/alerts/AlertFeed'
import SubscriptionSettings from '@/components/alerts/SubscriptionSettings'

export const metadata = { title: 'Alertas — BTC Monitor' }

export default async function AlertsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [alerts, subscription] = await Promise.all([
    getRecentAlerts(supabase, user.id, 30),
    getSubscription(supabase, user.id),
  ])

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: '#0a0a0a', color: '#e8e0d5' }}>
      <AppNav userEmail={user.email ?? ''} />

      <main style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 20px' }}>

        {/* Page header */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.15em', color: '#e08a3a', textTransform: 'uppercase', marginBottom: '6px' }}>
            Monitoramento
          </div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#e8e0d5' }}>
            Alertas de mercado
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#4a4040', lineHeight: 1.5 }}>
            Notificações automáticas quando condições relevantes de mercado são detectadas.
          </p>
        </div>

        {/* Alert list — centro do dashboard */}
        <AlertFeed alerts={alerts} />

        {/* Notification settings — seção secundária */}
        <div style={{ borderTop: '1px solid rgba(224,138,58,0.07)', paddingTop: '40px' }}>
          <SubscriptionSettings initial={subscription} />
        </div>

      </main>
    </div>
  )
}
