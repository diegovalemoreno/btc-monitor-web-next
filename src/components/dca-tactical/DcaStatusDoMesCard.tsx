'use client'

import { useState } from 'react'
import type { DcaContributionRow, ContributionType } from '@/lib/db/types'
import type { DcaMarketState } from '@/lib/dca-tactical/types'
import Tooltip from '@/components/shared/Tooltip'

const fmt = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

const fmtBTC = (sats: number) =>
  (sats / 1e8).toFixed(8).replace(/0+$/, '').replace(/\.$/, '') + ' BTC'

function applyBRLMask(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  const num = parseInt(digits, 10) / 100
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num)
}

function parseBRLMask(masked: string): number | null {
  // "R$ 386.380,00" → 386380.00
  const digits = masked.replace(/\D/g, '')
  if (!digits) return null
  const num = parseInt(digits, 10) / 100
  return num > 0 ? num : null
}

type MonthStatus = 'not_started' | 'partial' | 'completed' | 'exceeded'

function getMonthStatus(usedTotal: number, tacticalPool: number): MonthStatus {
  if (usedTotal <= 0)             return 'not_started'
  if (usedTotal > tacticalPool)   return 'exceeded'
  if (usedTotal >= tacticalPool)  return 'completed'
  return 'partial'
}

const STATUS_META: Record<MonthStatus, { label: string; color: string; bg: string }> = {
  not_started: { label: 'Não iniciado', color: 'var(--text-muted)',   bg: 'var(--surface3)' },
  partial:     { label: 'Em andamento', color: '#F59E0B',             bg: 'rgba(245,158,11,0.12)' },
  completed:   { label: 'Concluído',    color: '#22C55E',             bg: 'rgba(34,197,94,0.12)' },
  exceeded:    { label: 'Excedido',     color: '#EF4444',             bg: 'rgba(239,68,68,0.12)' },
}

const TYPE_META: Record<ContributionType, { label: string; color: string }> = {
  TACTICAL:       { label: 'Tático',       color: '#00BCD4' },
  STRUCTURAL_DCA: { label: 'DCA Estrutural', color: 'var(--orange)' },
  MANUAL:         { label: 'Manual',       color: 'var(--text-muted)' },
}

interface Props {
  monthlyContribution: number
  structuralDcaAmount: number
  tacticalPool:        number
  contributions:       DcaContributionRow[]
  usedThisMonth:       number
  score:               number
  marketState:         DcaMarketState
  onRegister:          (data: { amount: number; contribution_date: string; contribution_type: ContributionType; notes: string | null; sats_purchased: number | null; btc_price_brl: number | null; effective_price_brl: number | null }) => Promise<void>
  onDelete:            (id: string) => Promise<void>
}

