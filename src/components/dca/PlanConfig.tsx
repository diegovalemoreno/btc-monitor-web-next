'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { DcaPlanRow, RiskProfile } from '@/lib/db/types'

const fmt = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n)

const PROFILES: { value: RiskProfile; label: string; desc: string }[] = [
  { value: 'CONSERVATIVE', label: 'Conservador', desc: 'Aportes menores em momentos de incerteza.' },
  { value: 'MODERATE',     label: 'Moderado',    desc: 'Balanceia disciplina e aproveitamento de oportunidades.' },
  { value: 'AGGRESSIVE',   label: 'Agressivo',   desc: 'Maximiza aportes em janelas favoráveis de mercado.' },
]

interface Props { initial: DcaPlanRow | null }

export default function PlanConfig({ initial }: Props) {
  const router                      = useRouter()
  const [open,    setOpen]          = useState(false)
  const [monthly, setMonthly]       = useState(initial?.monthly_amount_brl?.toString() ?? '')
  const [risk,    setRisk]          = useState<RiskProfile>(initial?.risk_profile ?? 'MODERATE')
  const [reserve, setReserve]       = useState(initial?.reserve_percentage ?? 30)
  const [saving,  setSaving]        = useState(false)
  const [saved,   setSaved]         = useState(false)
  const [error,   setError]         = useState<string | null>(null)

  async function handleSave() {
    const amount = parseFloat(monthly.replace(',', '.'))
    if (isNaN(amount) || amount <= 0) { setError('Informe um valor mensal válido'); return }
    setSaving(true); setSaved(false); setError(null)
    try {
      const res = await fetch('/api/dca', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          monthly_amount_brl: amount,
          risk_profile:       risk,
          reserve_percentage: reserve,
          enabled:            true,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao salvar')
      setSaved(true)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      background:   'var(--surface)',
      border:       '1px solid var(--border)',
      borderRadius: '12px',
      overflow:     'hidden',
    }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width:          '100%',
          padding:        '14px 20px',
          background:     'none',
          border:         'none',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          cursor:         'pointer',
          color:          'var(--text)',
        }}
      >
        <span style={{ fontSize: '13px', fontWeight: 600 }}>Configurar plano</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
          {initial?.monthly_amount_brl ? fmt(initial.monthly_amount_brl) + '/mês' : 'Não configurado'}
          <span style={{ display: 'inline-block', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
        </span>
      </button>

      {open && (
        <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--border)' }}>

          {/* Monthly amount */}
          <div style={{ marginTop: '20px', marginBottom: '20px' }}>
            <label style={{
              display:       'block',
              marginBottom:  '8px',
              fontSize:      '11px',
              fontWeight:    700,
              color:         'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '1.2px',
            }}>
              Valor mensal disponível
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', color: 'var(--text-sec)' }}>R$</span>
              <input
                type="number"
                value={monthly}
                onChange={e => setMonthly(e.target.value)}
                placeholder="3.000"
                min="0"
                step="50"
                style={{
                  flex:         1,
                  padding:      '10px 14px',
                  background:   'var(--bg)',
                  border:       '1px solid var(--border)',
                  borderRadius: '8px',
                  color:        'var(--text)',
                  fontSize:     '16px',
                  fontWeight:   700,
                }}
              />
            </div>
          </div>

          {/* Risk profile */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display:       'block',
              marginBottom:  '8px',
              fontSize:      '11px',
              fontWeight:    700,
              color:         'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '1.2px',
            }}>
              Perfil de risco
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {PROFILES.map(p => (
                <button
                  key={p.value}
                  onClick={() => setRisk(p.value)}
                  style={{
                    flex:         1,
                    padding:      '10px 12px',
                    background:   risk === p.value ? 'var(--orange-subtle)' : 'var(--surface2)',
                    border:       risk === p.value ? '1px solid var(--border-strong)' : '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '8px',
                    color:        risk === p.value ? 'var(--text)' : 'var(--text-muted)',
                    fontSize:     '12px',
                    fontWeight:   risk === p.value ? 700 : 400,
                    cursor:       'pointer',
                    textAlign:    'center',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <p style={{ margin: '6px 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
              {PROFILES.find(p => p.value === risk)?.desc}
            </p>
          </div>

          {/* Reserve percentage */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{
                fontSize:      '11px',
                fontWeight:    700,
                color:         'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '1.2px',
              }}>
                Reserva para oportunidades
              </label>
              <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--orange)' }}>{reserve}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="60"
              step="5"
              value={reserve}
              onChange={e => setReserve(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--orange)', marginBottom: '6px' }}
            />
            <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>
              {reserve}% do valor mensal reservado para janelas excepcionais de mercado
            </p>
          </div>

          {error && <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#f87171' }}>{error}</p>}
          {saved && <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#4ade80' }}>Plano atualizado.</p>}

          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding:      '10px 24px',
              background:   'var(--orange)',
              border:       'none',
              borderRadius: '8px',
              color:        '#000',
              fontSize:     '13px',
              fontWeight:   700,
              cursor:       saving ? 'wait' : 'pointer',
              opacity:      saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Salvando…' : 'Salvar plano'}
          </button>
        </div>
      )}
    </div>
  )
}
