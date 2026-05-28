'use client'

import { useState, useEffect, useCallback } from 'react'
import type { DcaPlanRow, RiskProfile, DcaContributionRow } from '@/lib/db/types'
import type { DcaTacticalConfig, DcaAllocation, DcaIndicatorSignal, DcaMarketState } from '@/lib/dca-tactical/types'
import { DEFAULT_TACTICAL_CONFIG } from '@/lib/dca-tactical/types'
import type { DcaStrategyProfile } from '@/lib/dca-tactical/types'
import { calculateDcaOpportunityScore, classifyDcaMarketState, buildIndicatorSignals } from '@/lib/dca-tactical/score'
import { calculateDcaAllocation } from '@/lib/dca-tactical/allocation'
import type { IndicatorGroup } from '@lib/shared/types/signal'
import { STATE_COLOR, STATE_LABEL } from './DcaScoreGauge'

import DcaRecommendationCard from './DcaRecommendationCard'
import DcaIndicatorBreakdown from './DcaIndicatorBreakdown'
import DcaStatusDoMesCard    from './DcaStatusDoMesCard'

const fmt0 = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n)

const STORAGE_KEY = 'btcm_dca_tac_cfg_v1'

const RISK_TO_STRATEGY: Record<RiskProfile, DcaStrategyProfile> = {
  CONSERVATIVE: 'CONSERVATIVE',
  MODERATE:     'BALANCED',
  AGGRESSIVE:   'AGGRESSIVE',
}

interface MarketSnapshot {
  opportunityScore:  number
  riskScore:         number
  convictionScore:   number
  euphoriaScore:     number
  capitulationScore: number
  indicatorGroups:   IndicatorGroup[]
  btcPriceUsd:       number | null
  summary:           string
  marketRegime:      string
}

interface Props { plan: DcaPlanRow | null }

function currentYearMonth() {
  const n = new Date()
  return { year: n.getFullYear(), month: n.getMonth() + 1 }
}

// ── Institutional market context card ────────────────────────────────────────
function MarketContextCard({ label, score, qualifier, color, showBar = true }: {
  label: string; score?: number; qualifier: string; color: string; showBar?: boolean
}) {
  const pct = score !== undefined ? Math.min(100, Math.max(0, score)) : null
  return (
    <div style={{
      flex:         '1 1 140px',
      padding:      '16px 18px',
      background:   'var(--surface3)',
      border:       '1px solid rgba(255,255,255,0.07)',
      borderTop:    `3px solid ${color}`,
      borderRadius: '10px',
    }}>
      <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '10px' }}>
        {label}
      </div>
      {pct !== null ? (
        <>
          <div style={{ fontSize: '26px', fontWeight: 800, color, letterSpacing: '-0.5px', marginBottom: '6px' }}>
            {score}<span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>/100</span>
          </div>
          {showBar && (
            <div style={{ height: '3px', background: 'var(--surface3)', borderRadius: '2px', overflow: 'hidden', marginBottom: '8px' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '2px' }} />
            </div>
          )}
        </>
      ) : (
        <div style={{ fontSize: '20px', fontWeight: 700, color, marginBottom: '8px' }}>{qualifier}</div>
      )}
      <div style={{
        display:      'inline-block',
        padding:      '2px 8px',
        background:   `${color}14`,
        border:       `1px solid ${color}28`,
        borderRadius: '4px',
        fontSize:     '10px',
        fontWeight:   600,
        color,
      }}>
        {qualifier}
      </div>
    </div>
  )
}

