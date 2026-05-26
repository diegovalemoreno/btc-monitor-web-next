'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { DcaContributionRow, ContributionType } from '@/lib/db/types'
import DcaPatrimonyChart from './DcaPatrimonyChart'
import Tooltip from '@/components/shared/Tooltip'

// ─── Formatters ───────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

const fmtBTC = (sats: number) => {
  const btc = sats / 1e8
  const str = btc.toFixed(8).replace(/\.?0+$/, '')
  return str + ' BTC'
}

const fmtBRL0 = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n)

const fmtK = (n: number) => {
  if (n >= 1_000_000) return 'R$ ' + (n / 1_000_000).toFixed(2).replace('.', ',') + 'M'
  if (n >= 1_000)     return 'R$ ' + Math.round(n / 1_000) + 'k'
  return fmtBRL0(n)
}

function applyBRLMask(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseInt(digits, 10) / 100)
}

function parseBRLMask(masked: string): number | null {
  const digits = masked.replace(/\D/g, '')
  if (!digits) return null
  const num = parseInt(digits, 10) / 100
  return num > 0 ? num : null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_META: Record<ContributionType, { label: string; color: string }> = {
  TACTICAL:       { label: 'Tático',        color: '#00BCD4' },
  STRUCTURAL_DCA: { label: 'DCA Estrutural', color: 'var(--orange)' },
  MANUAL:         { label: 'Manual',         color: 'var(--text-muted)' },
}

const STATE_LABEL: Record<string, string> = {
  DEFENSIVE:  'Defensivo',
  NEUTRAL:    'Neutro',
  FAVORABLE:  'Favorável',
  AGGRESSIVE: 'Agressivo',
}

const MONTHS_PT      = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const MONTHS_PT_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

// ─── Period filter ────────────────────────────────────────────────────────────

type PeriodPreset = 'thisMonth' | 'last30' | 'last12months' | 'all' | 'custom'

const PRESETS: { id: PeriodPreset; label: string }[] = [
  { id: 'thisMonth',    label: 'Este mês' },
  { id: 'last30',       label: 'Últimos 30 dias' },
  { id: 'last12months', label: 'Últimos 12 meses' },
  { id: 'all',          label: 'Todo o período' },
  { id: 'custom',       label: 'Período personalizado' },
]

function getPeriodRange(preset: PeriodPreset, viewMonth: Date, customFrom: string, customTo: string) {
  const now   = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (preset === 'thisMonth')
    return { from: new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1), to: new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0) }
  if (preset === 'last30') {
    const from = new Date(today); from.setDate(from.getDate() - 29); return { from, to: null }
  }
  if (preset === 'last12months')
    return { from: new Date(today.getFullYear(), today.getMonth() - 11, 1), to: null }
  if (preset === 'custom')
    return { from: customFrom ? new Date(customFrom + 'T00:00:00') : null, to: customTo ? new Date(customTo + 'T00:00:00') : null }
  return { from: null, to: null }
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function extractFee(notes: string | null): number | null {
  if (!notes) return null
  const m = notes.match(/taxa R\$(\d+(?:[.,]\d+)?)/)
  if (!m) return null
  return parseFloat(m[1].replace(',', '.'))
}

function efficiencyLabel(diffPct: number): { label: string; color: string } {
  if (diffPct < 2)  return { label: 'Excelente', color: '#22C55E' }
  if (diffPct < 4)  return { label: 'Boa',       color: '#86EFAC' }
  if (diffPct < 6)  return { label: 'Moderada',  color: '#F59E0B' }
  if (diffPct < 10) return { label: 'Alta',       color: '#F97316' }
  return              { label: 'Muito alta',     color: '#EF4444' }
}