export default function DcaStatusDoMesCard({
  monthlyContribution,
  structuralDcaAmount,
  tacticalPool,
  contributions,
  usedThisMonth,
  score,
  marketState,
  onRegister,
  onDelete,
}: Props) {
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const today = new Date().toISOString().slice(0, 10)
  const [amount,        setAmount]       = useState('')
  const [date,          setDate]         = useState(today)
  const [type,          setType]         = useState<ContributionType>('TACTICAL')
  const [notes,         setNotes]        = useState('')
  const [btcAmount,         setBtcAmount]        = useState('')
  const [btcPriceMask,      setBtcPriceMask]      = useState('')   // cotação do mercado
  const [effectivePriceMask, setEffectivePriceMask] = useState('')  // preço efetivo (com spread/taxa)

  const status = getMonthStatus(usedThisMonth, tacticalPool)
  const meta   = STATUS_META[status]
  const remaining = Math.max(0, tacticalPool - usedThisMonth)
  const pctUsed   = tacticalPool > 0 ? Math.min(100, (usedThisMonth / tacticalPool) * 100) : 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = parseFloat(amount)
    if (!parsed || parsed <= 0) { setFormError('Valor inválido'); return }
    setSubmitting(true)
    setFormError(null)
    try {
      const btcFloat    = btcAmount.trim() ? parseFloat(btcAmount.replace(',', '.')) : null
      const parsedSats  = btcFloat && btcFloat > 0 ? Math.round(btcFloat * 1e8) : null
      const parsedMarketPrice    = parseBRLMask(btcPriceMask)
      const parsedEffectivePrice = parseBRLMask(effectivePriceMask)
      await onRegister({
        amount:              parsed,
        contribution_date:   date,
        contribution_type:   type,
        notes:               notes.trim() || null,
        sats_purchased:      parsedSats,
        btc_price_brl:       parsedMarketPrice,
        effective_price_brl: parsedEffectivePrice,
      })
      setAmount('')
      setDate(today)
      setType('TACTICAL')
      setNotes('')
      setBtcAmount('')
      setBtcPriceMask('')
      setEffectivePriceMask('')
      setShowForm(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao registrar')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try { await onDelete(id) } finally { setDeletingId(null) }
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
        padding:        '16px 24px',
        borderBottom:   '1px solid var(--border-dim)',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        flexWrap:       'wrap',
        gap:            '10px',
      }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Status do Mês — Caixa Tático
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-sec)', marginTop: '2px' }}>
            {fmt(structuralDcaAmount)} estrutural + {fmt(tacticalPool)} tático = {fmt(monthlyContribution)} total
          </div>
        </div>
        <div style={{
          display:      'flex',
          alignItems:   'center',
          gap:          '8px',
        }}>
          <span style={{
            padding:      '4px 10px',
            background:   meta.bg,
            borderRadius: '20px',
            fontSize:     '11px',
            fontWeight:   600,
            color:        meta.color,
          }}>
            {meta.label}
          </span>
          <button
            onClick={() => { setShowForm(s => !s); setFormError(null) }}
            style={{
              padding:      '6px 14px',
              background:   showForm ? 'var(--surface3)' : 'var(--orange)',
              color:        showForm ? 'var(--text-muted)' : 'var(--bg)',
              border:       'none',
              borderRadius: '8px',
              fontSize:     '12px',
              fontWeight:   600,
              cursor:       'pointer',
            }}
          >
            {showForm ? 'Cancelar' : '+ Registrar aporte'}
          </button>
        </div>
      </div>

      {/* Progress */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-dim)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            <span style={{ fontWeight: 600, color: meta.color }}>{fmt(usedThisMonth)}</span> aportados de {fmt(tacticalPool)} no caixa tático
          </span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: meta.color }}>
            {pctUsed.toFixed(0)}%
          </span>
        </div>
        <div style={{ height: '8px', background: 'var(--surface3)', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{
            width:      `${pctUsed.toFixed(1)}%`,
            height:     '8px',
            background: meta.color,
            borderRadius: '4px',
            transition: 'width 0.5s ease',
          }} />
        </div>
      </div>

      {/* Stats row */}
      <div style={{
        display:    'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
        gap:        '1px',
        background: 'var(--border-dim)',
        borderBottom: '1px solid var(--border-dim)',
      }}>
        <StatCell
          label="DCA Estrutural"
          tooltip="Aporte fixo recorrente, executado independente de mercado. Não conta no caixa tático."
          value={fmt(structuralDcaAmount)}
          color="var(--orange)"
        />
        <StatCell
          label="Caixa Tático"
          tooltip="Total disponível para alocação tática este mês = aporte mensal − DCA estrutural."
          value={fmt(tacticalPool)}
        />
        <StatCell
          label="Já aportado"
          tooltip="Soma dos aportes táticos e manuais registrados neste mês."
          value={fmt(usedThisMonth)}
          color={usedThisMonth > 0 ? 'var(--orange)' : undefined}
        />
        <StatCell
          label="Disponível"
          tooltip="Caixa tático ainda disponível para aportar neste mês."
          value={fmt(remaining)}
          color={remaining > 0 ? '#22C55E' : 'var(--text-muted)'}
        />
      </div>

      {/* Register form */}
      {showForm && (
        <form onSubmit={handleSubmit} style={{
          padding:    '20px 24px',
          borderBottom: '1px solid var(--border-dim)',
          background: 'var(--surface2)',
        }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-sec)', marginBottom: '16px' }}>
            Registrar aporte
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '14px' }}>
            {/* Amount */}
            <div>
              <div style={labelStyle}>Valor (R$)</div>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="500"
                min="0.01"
                step="0.01"
                required
                style={inputStyle}
              />
            </div>

            {/* Date */}
            <div>
              <div style={labelStyle}>Data</div>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
                style={inputStyle}
              />
            </div>

            {/* Type */}
            <div>
              <div style={labelStyle}>Tipo</div>
              <select
                value={type}
                onChange={e => setType(e.target.value as ContributionType)}
                style={{ ...inputStyle, paddingRight: '8px' }}
              >
                <option value="TACTICAL">Tático</option>
                <option value="STRUCTURAL_DCA">DCA Estrutural</option>
                <option value="MANUAL">Manual</option>
              </select>
            </div>
          </div>

          {/* BTC + prices */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '14px' }}>
            <div>
              <div style={labelStyle}>BTC comprado (opcional)</div>
              <input
                type="text"
                inputMode="decimal"
                value={btcAmount}
                onChange={e => setBtcAmount(e.target.value)}
                placeholder="0.00244283"
                style={inputStyle}
              />
              {btcAmount && parseFloat(btcAmount.replace(',', '.')) > 0 && (
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px' }}>
                  = {Math.round(parseFloat(btcAmount.replace(',', '.')) * 1e8).toLocaleString('pt-BR')} sats
                </div>
              )}
            </div>
            <div>
              <div style={labelStyle}>Cotação do mercado (opcional)</div>
              <input
                type="text"
                inputMode="numeric"
                value={btcPriceMask}
                onChange={e => setBtcPriceMask(applyBRLMask(e.target.value))}
                placeholder="R$ 386.380,00"
                style={inputStyle}
              />
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px' }}>Preço de referência da corretora</div>
            </div>
            <div>
              <div style={labelStyle}>Preço efetivo (opcional)</div>
              <input
                type="text"
                inputMode="numeric"
                value={effectivePriceMask}
                onChange={e => setEffectivePriceMask(applyBRLMask(e.target.value))}
                placeholder="R$ 387.900,00"
                style={inputStyle}
              />
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px' }}>Com spread e taxas incluídos</div>
            </div>
          </div>

          {/* Notes */}
          <div style={{ marginBottom: '16px' }}>
            <div style={labelStyle}>Notas (opcional)</div>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="ex: aproveitei a queda de 8%"
              style={{ ...inputStyle, width: '100%', maxWidth: '400px' }}
            />
          </div>

          {/* Snapshot info */}
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '14px' }}>
            Score atual: <strong style={{ color: 'var(--text-sec)' }}>{score}</strong> · Estado: <strong style={{ color: 'var(--text-sec)' }}>{marketState}</strong> — será registrado como contexto do aporte.
          </div>

          {formError && (
            <div style={{ fontSize: '12px', color: '#EF4444', marginBottom: '10px' }}>{formError}</div>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding:      '8px 20px',
                background:   submitting ? 'var(--surface3)' : 'var(--orange)',
                color:        submitting ? 'var(--text-muted)' : 'var(--bg)',
                border:       'none',
                borderRadius: '8px',
                fontSize:     '13px',
                fontWeight:   600,
                cursor:       submitting ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? 'Salvando…' : 'Salvar aporte'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setFormError(null) }}
              style={{
                padding:      '8px 16px',
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
        </form>
      )}

      {/* Recent entries */}
      {contributions.length > 0 && (
        <div style={{ padding: '16px 24px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
            Aportes este mês
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {contributions.map(c => {
              const typeMeta = TYPE_META[c.contribution_type]
              const dateLabel = new Date(c.contribution_date + 'T00:00:00')
                .toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
              return (
                <div key={c.id} style={{
                  display:     'flex',
                  alignItems:  'flex-start',
                  gap:         '12px',
                  padding:     '10px 14px',
                  background:  'var(--surface2)',
                  borderRadius: '8px',
                  border:      '1px solid var(--border-dim)',
                }}>
                  {/* Date + type stacked */}
                  <div style={{ minWidth: '90px', flexShrink: 0 }}>
                    <div style={{ fontSize: '12px', color: 'var(--text)', fontWeight: 500, marginBottom: '4px' }}>
                      {dateLabel}
                    </div>
                    <span style={{
                      padding:    '1px 7px',
                      background: `${typeMeta.color}20`,
                      color:      typeMeta.color,
                      borderRadius: '10px',
                      fontSize:   '10px',
                      fontWeight: 600,
                    }}>
                      {typeMeta.label}
                    </span>
                  </div>

                  {/* Notes — grows */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {c.notes
                      ? <span style={{ fontSize: '12px', color: 'var(--text-muted)', wordBreak: 'break-word' }}>{c.notes}</span>
                      : <span style={{ fontSize: '12px', color: 'var(--text-muted)', opacity: 0.4 }}>—</span>
                    }
                  </div>

                  {/* Amount */}
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', fontFamily: "'Courier New', monospace", flexShrink: 0 }}>
                    {fmt(c.amount)}
                  </span>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(c.id)}
                    disabled={deletingId === c.id}
                    title="Remover aporte"
                    style={{
                      background:  'none',
                      border:      'none',
                      color:       deletingId === c.id ? 'var(--text-muted)' : 'rgba(239,68,68,0.6)',
                      cursor:      deletingId === c.id ? 'not-allowed' : 'pointer',
                      fontSize:    '13px',
                      padding:     '2px 4px',
                      borderRadius: '4px',
                      flexShrink:  0,
                    }}
                  >
                    {deletingId === c.id ? '…' : '×'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {contributions.length === 0 && !showForm && (
        <div style={{ padding: '20px 24px', fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
          Nenhum aporte registrado neste mês. Clique em "Registrar aporte" para começar.
        </div>
      )}
    </div>
  )
}

function StatCell({ label, tooltip, value, color }: { label: string; tooltip: string; value: string; color?: string }) {
  return (
    <div style={{ padding: '14px 20px', background: 'var(--surface)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {label}
        </span>
        <Tooltip text={tooltip} position="top" wide />
      </div>
      <div style={{ fontSize: '14px', fontWeight: 700, color: color ?? 'var(--text)', fontFamily: "'Courier New', monospace" }}>
        {value}
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  fontSize:    '11px',
  fontWeight:  500,
  color:       'var(--text-muted)',
  marginBottom: '5px',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
}

const inputStyle: React.CSSProperties = {
  padding:      '8px 12px',
  background:   'var(--surface)',
  border:       '1px solid var(--border-strong)',
  borderRadius: '6px',
  color:        'var(--text)',
  fontSize:     '13px',
  width:        '140px',
}
