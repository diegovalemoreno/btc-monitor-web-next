import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentMarketData } from '@/services/market-data'
import { deriveSnapshotScores } from '@/domain/snapshot-scores'
import AppNav from '@/components/shared/AppNav'
import RegimeCard from '@/components/dashboard/RegimeCard'
import DimensionScores from '@/components/dashboard/DimensionScores'
import IndicatorGroups from '@/components/dashboard/IndicatorGroups'

export const metadata = { title: 'Dashboard — BTC Monitor' }
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { signal } = await getCurrentMarketData()
  const scores = deriveSnapshotScores(signal)

  const updatedAt = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(signal.generatedAt))

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      <AppNav userEmail={user.email ?? ''} />

      <main style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.15em', color: 'var(--orange)', textTransform: 'uppercase', marginBottom: '4px' }}>
              Análise tática
            </div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700 }}>Dashboard</h1>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Atualizado {updatedAt}</div>
        </div>

        <RegimeCard signal={signal} />
        <DimensionScores scores={scores} />
        <IndicatorGroups signal={signal} />

        {/* Insights */}
        {signal.insights && signal.insights.length > 0 && (
          <div style={{
            background:   'var(--surface)',
            border:       '1px solid var(--border-dim)',
            borderRadius: '12px',
            padding:      '20px 24px',
            marginBottom: '24px',
          }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px' }}>
              Observações
            </div>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {signal.insights.map((ins, i) => (
                <li key={i} style={{ display: 'flex', gap: '10px', fontSize: '13px', color: 'var(--text-sec)', lineHeight: 1.6 }}>
                  <span style={{ color: 'var(--orange)', flexShrink: 0 }}>·</span>
                  {ins}
                </li>
              ))}
            </ul>
          </div>
        )}

      </main>
    </div>
  )
}