function exportToCsv(rows: DcaContributionRow[], filename: string) {
  const headers = ['Data','Tipo','Valor (R$)','BTC','Sats','Cotação (R$/BTC)','Preço efetivo (R$/BTC)','Taxa (R$)','Observações']
  const lines = [headers.join(';')]
  for (const c of rows) {
    const fee   = extractFee(c.notes)
    const notes = c.notes?.split(' · taxa')[0] ?? ''
    lines.push([
      c.contribution_date,
      c.contribution_type,
      c.amount.toFixed(2).replace('.', ','),
      c.sats_purchased ? (c.sats_purchased / 1e8).toFixed(8).replace('.', ',') : '',
      c.sats_purchased ?? '',
      c.btc_price_brl?.toFixed(2).replace('.', ',') ?? '',
      c.effective_price_brl?.toFixed(2).replace('.', ',') ?? '',
      fee?.toFixed(2).replace('.', ',') ?? '',
      `"${notes.replace(/"/g, '""')}"`,
    ].join(';'))
  }
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

interface PriceEvolutionRow {
  label: string; cumAvg: number; cumBtc: number; cumBrl: number; trend: 'up' | 'down' | 'flat' | null
}

function buildPriceEvolution(contributions: DcaContributionRow[]): PriceEvolutionRow[] {
  const withSats = contributions.filter(c => c.sats_purchased && c.sats_purchased > 0 && !c.notes?.includes('Venda'))
  if (withSats.length === 0) return []
  const sorted = [...withSats].sort((a, b) => a.contribution_date.localeCompare(b.contribution_date))
  const ymSet  = new Set<string>()
  for (const c of sorted) {
    const d = new Date(c.contribution_date + 'T00:00:00')
    ymSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  const rows: PriceEvolutionRow[] = []
  let prevAvg: number | null = null
  for (const ym of ymSet) {
    const [y, m]    = ym.split('-').map(Number)
    const endOfMonth = new Date(y, m, 0)
    const cumC      = withSats.filter(c => new Date(c.contribution_date + 'T00:00:00') <= endOfMonth)
    const cumBrl    = cumC.reduce((s, c) => s + c.amount, 0)
    const cumSats   = cumC.reduce((s, c) => s + (c.sats_purchased ?? 0), 0)
    const cumBtc    = cumSats / 1e8
    const cumAvg    = cumBtc > 0 ? cumBrl / cumBtc : 0
    const trend: PriceEvolutionRow['trend'] = prevAvg === null ? null : cumAvg > prevAvg + 100 ? 'up' : cumAvg < prevAvg - 100 ? 'down' : 'flat'
    rows.push({ label: `${MONTHS_PT[m - 1]}/${String(y).slice(2)}`, cumAvg, cumBtc, cumBrl, trend })
    prevAvg = cumAvg
  }
  return rows.reverse()
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ActiveTab = 'consolidacao' | 'evolucao'

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const
type PageSize = typeof PAGE_SIZE_OPTIONS[number]

interface Props { initialContributions: DcaContributionRow[]; initialTab?: ActiveTab; chartCompact?: boolean }

// ─── Main component ───────────────────────────────────────────────────────────

export default function DcaContributionHistory({ initialContributions, initialTab, chartCompact }: Props) {
  const [contributions, setContributions]     = useState<DcaContributionRow[]>(initialContributions)
  const [deletingId, setDeletingId]           = useState<string | null>(null)
  const [filterType, setFilterType]           = useState<ContributionType | 'ALL'>('ALL')
  const [activeTab, setActiveTab]             = useState<ActiveTab>(initialTab ?? 'consolidacao')
  const [expandedId, setExpandedId]           = useState<string | null>(null)
  const [editingContribution, setEditingContribution] = useState<DcaContributionRow | null>(null)

  // Period navigator
  const [viewMonth, setViewMonth]         = useState(() => new Date())
  const [selectedPreset, setSelectedPreset] = useState<PeriodPreset>('thisMonth')
  const [customFrom, setCustomFrom]       = useState('')
  const [customTo, setCustomTo]           = useState('')
  const [showDropdown, setShowDropdown]   = useState(false)
  const [pendingFrom, setPendingFrom]     = useState('')
  const [pendingTo, setPendingTo]         = useState('')
  const dropdownRef                       = useRef<HTMLDivElement>(null)

  // Search
  const [searchText, setSearchText]       = useState('')

  // Pagination
  const [currentPage, setCurrentPage]     = useState(1)
  const [pageSize, setPageSize]           = useState<PageSize>(25)
  const [goToPageInput, setGoToPageInput] = useState('')



  // Close dropdown on outside click
  useEffect(() => {
    if (!showDropdown) return
    const close = (e: MouseEvent | TouchEvent) => {
      if (!dropdownRef.current?.contains(e.target as Node)) setShowDropdown(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('touchstart', close)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('touchstart', close) }
  }, [showDropdown])

  const now = new Date()
  const isAtCurrentMonth = viewMonth.getFullYear() === now.getFullYear() && viewMonth.getMonth() === now.getMonth()

  function prevMonth() { setViewMonth(m => { const d = new Date(m); d.setMonth(d.getMonth() - 1); return d }); setSelectedPreset('thisMonth'); setShowDropdown(false) }
  function nextMonth()  { if (isAtCurrentMonth) return; setViewMonth(m => { const d = new Date(m); d.setMonth(d.getMonth() + 1); return d }); setSelectedPreset('thisMonth'); setShowDropdown(false) }
  function selectPreset(p: PeriodPreset) {
    setSelectedPreset(p); setShowDropdown(false)
    if (p === 'thisMonth') setViewMonth(new Date())
    if (p === 'custom') { setPendingFrom(customFrom); setPendingTo(customTo) }
  }

  const navLabel = selectedPreset === 'thisMonth'
    ? `${MONTHS_PT_FULL[viewMonth.getMonth()]} de ${viewMonth.getFullYear()}`
    : PRESETS.find(p => p.id === selectedPreset)?.label ?? ''

  // Filtering
  const { from, to } = getPeriodRange(selectedPreset, viewMonth, customFrom, customTo)
  const periodFiltered = contributions.filter(c => {
    const d = new Date(c.contribution_date + 'T00:00:00')
    if (from && d < from) return false
    if (to   && d > to)   return false
    return true
  })
  const typeFiltered = filterType === 'ALL' ? periodFiltered : periodFiltered.filter(c => c.contribution_type === filterType)
  const searchFiltered = searchText.trim()
    ? typeFiltered.filter(c => (c.notes?.split(' · taxa')[0] ?? '').toLowerCase().includes(searchText.toLowerCase()))
    : typeFiltered

  // Reset page on filter change
  const filteredKey = `${filterType}|${selectedPreset}|${customFrom}|${customTo}|${viewMonth.getFullYear()}-${viewMonth.getMonth()}|${searchText}`
  useEffect(() => { setCurrentPage(1) }, [filteredKey])

  // Pagination
  const totalItems = searchFiltered.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const safePage   = Math.min(currentPage, totalPages)
  const startIdx   = (safePage - 1) * pageSize
  const endIdx     = Math.min(startIdx + pageSize, totalItems)
  const pageItems  = searchFiltered.slice(startIdx, endIdx)

  // Group by month
  const groups = pageItems.reduce<Record<string, DcaContributionRow[]>>((acc, c) => {
    const d   = new Date(c.contribution_date + 'T00:00:00')
    const key = d.toLocaleDateString('pt-BR', { year: 'numeric', month: 'long' })
    acc[key]  = acc[key] ?? []; acc[key].push(c); return acc
  }, {})
  const monthKeys = Object.keys(groups)

  // ── Cost analytics — current period filter ──
  const periodBtcPurchases = periodFiltered.filter(c => c.sats_purchased && c.sats_purchased > 0 && !c.notes?.includes('Venda'))
  const periodFeesKnown    = periodBtcPurchases.filter(c => extractFee(c.notes) !== null)
  const periodTotalFees    = periodFeesKnown.reduce((s, c) => s + (extractFee(c.notes) ?? 0), 0)
  const periodTotalSpread  = periodBtcPurchases.filter(c => c.effective_price_brl && c.btc_price_brl)
    .reduce((s, c) => s + (c.effective_price_brl! - c.btc_price_brl!) * (c.sats_purchased! / 1e8), 0)
  const periodImpact = periodTotalFees + Math.max(0, periodTotalSpread - periodTotalFees)

  // ── Period strip stats ──
  const filteredPurchases = searchFiltered.filter(c => !c.notes?.includes('Venda'))
  const periodStripBRL    = filteredPurchases.reduce((s, c) => s + c.amount, 0)
  const periodStripSats   = filteredPurchases.reduce((s, c) => s + (c.sats_purchased ?? 0), 0)
  const periodStripFees   = searchFiltered.reduce((s, c) => s + (extractFee(c.notes) ?? 0), 0)

  const priceEvolution = useMemo(() => buildPriceEvolution(contributions), [contributions])

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/dca/contributions/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Falha')
      setContributions(prev => prev.filter(c => c.id !== id))
    } catch { alert('Erro ao remover aporte. Tente novamente.') }
    finally  { setDeletingId(null) }
  }

  function handleSaveEdit(updated: DcaContributionRow) {
    setContributions(prev => prev.map(c => c.id === updated.id ? updated : c))
    setEditingContribution(null)
  }

  function handleGoToPage(e: React.FormEvent) {
    e.preventDefault()
    const n = parseInt(goToPageInput, 10)
    if (!isNaN(n) && n >= 1 && n <= totalPages) { setCurrentPage(n); setGoToPageInput('') }
  }

  function getCsvFilename() {
    if (selectedPreset === 'thisMonth') return `aportes-${viewMonth.getFullYear()}-${String(viewMonth.getMonth() + 1).padStart(2, '0')}.csv`
    if (selectedPreset === 'last30')       return 'aportes-ultimos-30-dias.csv'
    if (selectedPreset === 'last12months') return 'aportes-ultimos-12-meses.csv'
    if (selectedPreset === 'custom')       return `aportes-${customFrom || 'inicio'}-ate-${customTo || 'hoje'}.csv`
    return 'aportes-historico-completo.csv'
  }

  // ── Shared styles ──
  const tabBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: '11px 22px',
    background: 'none',
    border: 'none',
    borderBottom: `2px solid ${active ? 'var(--orange)' : 'transparent'}`,
    color: active ? 'var(--orange)' : 'var(--text-muted)',
    fontSize: '13px',
    fontWeight: active ? 600 : 400,
    cursor: 'pointer',
    marginBottom: '-1px',
    whiteSpace: 'nowrap',
    transition: 'color 0.15s',
  })

  return (
    <div>

      {/* Edit modal */}
      {editingContribution && typeof document !== 'undefined' && (
        <EditContributionModal
          contribution={editingContribution}
          onClose={() => setEditingContribution(null)}
          onSave={handleSaveEdit}
        />
      )}

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '28px', borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
        <button onClick={() => setActiveTab('consolidacao')} style={tabBtnStyle(activeTab === 'consolidacao')}>Consolidação de Aportes</button>
        <button onClick={() => setActiveTab('evolucao')}     style={tabBtnStyle(activeTab === 'evolucao')}>Evolução do Preço Médio</button>
      </div>

      {/* ══════════════════════════════════════════════════════════
          Tab 1 — Consolidação de Aportes
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'consolidacao' && (
        <div>

          {/* Chart */}
          <DcaPatrimonyChart contributions={periodFiltered} compact={chartCompact} />

          {/* Controls bar */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '12px' }}>

            {/* Month navigator */}
            <div ref={dropdownRef} style={{ position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'stretch', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', background: 'var(--surface)' }}>
                <button onClick={prevMonth} title="Mês anterior" style={{ padding: '7px 12px', background: 'transparent', border: 'none', borderRight: '1px solid var(--border-dim)', color: 'var(--text-sec)', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>‹</button>
                <button onClick={() => setShowDropdown(v => !v)} style={{ padding: '7px 14px', background: 'transparent', border: 'none', color: 'var(--text)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  {navLabel}
                  <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>▾</span>
                </button>
                <button onClick={nextMonth} disabled={isAtCurrentMonth} title="Próximo mês" style={{ padding: '7px 12px', background: 'transparent', border: 'none', borderLeft: '1px solid var(--border-dim)', color: isAtCurrentMonth ? 'var(--text-muted)' : 'var(--text-sec)', fontSize: '16px', cursor: isAtCurrentMonth ? 'not-allowed' : 'pointer', opacity: isAtCurrentMonth ? 0.3 : 1, display: 'flex', alignItems: 'center' }}>›</button>
              </div>
              {showDropdown && (
                <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', zIndex: 200, minWidth: '210px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
                  {PRESETS.map(p => (
                    <button key={p.id} onClick={() => selectPreset(p.id)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', background: selectedPreset === p.id ? 'rgba(99,102,241,0.1)' : 'transparent', border: 'none', borderBottom: '1px solid var(--border-dim)', color: selectedPreset === p.id ? '#818cf8' : 'var(--text-sec)', fontSize: '13px', cursor: 'pointer' }}>
                      {p.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Type filter pills */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {(['ALL', 'TACTICAL', 'STRUCTURAL_DCA', 'MANUAL'] as const).map(t => (
                <button key={t} onClick={() => setFilterType(t)} style={{ padding: '6px 14px', background: filterType === t ? 'rgba(99,102,241,0.15)' : 'var(--surface)', border: `1px solid ${filterType === t ? '#6366F1' : 'var(--border)'}`, borderRadius: '20px', color: filterType === t ? '#818cf8' : 'var(--text-muted)', fontSize: '12px', fontWeight: filterType === t ? 600 : 400, cursor: 'pointer' }}>
                  {t === 'ALL' ? 'Todos' : TYPE_META[t as ContributionType].label}
                </button>
              ))}
            </div>

            {/* Spacer */}
            <div style={{ flex: 1, minWidth: '12px' }} />

            {/* Search */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span style={{ position: 'absolute', left: '10px', fontSize: '13px', color: 'var(--text-muted)', pointerEvents: 'none' }}>⌕</span>
              <input
                type="text"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                placeholder="Buscar por descrição…"
                style={{
                  padding: '7px 10px 7px 30px',
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: '8px', color: 'var(--text)', fontSize: '13px',
                  width: '200px', outline: 'none',
                }}
              />
              {searchText && (
                <button onClick={() => setSearchText('')} style={{ position: 'absolute', right: '8px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px', padding: '0', lineHeight: 1 }}>×</button>
              )}
            </div>

            {/* CSV export */}
            <button
              onClick={() => exportToCsv(searchFiltered, getCsvFilename())}
              disabled={searchFiltered.length === 0}
              title="Exportar para CSV"
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '7px 14px',
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: '8px', color: 'var(--text-sec)',
                fontSize: '12px', fontWeight: 500, cursor: searchFiltered.length === 0 ? 'not-allowed' : 'pointer',
                opacity: searchFiltered.length === 0 ? 0.5 : 1,
                whiteSpace: 'nowrap',
              }}
            >
              ↓ CSV
            </button>
          </div>

          {/* Custom date panel */}
          {selectedPreset === 'custom' && (
            <div style={{ marginBottom: '14px', padding: '14px 18px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', display: 'flex', gap: '14px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '5px' }}>Data inicial</label>
                <input type="date" value={pendingFrom} onChange={e => setPendingFrom(e.target.value)} style={{ padding: '7px 10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px' }} />
              </div>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)', paddingBottom: '8px' }}>até</span>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '5px' }}>Data final</label>
                <input type="date" value={pendingTo} onChange={e => setPendingTo(e.target.value)} style={{ padding: '7px 10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px' }} />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setSelectedPreset('thisMonth')} style={{ padding: '7px 16px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-sec)', fontSize: '13px', cursor: 'pointer' }}>Cancelar</button>
                <button onClick={() => { setCustomFrom(pendingFrom); setCustomTo(pendingTo) }} style={{ padding: '7px 16px', background: '#6366F1', border: '1px solid #6366F1', borderRadius: '6px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Aplicar filtro</button>
              </div>
            </div>
          )}

          {/* Period summary strip */}
          {searchFiltered.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', marginBottom: '20px', overflow: 'hidden' }}>
              <PeriodStat label="Total no período"  value={fmt(periodStripBRL)}  color="var(--orange)" />
              {periodStripSats > 0 && <PeriodStat label="Sats comprados" value={periodStripSats.toLocaleString('pt-BR') + ' sats'} color="#F7931A" />}
              {periodStripFees > 0 && <PeriodStat label="Taxas pagas"    value={fmt(periodStripFees)}  color="#F59E0B" />}
              <PeriodStat label="Aportes" value={String(searchFiltered.length)} />
              {searchText && <PeriodStat label="Filtro ativo" value={`"${searchText}"`} color="#818cf8" />}
            </div>
          )}

          {/* Fee analysis for current period */}
          {periodFeesKnown.length > 0 && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', marginBottom: '24px', overflow: 'hidden' }}>
              <div style={{ padding: '11px 18px', borderBottom: '1px solid var(--border-dim)', fontSize: '11px', fontWeight: 600, color: 'var(--text-sec)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Análise de custos · {PRESETS.find(p => p.id === selectedPreset)?.label ?? navLabel}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                <FeeMetric label="Taxas pagas"      value={fmt(periodTotalFees)}  color="#F59E0B" hint="Taxa explícita"          tooltip={'Soma das taxas explícitas pagas no período selecionado.\n\nExtraídas das notas no formato "taxa R$X".'} />
                <FeeMetric label="Spread acumulado" value={fmt(Math.max(0, periodTotalSpread - periodTotalFees))} color="#F97316" hint="Custo oculto" tooltip={"Diferença entre cotação de referência e preço efetivo pago, excluindo taxas explícitas."} />
                <FeeMetric label="Impacto total"    value={fmt(periodImpact)}     color="#EF4444" hint="Taxas + spread"          tooltip={"Custo total pago acima do preço de mercado no período."} />
                <FeeMetric label="Aportes"          value={`${periodFeesKnown.length}`}           hint="Com dados de custo"   tooltip={"Aportes com dados de taxa registrados no período."} />
              </div>
            </div>
          )}

          {/* No results */}
          {monthKeys.length === 0 && (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px' }}>
              {searchText ? `Nenhum aporte encontrado para "${searchText}"` : 'Nenhum aporte encontrado no período selecionado.'}
            </div>
          )}

          {/* Grouped list */}
          {monthKeys.map(monthKey => {
            const items      = groups[monthKey]
            const purchases  = items.filter(c => !c.notes?.includes('Venda'))
            const monthTotal = purchases.reduce((s, c) => s + c.amount, 0)
            const monthSats  = purchases.reduce((s, c) => s + (c.sats_purchased ?? 0), 0)
            const monthFees  = items.reduce((s, c) => s + (extractFee(c.notes) ?? 0), 0)

            return (
              <div key={monthKey} style={{ marginBottom: '28px' }}>
                {/* Month label */}
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-sec)', textTransform: 'capitalize', marginBottom: '8px', padding: '0 2px' }}>
                  {monthKey}
                </div>

                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                  {/* Contribution rows */}
                  {items.map((c, idx) => {
                    const typeMeta     = TYPE_META[c.contribution_type]
                    const d            = new Date(c.contribution_date + 'T00:00:00')
                    const dateStr      = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
                    const isExpanded   = expandedId === c.id
                    const isVenda      = c.notes?.includes('Venda') || false
                    const fee          = extractFee(c.notes)
                    const hasPriceData = c.effective_price_brl && c.btc_price_brl
                    const diffPct      = hasPriceData ? ((c.effective_price_brl! - c.btc_price_brl!) / c.btc_price_brl!) * 100 : null
                    const efficiency   = diffPct !== null ? efficiencyLabel(diffPct) : null

                    return (
                      <div key={c.id} style={{ borderTop: idx > 0 ? '1px solid var(--border-dim)' : 'none' }}>
                        <div
                          className="contrib-row"
                          style={{ cursor: hasPriceData ? 'pointer' : 'default', background: isExpanded ? 'rgba(99,102,241,0.04)' : 'transparent' }}
                          onClick={() => hasPriceData && setExpandedId(isExpanded ? null : c.id)}
                        >
                          <div className="contrib-date" style={{ minWidth: '100px', flexShrink: 0 }}>
                            <div style={{ fontSize: '12px', color: 'var(--text)', fontWeight: 500 }}>{dateStr}</div>
                          </div>

                          <div className="contrib-notes" style={{ flex: 1, minWidth: 0 }}>
                            {c.notes
                              ? <div style={{ fontSize: '12px', color: 'var(--text-sec)', wordBreak: 'break-word' }}>{c.notes.split(' · taxa')[0]}</div>
                              : c.market_state_snapshot
                                ? null
                                : <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>—</div>
                            }
                            {c.market_state_snapshot && (
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>
                                Score {c.market_score_snapshot ?? '—'} · {STATE_LABEL[c.market_state_snapshot] ?? c.market_state_snapshot}
                              </div>
                            )}
                          </div>

                          <div className="contrib-btc" style={{ minWidth: '130px', flexShrink: 0, textAlign: 'right' }}>
                            {c.sats_purchased && !isVenda
                              ? <div style={{ fontSize: '12px', color: '#F7931A', fontWeight: 600, fontFamily: "'Courier New', monospace", marginBottom: '2px' }}>{fmtBTC(c.sats_purchased)}</div>
                              : <div style={{ fontSize: '12px', color: 'var(--text-muted)', opacity: 0.3, marginBottom: '2px' }}>—</div>
                            }
                            {c.effective_price_brl && (
                              <div style={{ fontSize: '10px', color: 'var(--text-sec)', fontFamily: "'Courier New', monospace" }}>
                                <span style={{ fontFamily: 'sans-serif', color: 'var(--text-muted)' }}>efetivo </span>{fmtBRL0(c.effective_price_brl)}/BTC
                              </div>
                            )}
                          </div>

                          <span className="contrib-badge" style={{ padding: '2px 8px', background: `${typeMeta.color}20`, color: typeMeta.color, borderRadius: '12px', fontSize: '10px', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
                            {typeMeta.label}
                          </span>

                          <span className="contrib-amount" style={{ fontSize: '14px', fontWeight: 700, color: isVenda ? '#22C55E' : 'var(--text)', fontFamily: "'Courier New', monospace", textAlign: 'right', whiteSpace: 'nowrap', flexShrink: 0 }}>
                            {isVenda ? '+' : ''}{fmt(c.amount)}
                          </span>

                          {hasPriceData && (
                            <span className="contrib-expand" style={{ fontSize: '10px', color: 'var(--text-muted)', flexShrink: 0 }}>{isExpanded ? '▲' : '▼'}</span>
                          )}

                          {/* Edit button — visible & prominent */}
                          <button
                            className="contrib-edit"
                            onClick={e => { e.stopPropagation(); setEditingContribution(c) }}
                            title="Editar aporte"
                            style={{
                              background: 'rgba(99,102,241,0.15)',
                              border: '1px solid rgba(99,102,241,0.35)',
                              borderRadius: '5px',
                              color: '#818cf8',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: 600,
                              padding: '3px 8px',
                              flexShrink: 0,
                              lineHeight: 1.3,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            ✎
                          </button>

                          {/* Delete button */}
                          <button
                            className="contrib-delete"
                            onClick={e => { e.stopPropagation(); handleDelete(c.id) }}
                            disabled={deletingId === c.id}
                            title="Remover aporte"
                            style={{
                              background: 'rgba(239,68,68,0.1)',
                              border: '1px solid rgba(239,68,68,0.25)',
                              borderRadius: '5px',
                              color: deletingId === c.id ? 'var(--text-muted)' : 'rgba(239,68,68,0.8)',
                              cursor: deletingId === c.id ? 'not-allowed' : 'pointer',
                              fontSize: '14px',
                              padding: '2px 7px',
                              lineHeight: 1.3,
                              flexShrink: 0,
                            }}
                          >
                            {deletingId === c.id ? '…' : '×'}
                          </button>
                        </div>

                        {/* Expanded fee breakdown */}
                        {isExpanded && hasPriceData && (
                          <div style={{ padding: '12px 20px 16px', background: 'rgba(99,102,241,0.04)', borderTop: '1px solid var(--border-dim)' }}>
                            <table style={{ fontSize: '11px', borderCollapse: 'collapse', width: '100%', maxWidth: '400px' }}>
                              <tbody>
                                <FeeRow label="Cotação BTC"       value={fmtBRL0(c.btc_price_brl!)} />
                                <FeeRow label="Seu preço efetivo" value={fmtBRL0(c.effective_price_brl!)} valueColor="#F59E0B" />
                                {diffPct !== null && <FeeRow label="Diferença" value={`+${diffPct.toFixed(2).replace('.', ',')}%`} valueColor={diffPct > 8 ? '#EF4444' : diffPct > 4 ? '#F59E0B' : '#22C55E'} />}
                                {fee !== null && <FeeRow label="Taxa paga" value={fmt(fee)} valueColor="#F97316" />}
                                {efficiency && <FeeRow label="Eficiência" value={efficiency.label} valueColor={efficiency.color} />}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* Month footer totals */}
                  <div style={{ borderTop: '1px solid var(--border-dim)', padding: '10px 20px', background: 'rgba(0,0,0,0.12)', display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--orange)', fontFamily: "'Courier New', monospace" }}>{fmt(monthTotal)}</span>
                    {monthSats > 0 && (
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#F7931A', fontFamily: "'Courier New', monospace" }}>{monthSats.toLocaleString('pt-BR')} sats</span>
                    )}
                    {monthFees > 0 && (
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#F59E0B', fontFamily: "'Courier New', monospace" }}>taxa {fmt(monthFees)}</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {/* Pagination */}
          {totalItems > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', padding: '14px 20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', marginTop: '8px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                Mostrando <strong style={{ color: 'var(--text)' }}>{startIdx + 1}–{endIdx}</strong> de <strong style={{ color: 'var(--text)' }}>{totalItems}</strong> registros
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <PageBtn onClick={() => setCurrentPage(1)}             disabled={safePage === 1}          label="«" title="Primeira" />
                <PageBtn onClick={() => setCurrentPage(p => p - 1)}    disabled={safePage === 1}          label="‹" title="Anterior" />
                <span style={{ fontSize: '12px', color: 'var(--text)', padding: '0 8px', whiteSpace: 'nowrap' }}>Página <strong>{safePage}</strong> / <strong>{totalPages}</strong></span>
                <PageBtn onClick={() => setCurrentPage(p => p + 1)}    disabled={safePage === totalPages} label="›" title="Próxima" />
                <PageBtn onClick={() => setCurrentPage(totalPages)}     disabled={safePage === totalPages} label="»" title="Última" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <form onSubmit={handleGoToPage} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Ir para</label>
                  <input type="number" min={1} max={totalPages} value={goToPageInput} onChange={e => setGoToPageInput(e.target.value)} placeholder={String(safePage)} style={{ width: '52px', padding: '4px 8px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '12px', textAlign: 'center' }} />
                  <button type="submit" style={{ padding: '4px 10px', background: 'var(--surface3)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-sec)', fontSize: '11px', cursor: 'pointer' }}>Ir</button>
                </form>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Por página</label>
                  <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value) as PageSize); setCurrentPage(1) }} style={{ padding: '4px 8px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '12px', cursor: 'pointer' }}>
                    {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          Tab 3 — Evolução do Preço Médio
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'evolucao' && (
        <div>
          {priceEvolution.length > 0 ? (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-dim)' }}>
                      {(['Mês','Preço médio acumulado','BTC acumulado','Total investido'] as const).map(h => (
                        <th key={h} style={{ padding: '10px 20px', fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500, textAlign: h === 'Mês' ? 'left' : 'right', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {priceEvolution.map((row, idx) => (
                      <tr key={row.label} style={{ borderTop: idx > 0 ? '1px solid var(--border-dim)' : 'none' }}>
                        <td style={{ padding: '10px 20px', fontSize: '13px', color: 'var(--text)', fontWeight: 500, whiteSpace: 'nowrap' }}>{row.label}</td>
                        <td style={{ padding: '10px 20px', textAlign: 'right', fontFamily: "'Courier New', monospace", fontSize: '13px', fontWeight: 700, color: '#22C55E', whiteSpace: 'nowrap' }}>
                          {fmtK(row.cumAvg)}/BTC
                          {row.trend && <span style={{ marginLeft: '6px', fontSize: '11px', color: row.trend === 'up' ? '#EF4444' : row.trend === 'down' ? '#22C55E' : 'var(--text-muted)' }}>{row.trend === 'up' ? '↑' : row.trend === 'down' ? '↓' : '—'}</span>}
                        </td>
                        <td style={{ padding: '10px 20px', textAlign: 'right', fontFamily: "'Courier New', monospace", fontSize: '12px', color: '#F7931A', whiteSpace: 'nowrap' }}>{fmtBTC(Math.round(row.cumBtc * 1e8))}</td>
                        <td style={{ padding: '10px 20px', textAlign: 'right', fontFamily: "'Courier New', monospace", fontSize: '12px', color: 'var(--text-sec)', whiteSpace: 'nowrap' }}>{fmt(row.cumBrl)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>Nenhum dado de preço disponível.</div>
          )}
        </div>
      )}

    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function EditContributionModal({ contribution, onClose, onSave }: {
  contribution: DcaContributionRow; onClose: () => void; onSave: (u: DcaContributionRow) => void
}) {
  const fee       = extractFee(contribution.notes)
  const baseNotes = contribution.notes?.split(' · taxa')[0] ?? ''

  const [amountMask, setAmountMask]             = useState(contribution.amount ? applyBRLMask(String(Math.round(contribution.amount * 100))) : '')
  const [date, setDate]                         = useState(contribution.contribution_date)
  const [type, setType]                         = useState<ContributionType>(contribution.contribution_type)
  const [btcInput, setBtcInput]                 = useState(contribution.sats_purchased ? (contribution.sats_purchased / 1e8).toFixed(8).replace(/\.?0+$/, '') : '')
  const [btcPriceMask, setBtcPriceMask]         = useState(contribution.btc_price_brl ? applyBRLMask(String(Math.round(contribution.btc_price_brl * 100))) : '')
  const [outrosCustosMask, setOutrosCustosMask] = useState(fee ? applyBRLMask(String(Math.round(fee * 100))) : '')
  const [notes, setNotes]                       = useState(baseNotes)
  const [saving, setSaving]                     = useState(false)
  const [error, setError]                       = useState<string | null>(null)

  const parsedAmount       = parseBRLMask(amountMask) ?? 0
  const parsedSats         = btcInput ? Math.round(parseFloat(btcInput.replace(',', '.')) * 1e8) : null
  const parsedBtcPrice     = parseBRLMask(btcPriceMask) ?? 0
  const parsedOutrosCustos = parseBRLMask(outrosCustosMask) ?? 0
  const calcEffective      = parsedSats && parsedSats > 0 && parsedAmount > 0 ? (parsedAmount + parsedOutrosCustos) / (parsedSats / 1e8) : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!parsedAmount || parsedAmount <= 0) { setError('Informe o valor do aporte'); return }
    setSaving(true); setError(null)
    const notesWithFee = parsedOutrosCustos > 0
      ? (notes.trim() ? `${notes.trim()} · taxa R$${parsedOutrosCustos.toFixed(2)}` : `taxa R$${parsedOutrosCustos.toFixed(2)}`)
      : (notes.trim() || null)
    const patch: Record<string, unknown> = { amount: parsedAmount, contribution_date: date, contribution_type: type, notes: notesWithFee }
    if (parsedSats && parsedSats > 0) {
      patch.sats_purchased = parsedSats
      if (parsedBtcPrice > 0) { patch.btc_price_brl = parsedBtcPrice; patch.effective_price_brl = calcEffective }
    } else {
      patch.sats_purchased = null; patch.btc_price_brl = null; patch.effective_price_brl = null
    }
    try {
      const res = await fetch(`/api/dca/contributions/${contribution.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
      if (!res.ok) { const d = await res.json() as { error?: string }; throw new Error(d.error ?? 'Erro ao salvar') }
      const { contribution: updated } = await res.json() as { contribution: DcaContributionRow }
      onSave(updated)
    } catch (err) { setError(err instanceof Error ? err.message : 'Erro ao salvar') }
    finally { setSaving(false) }
  }

  const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)', fontSize: '14px', boxSizing: 'border-box' }
  const lbl: React.CSSProperties = { display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={onClose}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '24px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>Editar aporte</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '18px', cursor: 'pointer', padding: '2px 6px' }}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div><label style={lbl}>Valor *</label><input type="text" inputMode="numeric" value={amountMask} onChange={e => setAmountMask(applyBRLMask(e.target.value))} placeholder="R$ 0,00" style={inp} /></div>
            <div><label style={lbl}>Data *</label><input type="date" value={date} onChange={e => setDate(e.target.value)} style={inp} /></div>
          </div>
          <div style={{ marginBottom: '14px' }}><label style={lbl}>Tipo</label><select value={type} onChange={e => setType(e.target.value as ContributionType)} style={{ ...inp, cursor: 'pointer' }}>{(Object.entries(TYPE_META) as [ContributionType, { label: string }][]).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div><label style={lbl}>BTC comprado</label><input type="text" inputMode="decimal" value={btcInput} onChange={e => setBtcInput(e.target.value)} placeholder="0.00000000" style={inp} /></div>
            <div><label style={lbl}>Cotação do mercado</label><input type="text" inputMode="numeric" value={btcPriceMask} onChange={e => setBtcPriceMask(applyBRLMask(e.target.value))} placeholder="R$ 0,00" style={inp} /></div>
          </div>
          <div style={{ marginBottom: '14px' }}><label style={lbl}>Outros custos (opcional)</label><input type="text" inputMode="numeric" value={outrosCustosMask} onChange={e => setOutrosCustosMask(applyBRLMask(e.target.value))} placeholder="R$ 0,00" style={inp} /></div>
          {calcEffective !== null && (
            <div style={{ padding: '10px 14px', marginBottom: '14px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-sec)' }}>
              Preço efetivo: <strong style={{ color: '#22C55E', fontFamily: "'Courier New', monospace" }}>{fmtBRL0(calcEffective)}/BTC</strong>
            </div>
          )}
          <div style={{ marginBottom: '20px' }}><label style={lbl}>Observações</label><textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas opcionais…" rows={2} style={{ ...inp, resize: 'vertical', lineHeight: 1.5 }} /></div>
          {error && <div style={{ color: '#EF4444', fontSize: '12px', marginBottom: '14px', padding: '10px 14px', background: 'rgba(239,68,68,0.08)', borderRadius: '6px' }}>{error}</div>}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding: '9px 20px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-sec)', fontSize: '13px', cursor: 'pointer' }}>Cancelar</button>
            <button type="submit" disabled={saving} style={{ padding: '9px 20px', background: '#6366F1', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>{saving ? 'Salvando…' : 'Salvar alterações'}</button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

function PageBtn({ onClick, disabled, label, title }: { onClick: () => void; disabled: boolean; label: string; title?: string }) {
  return (
    <button onClick={onClick} disabled={disabled} title={title} style={{ padding: '4px 10px', minWidth: '32px', background: disabled ? 'transparent' : 'var(--surface3)', border: '1px solid var(--border)', borderRadius: '6px', color: disabled ? 'var(--text-muted)' : 'var(--text)', fontSize: '14px', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1 }}>{label}</button>
  )
}

function PeriodStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ padding: '10px 20px', flex: '1 1 120px', borderRight: '1px solid var(--border-dim)' }}>
      <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '3px' }}>{label}</div>
      <div style={{ fontSize: '14px', fontWeight: 700, color: color ?? 'var(--text)', fontFamily: "'Courier New', monospace" }}>{value}</div>
    </div>
  )
}

function FeeRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <tr>
      <td style={{ padding: '3px 16px 3px 0', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{label}</td>
      <td style={{ padding: '3px 0', color: valueColor ?? 'var(--text)', fontWeight: 600, fontFamily: "'Courier New', monospace" }}>{value}</td>
    </tr>
  )
}

function FeeMetric({ label, value, color, hint, tooltip }: { label: string; value: string; color?: string; hint?: string; tooltip?: string }) {
  return (
    <div style={{ padding: '12px 18px', flex: '1 1 130px', borderRight: '1px solid var(--border-dim)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
        {tooltip && <Tooltip text={tooltip} position="bottom" wide />}
      </div>
      <div style={{ fontSize: '15px', fontWeight: 700, color: color ?? 'var(--text)', fontFamily: "'Courier New', monospace" }}>{value}</div>
      {hint && <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{hint}</div>}
    </div>
  )
}