// ── Opportunities history — timeline style ───────────────────────────────────
function TacticalOpportunitiesHistory({ contributions }: { contributions: DcaContributionRow[] }) {
  const entries = contributions
    .filter(c => c.market_score_snapshot !== null)
    .sort((a, b) => b.contribution_date.localeCompare(a.contribution_date))
    .slice(0, 8)

  return (
    <div style={{
      background:   'var(--surface3)',
      border:       '1px solid rgba(255,255,255,0.07)',
      borderRadius: '12px',
      overflow:     'hidden',
    }}>
      <div style={{
        padding:        '14px 24px',
        borderBottom:   '1px solid rgba(255,255,255,0.06)',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
          Histórico de oportunidades
        </div>
        {entries.length > 0 && (
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{entries.length} entradas</span>
        )}
      </div>

      {entries.length === 0 ? (
        <div style={{ padding: '32px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            Nenhum aporte com contexto de mercado ainda.
          </div>
          <div style={{ marginTop: '10px' }}>
            <a href="/lancamento" style={{ fontSize: '12px', color: '#f59e0b', textDecoration: 'none', fontWeight: 500 }}>
              Registrar primeiro aporte →
            </a>
          </div>
        </div>
      ) : (
        <div style={{ padding: '8px 0' }}>
          {entries.map((c, i) => {
            const score   = c.market_score_snapshot ?? 0
            const state   = c.market_state_snapshot as DcaMarketState | null
            const color   = state ? STATE_COLOR[state] : '#fbbf24'
            const label   = state ? STATE_LABEL[state] : '—'
            const dateStr = new Date(c.contribution_date + 'T00:00:00')
              .toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })
            const isLast  = i === entries.length - 1
            return (
              <div key={c.id} style={{
                display:      'flex',
                alignItems:   'center',
                gap:          '16px',
                padding:      '14px 24px',
                borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.04)',
                borderLeft:   `3px solid ${color}`,
                marginLeft:   '0',
                transition:   'background 0.12s',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'var(--text-dim)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
              >
                {/* Score chip */}
                <div style={{
                  width:          '44px',
                  height:         '44px',
                  borderRadius:   '10px',
                  background:     `${color}14`,
                  border:         `1px solid ${color}28`,
                  display:        'flex',
                  flexDirection:  'column',
                  alignItems:     'center',
                  justifyContent: 'center',
                  flexShrink:     0,
                }}>
                  <div style={{ fontSize: '16px', fontWeight: 800, color, lineHeight: 1 }}>{score}</div>
                  <div style={{ fontSize: '8px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.5px' }}>SCR</div>
                </div>

                {/* Date + state */}
                <div style={{ flexShrink: 0, minWidth: '90px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text)', fontWeight: 500, marginBottom: '3px' }}>{dateStr}</div>
                  <span style={{
                    padding:      '1px 7px',
                    background:   `${color}14`,
                    border:       `1px solid ${color}28`,
                    borderRadius: '4px',
                    fontSize:     '10px',
                    fontWeight:   600,
                    color,
                  }}>
                    {label}
                  </span>
                </div>

                {/* Notes */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                    {c.notes ?? '—'}
                  </span>
                </div>

                {/* Amount */}
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                  {fmt0(c.amount)}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div style={{ padding: '12px 24px', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'right' }}>
        <a href="/lancamento" style={{ fontSize: '12px', color: '#f59e0b', textDecoration: 'none', fontWeight: 500 }}>
          Ver todos os lançamentos →
        </a>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DcaTacticalPage({ plan }: Props) {
  const [config,        setConfig]        = useState<DcaTacticalConfig>(DEFAULT_TACTICAL_CONFIG)
  const [market,        setMarket]        = useState<MarketSnapshot | null>(null)
  const [contributions, setContributions] = useState<DcaContributionRow[]>([])
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState<string | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        setConfig(prev => ({ ...prev, ...JSON.parse(raw) }))
      } else if (plan) {
        setConfig(prev => ({ ...prev, strategyProfile: RISK_TO_STRATEGY[plan.risk_profile] }))
      }
    } catch {}
  }, [plan])

  useEffect(() => {
    fetch('/api/market-snapshot/current')
      .then(r => { if (!r.ok) throw new Error('Falha ao buscar dados'); return r.json() as Promise<MarketSnapshot> })
      .then(data => { setMarket(data); setLoading(false) })
      .catch(err => { setError(err instanceof Error ? err.message : 'Erro'); setLoading(false) })
  }, [])

  const fetchContributions = useCallback(() => {
    fetch('/api/dca/contributions?limit=100')
      .then(r => r.json())
      .then(({ contributions: all }: { contributions: DcaContributionRow[] }) => {
        const { year, month } = currentYearMonth()
        setContributions((all ?? []).filter(c => {
          const d = new Date(c.contribution_date + 'T00:00:00')
          return d.getFullYear() === year && d.getMonth() + 1 === month
        }))
      })
      .catch(() => {})
  }, [])

  useEffect(() => { fetchContributions() }, [fetchContributions])

  const monthlyAmount = plan?.monthly_amount_brl ?? config.monthlyAmountOverride ?? 0

  const usedThisMonth = contributions
    .filter(c => c.contribution_type !== 'STRUCTURAL_DCA')
    .reduce((sum, c) => sum + c.amount, 0)

  const score = market
    ? calculateDcaOpportunityScore({
        opportunityScore:  market.opportunityScore,
        riskScore:         market.riskScore,
        convictionScore:   market.convictionScore,
        euphoriaScore:     market.euphoriaScore  ?? 30,
        capitulationScore: market.capitulationScore ?? 25,
      })
    : 0

  const marketState        = classifyDcaMarketState(score)
  const configWithDerived  : DcaTacticalConfig = { ...config, usedThisMonth }
  const allocation         : DcaAllocation | null = monthlyAmount > 0
    ? calculateDcaAllocation(monthlyAmount, configWithDerived, score, marketState)
    : null
  const indicators         : DcaIndicatorSignal[] = market?.indicatorGroups
    ? buildIndicatorSignals(market.indicatorGroups)
    : []
  const tacticalPool = monthlyAmount - (allocation?.structuralDcaAmount ?? 0)

  // Qualitative labels derived from scores
  const liquidityScore = market
    ? Math.round((100 - (market.euphoriaScore ?? 50)) * 0.6 + market.convictionScore * 0.4)
    : null
  const liquidityLabel = liquidityScore == null ? 'Neutra'
    : liquidityScore >= 60 ? 'Alta' : liquidityScore >= 35 ? 'Neutra' : 'Baixa'
  const liquidityColor = liquidityScore == null ? '#fbbf24'
    : liquidityScore >= 60 ? '#4ade80' : liquidityScore >= 35 ? '#fbbf24' : '#f87171'

  const regime     = (market?.marketRegime ?? '').toLowerCase()
  const trendLabel = regime.includes('bull') ? 'Alta' : regime.includes('bear') ? 'Baixa' : 'Lateral'
  const trendColor = trendLabel === 'Alta' ? '#4ade80' : trendLabel === 'Baixa' ? '#f87171' : '#fbbf24'

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: '48px 0', textAlign: 'center' }}>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Carregando dados de mercado…
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
          {[0, 1, 2].map(i => (
            <div key={i} className="skeleton" style={{ width: '8px', height: '8px', borderRadius: '50%', animationDelay: `${i * 0.2}s` }} />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '20px 24px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '10px' }}>
        <div style={{ fontSize: '12px', color: '#f87171' }}>Erro ao carregar dados: {error}</div>
      </div>
    )
  }

  if (monthlyAmount === 0) {
    return (
      <div style={{ padding: '20px 24px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.18)', borderRadius: '10px', fontSize: '13px', color: 'var(--text-sec)' }}>
        Configure o aporte mensal na aba <strong style={{ color: '#f59e0b' }}>DCA Inteligente</strong> para ativar a análise tática.
      </div>
    )
  }

  function handleContributionUpdate(updated: DcaContributionRow) {
    setContributions(prev => prev.map(c => c.id === updated.id ? updated : c))
  }

  // ── Main render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* "Como funciona" — compact educational note */}
      <div style={{
        display:    'flex',
        alignItems: 'center',
        gap:        '12px',
        padding:    '12px 20px',
        background: 'rgba(245,158,11,0.05)',
        border:     '1px solid rgba(245,158,11,0.15)',
        borderRadius: '10px',
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
        <div style={{ fontSize: '12px', color: 'var(--text-sec)', lineHeight: 1.5, flex: 1 }}>
          <span style={{ color: 'var(--text)', fontWeight: 600 }}>Como funciona: </span>
          O DCA Tático identifica janelas de oportunidade excepcional para acelerar aportes. Decida aqui — execute em{' '}
          <a href="/lancamento" style={{ color: '#f59e0b', textDecoration: 'none', fontWeight: 600 }}>Lançamentos</a>.
        </div>
      </div>

      {/* KPI summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        {[
          {
            label:    'DCA Estrutural',
            value:    fmt0(allocation?.structuralDcaAmount ?? 0),
            sub:      'Valor mensal base',
            topColor: '#f59e0b',
            valColor: '#fff',
          },
          {
            label:    'Caixa Tático',
            value:    fmt0(tacticalPool),
            sub:      'Fundo para oportunidades',
            topColor: '#6366f1',
            valColor: '#fff',
          },
          {
            label:    'Já aportado (mês)',
            value:    fmt0(usedThisMonth),
            sub:      usedThisMonth > tacticalPool
              ? `${Math.round((usedThisMonth / tacticalPool) * 100)}% da caixa tático utilizada`
              : `${Math.round(tacticalPool > 0 ? (usedThisMonth / tacticalPool) * 100 : 0)}% utilizado`,
            topColor: usedThisMonth > tacticalPool ? '#f87171' : usedThisMonth > 0 ? '#f59e0b' : 'var(--text-dim)',
            valColor: usedThisMonth > tacticalPool ? '#f87171' : '#fff',
          },
          {
            label:    'Disponível',
            value:    fmt0(Math.max(0, tacticalPool - usedThisMonth)),
            sub:      'Restante para oportunidades',
            topColor: (tacticalPool - usedThisMonth) > 0 ? '#4ade80' : 'var(--text-dim)',
            valColor: (tacticalPool - usedThisMonth) > 0 ? '#4ade80' : 'var(--text-muted)',
          },
        ].map(({ label, value, sub, topColor, valColor }) => (
          <div key={label} style={{
            padding:      '18px 20px',
            background:   'var(--surface3)',
            border:       '1px solid rgba(255,255,255,0.07)',
            borderTop:    `3px solid ${topColor}`,
            borderRadius: '10px',
          }}>
            <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '10px' }}>
              {label}
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: valColor, letterSpacing: '-0.5px', marginBottom: '4px' }}>
              {value}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              {sub}
            </div>
          </div>
        ))}
      </div>

      {/* Hero recommendation — dominant */}
      {allocation && <DcaRecommendationCard allocation={allocation} summary={market?.summary} />}

      {/* Market context — institutional */}
      {market && (
        <div style={{
          padding:      '18px 20px',
          background:   'var(--surface2)',
          border:       '1px solid rgba(255,255,255,0.07)',
          borderRadius: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
              Contexto do mercado
            </div>
            {/* Legend */}
            <div style={{ display: 'flex', gap: '14px' }}>
              {[
                { label: '≥ 70 Favorável',    color: '#4ade80' },
                { label: '40–70 Neutro',      color: '#fbbf24' },
                { label: '< 40 Desfavorável', color: '#f87171' },
              ].map(l => (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: l.color, display: 'inline-block', flexShrink: 0 }} />
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <MarketContextCard
              label="Oportunidade"
              score={market.opportunityScore}
              qualifier={market.opportunityScore >= 70 ? 'Favorável' : market.opportunityScore >= 40 ? 'Neutro' : 'Desfavorável'}
              color={market.opportunityScore >= 70 ? '#4ade80' : market.opportunityScore >= 40 ? '#fbbf24' : '#f87171'}
            />
            <MarketContextCard
              label="Risco"
              score={market.riskScore}
              qualifier={market.riskScore < 30 ? 'Baixo' : market.riskScore < 60 ? 'Médio' : 'Alto'}
              color={market.riskScore < 30 ? '#4ade80' : market.riskScore < 60 ? '#fbbf24' : '#f87171'}
            />
            <MarketContextCard
              label="Convicção"
              score={market.convictionScore}
              qualifier={market.convictionScore >= 70 ? 'Alta' : market.convictionScore >= 40 ? 'Média' : 'Baixa'}
              color={market.convictionScore >= 70 ? '#4ade80' : market.convictionScore >= 40 ? '#fbbf24' : '#f87171'}
            />
            <MarketContextCard
              label="Liquidez"
              qualifier={liquidityLabel}
              color={liquidityColor}
              showBar={false}
            />
            <MarketContextCard
              label="Tendência"
              qualifier={trendLabel}
              color={trendColor}
              showBar={false}
            />
          </div>
        </div>
      )}

      {/* Month status */}
      <DcaStatusDoMesCard
        tacticalPool={tacticalPool}
        contributions={contributions}
        usedThisMonth={usedThisMonth}
        onUpdate={handleContributionUpdate}
      />

      {/* Indicators breakdown */}
      {indicators.length > 0 && <DcaIndicatorBreakdown signals={indicators} />}

      {/* Opportunities history */}
      <TacticalOpportunitiesHistory contributions={contributions} />

    </div>
  )
}
