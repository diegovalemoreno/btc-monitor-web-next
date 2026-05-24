// src/components/landing/AppPreviewTabs.tsx
'use client'

import { useState } from 'react'

type Tab = 'dashboard' | 'alerts' | 'dca'

const TABS: { id: Tab; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'alerts',    label: 'Alertas'   },
  { id: 'dca',       label: 'DCA'       },
]

function DashboardTab() {
  return (
    <div style={{ padding: '24px' }}>
      {/* Regime card */}
      <div style={{
        background:   'rgba(105,240,174,0.06)',
        border:       '1px solid rgba(105,240,174,0.2)',
        borderRadius: '10px',
        padding:      '18px 20px',
        marginBottom: '16px',
        display:      'flex',
        justifyContent: 'space-between',
        alignItems:   'center',
      }}>
        <div>
          <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>Regime de mercado</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#69F0AE' }}>Neutro</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Score</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#69F0AE' }}>+2</div>
        </div>
      </div>
      {/* Dimensões */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '16px' }}>
        {[
          { label: 'Sentimento', score: '+1', color: '#FFD600' },
          { label: 'Derivativos', score: '+2', color: '#69F0AE' },
          { label: 'On-chain', score: '0', color: '#b0a090' },
          { label: 'Tendência', score: '+1', color: '#69F0AE' },
        ].map(({ label, score, color }) => (
          <div key={label} style={{ background: 'var(--surface2)', border: '1px solid var(--border-dim)', borderRadius: '8px', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-sec)' }}>{label}</span>
            <span style={{ fontSize: '16px', fontWeight: 700, color }}>{score}</span>
          </div>
        ))}
      </div>
      {/* Indicadores amostra */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {[
          { name: 'Fear & Greed Index', value: '47 — Neutro', score: '+1', color: '#FFD600' },
          { name: 'Funding Rate',       value: '+0.010% — Neutro', score: '+2', color: '#69F0AE' },
          { name: 'MVRV Z-Score',       value: '1.8 — Normal', score: '0', color: '#b0a090' },
        ].map(({ name, value, score, color }) => (
          <div key={name} style={{ background: 'var(--surface2)', border: '1px solid var(--border-dim)', borderRadius: '8px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text)' }}>{name}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{value}</div>
            </div>
            <span style={{ fontSize: '16px', fontWeight: 700, color }}>{score}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function AlertsTab() {
  const ALERTS = [
    { label: 'Fear & Greed abaixo de 25', type: 'INDICATOR', severity: 'HIGH',   color: '#FF6D00', time: 'há 2h'   },
    { label: 'Funding Rate negativo',     type: 'INDICATOR', severity: 'MEDIUM', color: '#FFD600', time: 'há 6h'   },
    { label: 'Preço 7d queda > 15%',      type: 'PRICE',     severity: 'HIGH',   color: '#FF6D00', time: 'há 1d'   },
  ]
  return (
    <div style={{ padding: '24px' }}>
      <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px' }}>
        Últimos alertas disparados
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {ALERTS.map(({ label, type, severity, color, time }) => (
          <div key={label} style={{ background: 'var(--surface2)', border: '1px solid var(--border-dim)', borderRadius: '10px', padding: '14px 16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>{label}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                {type} · {severity} · {time}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: '16px', padding: '12px 16px', background: 'var(--orange-subtle)', border: '1px solid var(--border-strong)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-sec)' }}>
        Configure alertas para receber notificações quando os indicadores atingirem seus critérios.
      </div>
    </div>
  )
}

function DcaTab() {
  return (
    <div style={{ padding: '24px' }}>
      {/* Recomendação atual */}
      <div style={{
        background:   'rgba(105,240,174,0.06)',
        border:       '1px solid rgba(105,240,174,0.3)',
        borderRadius: '10px',
        overflow:     'hidden',
        marginBottom: '16px',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(105,240,174,0.15)' }}>
          <div style={{ fontSize: '10px', fontWeight: 600, color: '#69F0AE', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '4px' }}>Recomendação atual</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#69F0AE' }}>DCA Normal</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Cadência regular</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
          <div style={{ padding: '16px 20px', borderRight: '1px solid rgba(105,240,174,0.15)' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Aportar agora</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)' }}>R$ 700</div>
          </div>
          <div style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Manter reserva</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-sec)' }}>R$ 300</div>
          </div>
        </div>
      </div>
      <div style={{ background: 'var(--surface2)', border: '1px solid var(--border-dim)', borderRadius: '8px', padding: '14px 16px', fontSize: '12px', color: 'var(--text-sec)', lineHeight: 1.6 }}>
        Mercado em zona neutra. Indicadores sem sinal claro de oportunidade ou risco extremo. Manter cadência regular.
      </div>
    </div>
  )
}

export default function AppPreviewTabs() {
  const [active, setActive] = useState<Tab>('dashboard')

  return (
    <section id="app" style={{ padding: '80px 24px', maxWidth: '960px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px' }}>App por dentro</div>
        <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>Veja o que você encontrará</h2>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
        {/* Tab bar */}
        <div style={{ borderBottom: '1px solid var(--border)', display: 'flex', background: 'var(--surface2)' }}>
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActive(id)}
              style={{
                padding:          '14px 24px',
                fontSize:         '13px',
                fontWeight:       active === id ? 600 : 400,
                color:            active === id ? 'var(--text)' : 'var(--text-muted)',
                background:       'transparent',
                border:           'none',
                borderBottom:     active === id ? '2px solid var(--orange)' : '2px solid transparent',
                cursor:           'pointer',
                transition:       'color 0.15s',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {active === 'dashboard' && <DashboardTab />}
        {active === 'alerts'    && <AlertsTab />}
        {active === 'dca'       && <DcaTab />}
      </div>
    </section>
  )
}
