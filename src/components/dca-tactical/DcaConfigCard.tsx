'use client'

import { useState } from 'react'
import type { DcaTacticalConfig, DcaStrategyProfile } from '@/lib/dca-tactical/types'

const fmt = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n)

const PROFILES: { value: DcaStrategyProfile; label: string; desc: string }[] = [
  { value: 'CONSERVATIVE', label: 'Conservador', desc: 'Deploya menos capital em cada cenário.' },
  { value: 'BALANCED',     label: 'Equilibrado', desc: 'Comportamento padrão, balanceado.'      },
  { value: 'AGGRESSIVE',   label: 'Agressivo',   desc: 'Usa mais caixa em cenários favoráveis.' },
]

interface Props {
  config:        DcaTacticalConfig
  monthlyAmount: number
  onUpdate:      (updates: Partial<DcaTacticalConfig>) => void
}

export default function DcaConfigCard({ config, monthlyAmount, onUpdate }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState(config)

  function commit() {
    onUpdate(draft)
    setEditing(false)
  }

  function cancel() {
    setDraft(config)
    setEditing(false)
  }

  return (
    <div style={{
      background:   'var(--surface)',
      border:       '1px solid var(--border)',
      borderRadius: '12px',
      overflow:     'hidden',
      marginBottom: '24px',
    }}>
      {/* Header */}
      <div style={{
        padding:      '16px 24px',
        borderBottom: '1px solid var(--border-dim)',
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Configuração DCA Tático
        </div>
        <button
          onClick={() => editing ? cancel() : setEditing(true)}
          style={{
            padding:      '4px 12px',
            background:   editing ? 'var(--surface3)' : 'transparent',
            border:       '1px solid var(--border-strong)',
            borderRadius: '6px',
            color:        'var(--text-muted)',
            fontSize:     '11px',
            cursor:       'pointer',
          }}
        >
          {editing ? 'Cancelar' : 'Editar'}
        </button>
      </div>

      {!editing ? (
        /* Read-only summary */
        <div style={{
          display:   'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap:       '1px',
          background: 'var(--border-dim)',
        }}>
          <Cell label="Aporte mensal"    value={monthlyAmount > 0 ? fmt(monthlyAmount) : '—'} />
          <Cell label="Perfil"           value={PROFILES.find(p => p.value === config.strategyProfile)?.label ?? '—'} />
          <Cell label="DCA estrutural"   value={`${config.structuralDcaPct}%`} />
          <Cell label="Reserva mínima"   value={`${config.minReservePct}%`} />
          <Cell label="Usado este mês"   value={config.usedThisMonth > 0 ? fmt(config.usedThisMonth) : '—'} />
        </div>
      ) : (
        /* Edit form */
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Monthly override (only if no plan) */}
          <Field label="Aporte mensal (R$)" hint="Usado se você não tem plano DCA configurado">
            <input
              type="number"
              value={draft.monthlyAmountOverride ?? monthlyAmount ?? ''}
              onChange={e => setDraft(p => ({ ...p, monthlyAmountOverride: parseFloat(e.target.value) || null }))}
              placeholder="3000"
              min="0"
              step="100"
              style={inputStyle}
            />
          </Field>

          {/* Structural DCA % */}
          <Field
            label={`DCA estrutural: ${draft.structuralDcaPct}%`}
            hint="Parte do aporte sempre executada, independente do cenário"
          >
            <input
              type="range"
              min="20" max="80" step="5"
              value={draft.structuralDcaPct}
              onChange={e => setDraft(p => ({ ...p, structuralDcaPct: parseInt(e.target.value) }))}
              style={{ width: '100%', accentColor: 'var(--orange)' }}
            />
          </Field>

          {/* Min reserve % */}
          <Field
            label={`Reserva tática mínima: ${draft.minReservePct}%`}
            hint="Mínimo a preservar do caixa tático, mesmo em cenários agressivos"
          >
            <input
              type="range"
              min="0" max="50" step="5"
              value={draft.minReservePct}
              onChange={e => setDraft(p => ({ ...p, minReservePct: parseInt(e.target.value) }))}
              style={{ width: '100%', accentColor: 'var(--orange)' }}
            />
          </Field>

          {/* Used this month */}
          <Field label="Já aportei este mês (R$)" hint="Quanto do caixa tático você já usou">
            <input
              type="number"
              value={draft.usedThisMonth || ''}
              onChange={e => setDraft(p => ({ ...p, usedThisMonth: parseFloat(e.target.value) || 0 }))}
              placeholder="0"
              min="0"
              step="50"
              style={{ ...inputStyle, width: '140px' }}
            />
          </Field>

          {/* Strategy profile */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-sec)', marginBottom: '10px' }}>
              Perfil de estratégia
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {PROFILES.map(({ value, label, desc }) => (
                <button
                  key={value}
                  onClick={() => setDraft(p => ({ ...p, strategyProfile: value }))}
                  style={{
                    padding:      '8px 14px',
                    background:   draft.strategyProfile === value ? 'var(--orange-dim)' : 'var(--surface2)',
                    border:       `1px solid ${draft.strategyProfile === value ? 'var(--orange)' : 'var(--border)'}`,
                    borderRadius: '8px',
                    color:        draft.strategyProfile === value ? 'var(--orange)' : 'var(--text-muted)',
                    fontSize:     '12px',
                    fontWeight:   draft.strategyProfile === value ? 600 : 400,
                    cursor:       'pointer',
                  }}
                  title={desc}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', paddingTop: '4px' }}>
            <button
              onClick={commit}
              style={{
                padding:      '9px 22px',
                background:   'var(--orange)',
                color:        'var(--bg)',
                border:       'none',
                borderRadius: '8px',
                fontSize:     '13px',
                fontWeight:   600,
                cursor:       'pointer',
              }}
            >
              Salvar
            </button>
            <button
              onClick={cancel}
              style={{
                padding:      '9px 18px',
                background:   'transparent',
                color:        'var(--text-muted)',
                border:       '1px solid var(--border)',
                borderRadius: '8px',
                fontSize:     '13px',
                cursor:       'pointer',
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: '14px 24px', background: 'var(--surface)' }}>
      <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '3px' }}>
        {label}
      </div>
      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{value}</div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-sec)', marginBottom: '6px' }}>
        {label}
      </div>
      {children}
      {hint && (
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{hint}</div>
      )}
    </div>
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
