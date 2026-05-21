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
    <div style={{ minHeight: '100dvh', backgroundColor: '#0a0a0a', color: '#e8e0d5' }}>
      <AppNav userEmail={user.email ?? ''} />

      <main style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.15em', color: '#e08a3a', textTransform: 'uppercase', marginBottom: '4px' }}>
              Análise tática
            </div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
              Dashboard
              <span style={{ fontSize: '11px', fontWeight: 600, background: '#1a3a1a', color: '#4caf50', border: '1px solid #2d6e2d', borderRadius: '6px', padding: '2px 8px', letterSpacing: '0.05em' }}>
                v2.1 ✓
              </span>
            </h1>
          </div>
          <div style={{ fontSize: '11px', color: '#5a5040' }}>Atualizado {updatedAt}</div>
        </div>

        <RegimeCard signal={signal} />
        <DimensionScores scores={scores} />
        <IndicatorGroups signal={signal} />

        {/* Insights */}
        {signal.insights && signal.insights.length > 0 && (
          <div style={{
            background:   '#111111',
            border:       '1px solid rgba(224,138,58,0.1)',
            borderRadius: '12px',
            padding:      '20px 24px',
            marginBottom: '24px',
          }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#5a5040', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px' }}>
              Observações
            </div>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {signal.insights.map((ins, i) => (
                <li key={i} style={{ display: 'flex', gap: '10px', fontSize: '13px', color: '#b0a090', lineHeight: 1.6 }}>
                  <span style={{ color: '#e08a3a', flexShrink: 0 }}>·</span>
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
