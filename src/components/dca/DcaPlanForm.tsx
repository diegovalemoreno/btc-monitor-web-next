'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { DcaPlanRow, RiskProfile } from '@/lib/db/types'
import Tooltip from '@/components/shared/Tooltip'

const PROFILES: { value: RiskProfile; label: string; desc: string }[] = [
  { value: 'CONSERVATIVE', label: 'Conservador', desc: 'DCA máximo: NORMAL. Protege contra entradas em topo.' },
  { value: 'MODERATE',     label: 'Moderado',    desc: 'DCA máximo: REFORÇADO. Aumenta aporte em boas janelas.'  },
  { value: 'AGGRESSIVE',   label: 'Agressivo',   desc: 'DCA máximo: AGRESSIVO. Usa reserva total em capitulação.' },
]

interface Props {
  initial: DcaPlanRow | null
  onSaved?: (plan: DcaPlanRow) => void
}

export default function DcaPlanForm({ initial, onSaved }: Props) {
  const router = useRouter()
  const [monthlyAmount,    setMonthlyAmount]    = useState(initial?.monthly_amount_brl?.toString() ?? '')
  const [riskProfile,      setRiskProfile]      = useState<RiskProfile>(initial?.risk_profile ?? 'MODERATE')
  const [reservePct,       setReservePct]       = useState(initial?.reserve_percentage?.toString() ?? '30')
  const [defaultBuyDay,    setDefaultBuyDay]    = useState(initial?.default_buy_day?.toString() ?? '')
  const [enabled,          setEnabled]          = useState(initial?.enabled ?? true)
  const [saving,           setSaving]           = useState(false)
  const [saved,            setSaved]            = useState(false)
  const [error,            setError]            = useState<string | null>(null)

  async function handleSave() {
    const amount = parseFloat(monthlyAmount.replace(',', '.'))
    if (isNaN(amount) || amount <= 0) {
      setError('Informe um valor mensal válido')
      return
    }

    setSaving(true)
    setSaved(false)
    setError(null)

    try {
      const res = await fetch('/api/dca', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          monthly_amount_brl:  amount,
          risk_profile:        riskProfile,
          reserve_percentage:  parseInt(reservePct, 10) || 30,
          default_buy_day:     defaultBuyDay ? parseInt(defaultBuyDay, 10) : null,
          enabled,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao salvar')

      setSaved(true)
      onSaved?.(data.plan)
      // Refresh server component so RecommendationCard shows amounts from new plan
      router.refresh()
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section style={{ marginBottom: '40px' }}>
      <h2 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 16px' }}>
        Configuração do plano DCA
      </h2>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px' }}>

        {/* Enabled */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-dim)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }}>Plano ativo</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Gerar recomendações diárias de aporte</div>
          </div>
          <Toggle value={enabled} onChange={setEnabled} />
        </div>

        {/* Monthly amount */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-dim)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-sec)' }}>
              Valor mensal disponível (R$)
            </label>
            <Tooltip text="Quanto você tem disponível por mês para investir em Bitcoin. Não precisa ser exato — é um guia para calcular o aporte recomendado." />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>R$</span>
            <input
              type="number"
              value={monthlyAmount}
              onChange={(e) => setMonthlyAmount(e.target.value)}
              placeholder="1000"
              min="0"
              step="50"
              style={inputStyle}
            />
          </div>
          <p style={{ margin: '8px 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
            Total disponível para BTC por mês. Não precisa ser o valor exato.
          </p>
        </div>

        {/* Reserve percentage */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-dim)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-sec)' }}>
                Reserva estratégica
              </label>
              <Tooltip text="Parte do valor mensal guardada para momentos raros de queda brusca. Ex: 30% de R$1.000 = R$300 de reserva, usada apenas em DCA Agressivo." />
            </div>
            <span style={{ fontSize: '13px', color: 'var(--orange)', fontWeight: 600 }}>{reservePct}%</span>
          </div>
          <input
            type="range"
            min="0" max="60" step="5"
            value={reservePct}
            onChange={(e) => setReservePct(e.target.value)}
            style={{ width: '100%', accentColor: 'var(--orange)' }}
          />
          <p style={{ margin: '8px 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
            Porcentagem do valor mensal guardada para oportunidades excepcionais (DCA Agressivo).
          </p>
        </div>

        {/* Risk profile */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-dim)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-sec)' }}>Perfil de risco</span>
            <Tooltip text="Define até onde o sistema pode ir nas recomendações. Conservador = mais proteção. Agressivo = aproveita ao máximo as oportunidades de compra." />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {PROFILES.map(({ value, label, desc }) => (
              <label key={value} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="risk_profile"
                  value={value}
                  checked={riskProfile === value}
                  onChange={() => setRiskProfile(value)}
                  style={{ marginTop: '3px', accentColor: 'var(--orange)' }}
                />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>{label}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Default buy day */}
        <div style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-sec)' }}>
              Dia padrão de compra (opcional)
            </label>
            <Tooltip text="Dia do mês em que você costuma fazer seu aporte. Apenas informativo — não afeta o cálculo da recomendação." position="top" />
          </div>
          <input
            type="number"
            value={defaultBuyDay}
            onChange={(e) => setDefaultBuyDay(e.target.value)}
            placeholder="Ex: 5"
            min="1" max="28"
            style={{ ...inputStyle, width: '100px' }}
          />
          <p style={{ margin: '8px 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
            Dia do mês preferido para executar o aporte. Apenas informativo.
          </p>
        </div>

      </div>

      {/* Save */}
      <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding:      '10px 24px',
            background:   saving ? 'var(--orange-dim)' : 'var(--orange)',
            color:        'var(--bg)',
            border:       'none',
            borderRadius: '8px',
            fontSize:     '13px',
            fontWeight:   600,
            cursor:       saving ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? 'Salvando…' : 'Salvar plano'}
        </button>
        {saved && <span style={{ fontSize: '13px', color: '#00C853' }}>✓ Salvo</span>}
        {error && <span style={{ fontSize: '13px', color: '#FF1744' }}>{error}</span>}
      </div>
    </section>
  )
}

const inputStyle: React.CSSProperties = {
  padding:      '8px 12px',
  background:   'var(--surface2)',
  border:       '1px solid var(--border-strong)',
  borderRadius: '6px',
  color:        'var(--text)',
  fontSize:     '13px',
  width:        '160px',
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      style={{
        position:     'relative',
        width:        '44px',
        height:       '24px',
        borderRadius: '12px',
        border:       'none',
        background:   value ? 'var(--orange)' : 'var(--surface3)',
        cursor:       'pointer',
        flexShrink:   0,
        transition:   'background 0.2s',
      }}
    >
      <span style={{
        position:     'absolute',
        top:          '3px',
        left:         value ? '23px' : '3px',
        width:        '18px',
        height:       '18px',
        borderRadius: '50%',
        background:   'var(--text)',
        transition:   'left 0.2s',
      }} />
    </button>
  )
}
