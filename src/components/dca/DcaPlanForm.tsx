'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { DcaPlanRow, RiskProfile } from '@/lib/db/types'

const PROFILES: { value: RiskProfile; label: string; desc: string }[] = [
  { value: 'CONSERVATIVE', label: 'Conservador', desc: 'DCA máximo: NORMAL. Protege contra entradas em topo.'      },
  { value: 'MODERATE',     label: 'Moderado',    desc: 'DCA máximo: REFORÇADO. Aumenta aporte em boas janelas.'     },
  { value: 'AGGRESSIVE',   label: 'Agressivo',   desc: 'DCA máximo: AGRESSIVO. Usa reserva total em capitulação.'   },
]

interface Props {
  initial:  DcaPlanRow | null
  onSaved?: (plan: DcaPlanRow) => void
}

export default function DcaPlanForm({ initial, onSaved }: Props) {
  const router = useRouter()
  const [monthlyAmount, setMonthlyAmount] = useState(initial?.monthly_amount_brl?.toString() ?? '')
  const [riskProfile,   setRiskProfile]   = useState<RiskProfile>(initial?.risk_profile ?? 'MODERATE')
  const [reservePct,    setReservePct]    = useState(initial?.reserve_percentage ?? 30)
  const [defaultBuyDay, setDefaultBuyDay] = useState(initial?.default_buy_day?.toString() ?? '')
  const [enabled,       setEnabled]       = useState(initial?.enabled ?? true)
  const [saving,        setSaving]        = useState(false)
  const [saved,         setSaved]         = useState(false)
  const [error,         setError]         = useState<string | null>(null)

  async function handleSave() {
    const amount = parseFloat(monthlyAmount.replace(',', '.'))
    if (isNaN(amount) || amount <= 0) { setError('Informe um valor mensal válido'); return }
    setSaving(true); setSaved(false); setError(null)
    try {
      const res = await fetch('/api/dca', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          monthly_amount_brl:  amount,
          risk_profile:        riskProfile,
          reserve_percentage:  reservePct,
          default_buy_day:     defaultBuyDay ? parseInt(defaultBuyDay, 10) : null,
          enabled,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao salvar')
      setSaved(true)
      onSaved?.(data.plan)
      router.refresh()
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      background:   'rgba(255,255,255,0.02)',
      border:       '1px solid rgba(255,255,255,0.07)',
      borderRadius: '16px',
      padding:      '24px 28px',
    }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '9px',
          background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/>
          </svg>
        </div>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>Configuração do plano DCA</div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Ajuste os parâmetros do seu plano de acumulação.</div>
        </div>
      </div>

      {/* Plano ativo */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px', background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px',
        marginBottom: '20px',
      }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>Plano ativo</div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>Gerar recomendações diárias de aporte</div>
        </div>
        <Toggle value={enabled} onChange={setEnabled} />
      </div>

      {/* Amount + Reserve row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>

        {/* Monthly amount */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '16px' }}>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1.2px', fontWeight: 700, marginBottom: '10px' }}>
            Valor mensal disponível
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>R$</span>
            <input
              type="number"
              value={monthlyAmount}
              onChange={e => setMonthlyAmount(e.target.value)}
              placeholder="1.000"
              min="0" step="50"
              style={{
                flex: 1, padding: '8px 12px',
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '8px', color: '#fff', fontSize: '14px', fontWeight: 600,
              }}
            />
          </div>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>Disponível para BTC por mês</div>
        </div>

        {/* Reserve */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1.2px', fontWeight: 700 }}>
              Reserva estratégica
            </div>
            <span style={{ fontSize: '16px', fontWeight: 800, color: '#f59e0b' }}>{reservePct}%</span>
          </div>
          <input
            type="range" min="0" max="60" step="5"
            value={reservePct}
            onChange={e => setReservePct(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#f59e0b', marginBottom: '8px' }}
          />
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>Para oportunidades excepcionais (DCA Agressivo)</div>
        </div>
      </div>

      {/* Risk profile */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1.2px', fontWeight: 700, marginBottom: '10px' }}>
          Perfil de risco
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          {PROFILES.map(({ value, label, desc }) => (
            <button
              key={value}
              type="button"
              onClick={() => setRiskProfile(value)}
              style={{
                padding:      '12px 14px',
                background:   riskProfile === value ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.02)',
                border:       riskProfile === value ? '1px solid rgba(245,158,11,0.4)' : '1px solid rgba(255,255,255,0.07)',
                borderRadius: '10px',
                cursor:       'pointer',
                textAlign:    'left',
                transition:   'all 0.15s',
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 600, color: riskProfile === value ? '#f59e0b' : 'rgba(255,255,255,0.8)', marginBottom: '4px' }}>
                {label}
              </div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', lineHeight: 1.4 }}>{desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Default buy day */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '24px', marginBottom: '24px' }}>
        <div>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1.2px', fontWeight: 700, marginBottom: '8px' }}>
            Dia padrão de compra <span style={{ color: 'rgba(255,255,255,0.2)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(opcional)</span>
          </div>
          <input
            type="number"
            value={defaultBuyDay}
            onChange={e => setDefaultBuyDay(e.target.value)}
            placeholder="Ex: 5"
            min="1" max="28"
            style={{
              width: '90px', padding: '8px 12px',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '8px', color: '#fff', fontSize: '13px',
            }}
          />
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', marginTop: '6px' }}>Apenas informativo — não afeta o cálculo</div>
        </div>
      </div>

      {/* Save row */}
      <div style={{ paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding:      '10px 28px',
            background:   saving ? 'rgba(245,158,11,0.4)' : '#f59e0b',
            color:        '#0a0a0a',
            border:       'none',
            borderRadius: '9px',
            fontSize:     '13px',
            fontWeight:   700,
            cursor:       saving ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? 'Salvando…' : 'Salvar plano'}
        </button>
        {saved && <span style={{ fontSize: '12px', color: '#4ade80', fontWeight: 500 }}>✓ Plano salvo</span>}
        {error && <span style={{ fontSize: '12px', color: '#f87171' }}>{error}</span>}
      </div>
    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      style={{
        position:     'relative',
        width:        '40px',
        height:       '22px',
        borderRadius: '11px',
        border:       'none',
        background:   value ? '#f59e0b' : 'rgba(255,255,255,0.12)',
        cursor:       'pointer',
        flexShrink:   0,
        transition:   'background 0.2s',
      }}
    >
      <span style={{
        position:     'absolute',
        top:          '3px',
        left:         value ? '21px' : '3px',
        width:        '16px',
        height:       '16px',
        borderRadius: '50%',
        background:   '#fff',
        transition:   'left 0.2s',
      }} />
    </button>
  )
}
