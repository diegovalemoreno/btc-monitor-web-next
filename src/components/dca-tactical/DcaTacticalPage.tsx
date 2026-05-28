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
import DcaScoreGauge         from './DcaScoreGauge'

const fmt = (n: number) =>
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

interface Props {
  plan: DcaPlanRow | null
}

function currentYearMonth() {
  const n = new Date()
  return { year: n.getFullYear(), month: n.getMonth() + 1 }
}

// ── Market context card ───────────────────────────────────────────
function ContextCard({ label, score, qualifier, color }: {
  label: string; score?: number; qualifier: string; color: string
}) {
  return (
    <div style={{
      flex:         1,
      minWidth:     '120px',
      padding:      '16px 18px',
      background:   'rgba(255,255,255,0.02)',
      border:       '1px solid rgba(255,255,255,0.07)',
      borderRadius: '10px',
    }}>
      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1.2px', fontWeight: 700, marginBottom: '8px' }}>
        {label}
      </div>
      {score !== undefined ? (
        <div style={{ fontSize: '22px', fontWeight: 800, color, letterSpacing: '-0.5px', marginBottom: '4px' }}>
          {score}<span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>/100</span>
        </div>
      ) : (
        <div style={{ fontSize: '18px', fontWeight: 700, color, marginBottom: '4px' }}>{qualifier}</div>
      )}
      <div style={{
        display:      'inline-block',
        padding:      '2px 8px',
        background:   `${color}18`,
        border:       `1px solid ${color}30`,
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

// ── Opportunities history (derived from contributions) ────────────
function TacticalOpportunitiesHistory({ contributions }: { contributions: DcaContributionRow[] }) {
  const tactical = contributions
    .filter(c => c.market_score_snapshot !== null)
    .sort((a, b) => b.contribution_date.localeCompare(a.contribution_date))
    .slice(0, 10)

  return (
    <div style={{
      background:   'rgba(255,255,255,0.02)',
      border:       '1px solid rgba(255,255,255,0.07)',
      borderRadius: '12px',
      overflow:     'hidden',
      marginBottom: '16px',
    }}>
      <div style={{
        padding:      '14px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
          Histórico de oportunidades
        </div>
        {tactical.length > 0 && (
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>{tactical.length} entradas</span>
        )}
      </div>

      {tactical.length === 0 ? (
        <div style={{ padding: '32px 24px', textAlign: 'center', fontSize: '13px', color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' }}>
          Nenhum aporte com contexto de mercado registrado ainda.
        </div>
      ) : (
        <>
          {/* Header row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '120px 1fr 80px 80px 120px',
            gap: '12px', padding: '10px 24px',
            background: 'rgba(255,255,255,0.01)',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
          }}>
            {['Data', 'Notas', 'DCA Score', 'Aporte', 'Estado'].map(h => (
              <span key={h} style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '1.2px' }}>{h}</span>
            ))}
          </div>

          {tactical.map((c, i) => {
            const score = c.market_score_snapshot ?? 0
            const state = c.market_state_snapshot as DcaMarketState | null
            const color = state ? STATE_COLOR[state] : '#fbbf24'
            const label = state ? STATE_LABEL[state] : '—'
            const isLast = i === tactical.length - 1
            const dateLabel = new Date(c.contribution_date + 'T00:00:00')
              .toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
            return (
              <div key={c.id} style={{
                display:     'grid',
                gridTemplateColumns: '120px 1fr 80px 80px 120px',
                gap:         '12px',
                padding:     '12px 24px',
                borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.04)',
                alignItems:  'center',
              }}>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>{dateLabel}</span>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.notes ?? '—'}
                </span>
                <span style={{ fontSize: '13px', fontWeight: 700, color }}>{score}</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#fff' }}>{fmt(c.amount)}</span>
                <span style={{
                  padding: '2px 8px', background: `${color}18`,
                  border: `1px solid ${color}28`, borderRadius: '4px',
                  fontSize: '10px', fontWeight: 600, color, display: 'inline-block', width: 'fit-content',
                }}>
                  {label}
                </span>
              </div>
            )
          })}
        </>
      )}

      <div style={{ padding: '12px 24px', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'right' }}>
        <a href="/lancamento" style={{ fontSize: '12px', color: '#f59e0b', textDecoration: 'none', fontWeight: 500 }}>
          Ver todos os lançamentos →
        </a>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────
export default function DcaTacticalPage({ plan }: Props) {
  const [config,        setConfig]        = useState<DcaTacticalConfig>(DEFAULT_TACTICAL_CONFIG)
  const [market,        setMarket]        = useState<MarketSnapshot | null>(null)
  const [contributions, setContributions] = useState<DcaContributionRow[]>([])
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState<string | null>(null)

  // Load config from localStorage
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

  // Fetch live market data
  useEffect(() => {
    fetch('/api/market-snapshot/current')
      .then(r => {
        if (!r.ok) throw new Error('Falha ao buscar dados de mercado')
        return r.json() as Promise<MarketSnapshot>
      })
      .then(data => { setMarket(data); setLoading(false) })
      .catch(err => { setError(err instanceof Error ? err.message : 'Erro desconhecido'); setLoading(false) })
  }, [])

  // Fetch this month's contributions (read-only)
  const fetchContributions = useCallback(() => {
    fetch('/api/dca/contributions?limit=100')
      .then(r => r.json())
      .then(({ contributions: all }: { contributions: DcaContributionRow[] }) => {
        const { year, month } = currentYearMonth()
        const thisMonth = (all ?? []).filter(c => {
          const d = new Date(c.contribution_date + 'T00:00:00')
          return d.getFullYear() === year && d.getMonth() + 1 === month
        })
        setContributions(thisMonth)
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

  const marketState = classifyDcaMarketState(score)

  const configWithDerived: DcaTacticalConfig = { ...config, usedThisMonth }

  const allocation: DcaAllocation | null = monthlyAmount > 0
    ? calculateDcaAllocation(monthlyAmount, configWithDerived, score, marketState)
    : null

  const indicators: DcaIndicatorSignal[] = market?.indicatorGroups
    ? buildIndicatorSignals(market.indicatorGroups)
    : []

  const tacticalPool = monthlyAmount - (allocation?.structuralDcaAmount ?? 0)

  // Derive liquidity / trend qualitative labels
  const liquidityScore  = market ? Math.round((100 - (market.euphoriaScore ?? 50)) * 0.6 + market.convictionScore * 0.4) : null
  const liquidityLabel  = liquidityScore == null ? 'Neutra' : liquidityScore >= 60 ? 'Alta' : liquidityScore >= 35 ? 'Neutra' : 'Baixa'
  const liquidityColor  = liquidityScore == null ? '#fbbf24' : liquidityScore >= 60 ? '#4ade80' : liquidityScore >= 35 ? '#fbbf24' : '#f87171'

  const regime = (market?.marketRegime ?? '').toLowerCase()
  const trendLabel = regime.includes('bull') ? 'Alta' : regime.includes('bear') ? 'Baixa' : 'Lateral'
  const trendColor = trendLabel === 'Alta' ? '#4ade80' : trendLabel === 'Baixa' ? '#f87171' : '#fbbf24'

  // ── Loading ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: '48px 0', textAlign: 'center' }}>
        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', marginBottom: '16px' }}>
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

  // ── Error ────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={{ padding: '20px 24px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px' }}>
        <div style={{ fontSize: '12px', color: '#EF4444' }}>Erro ao carregar dados de mercado: {error}</div>
      </div>
    )
  }

  // ── No plan ──────────────────────────────────────────────────────
  if (monthlyAmount === 0) {
    return (
      <div style={{ padding: '20px 24px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '10px', fontSize: '13px', color: 'rgba(255,255,255,0.55)' }}>
        Configure o aporte mensal na aba DCA Inteligente para receber a sugestão de alocação tática.
      </div>
    )
  }

  // ── Main render ──────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* "Como funciona" card */}
      <div style={{
        display:      'flex',
        alignItems:   'flex-start',
        gap:          '10px',
        padding:      '16px 20px',
        background:   'rgba(255,255,255,0.02)',
        border:       '1px solid rgba(255,255,255,0.07)',
        borderRadius: '12px',
      }}>
        <div style={{
          width: '30px', height: '30px', borderRadius: '8px', flexShrink: 0,
          background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>Como funciona</div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
            O DCA Tático identifica janelas de oportunidade excepcional no mercado para acelerar aportes.
            Decida aqui — execute em{' '}
            <a href="/lancamento" style={{ color: '#f59e0b', textDecoration: 'none', fontWeight: 500 }}>Lançamentos</a>.
          </div>
        </div>
      </div>

      {/* KPI summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
        {[
          {
            label:   'DCA Estrutural',
            value:   fmt(allocation?.structuralDcaAmount ?? 0),
            sub:     'Valor mensal base',
            accent:  '#f59e0b',
          },
          {
            label:   'Caixa Tático',
            value:   fmt(tacticalPool),
            sub:     'Fundo destinado para oportunidades',
            accent:  '#6366f1',
          },
          {
            label:   'Já aportado (mês)',
            value:   fmt(usedThisMonth),
            sub:     usedThisMonth > tacticalPool ? `${Math.round((usedThisMonth / tacticalPool) * 100)}% da caixa tático utilizada` : `${Math.round((usedThisMonth / tacticalPool) * 100)}% utilizado`,
            accent:  usedThisMonth > tacticalPool ? '#ef4444' : usedThisMonth > 0 ? '#f59e0b' : 'rgba(255,255,255,0.2)',
            valueColor: usedThisMonth > tacticalPool ? '#ef4444' : undefined,
          },
          {
            label:   'Disponível',
            value:   fmt(Math.max(0, tacticalPool - usedThisMonth)),
            sub:     'Restante para oportunidades',
            accent:  (tacticalPool - usedThisMonth) > 0 ? '#4ade80' : 'rgba(255,255,255,0.2)',
            valueColor: (tacticalPool - usedThisMonth) > 0 ? '#4ade80' : 'rgba(255,255,255,0.3)',
          },
        ].map(({ label, value, sub, accent, valueColor }) => (
          <div key={label} style={{
            padding:      '18px 20px',
            background:   'rgba(255,255,255,0.02)',
            border:       '1px solid rgba(255,255,255,0.07)',
            borderRadius: '12px',
          }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '10px' }}>
              {label}
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: valueColor ?? '#fff', letterSpacing: '-0.5px', marginBottom: '4px' }}>
              {value}
            </div>
            <div style={{ fontSize: '11px', color: accent === 'rgba(255,255,255,0.2)' ? 'rgba(255,255,255,0.2)' : `${accent}cc` }}>
              {sub}
            </div>
          </div>
        ))}
      </div>

      {/* Hero recommendation */}
      {allocation && <DcaRecommendationCard allocation={allocation} summary={market?.summary} />}

      {/* Market context */}
      {market && (
        <div style={{
          padding:      '18px 20px',
          background:   'rgba(255,255,255,0.02)',
          border:       '1px solid rgba(255,255,255,0.07)',
          borderRadius: '12px',
        }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '14px' }}>
            Contexto do mercado
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <ContextCard
              label="Oportunidade"
              score={market.opportunityScore}
              qualifier={market.opportunityScore >= 70 ? 'Favorável' : market.opportunityScore >= 40 ? 'Neutro' : 'Desfavorável'}
              color={market.opportunityScore >= 70 ? '#4ade80' : market.opportunityScore >= 40 ? '#fbbf24' : '#f87171'}
            />
            <ContextCard
              label="Risco"
              score={market.riskScore}
              qualifier={market.riskScore < 30 ? 'Baixo' : market.riskScore < 60 ? 'Médio' : 'Alto'}
              color={market.riskScore < 30 ? '#4ade80' : market.riskScore < 60 ? '#fbbf24' : '#f87171'}
            />
            <ContextCard
              label="Convicção"
              score={market.convictionScore}
              qualifier={market.convictionScore >= 70 ? 'Alta' : market.convictionScore >= 40 ? 'Média' : 'Baixa'}
              color={market.convictionScore >= 70 ? '#4ade80' : market.convictionScore >= 40 ? '#fbbf24' : '#f87171'}
            />
            <ContextCard
              label="Liquidez"
              qualifier={liquidityLabel}
              color={liquidityColor}
            />
            <ContextCard
              label="Tendência"
              qualifier={trendLabel}
              color={trendColor}
            />
            {/* Legend */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', paddingBottom: '4px', marginLeft: 'auto' }}>
              {[
                { label: '≥ 70 Favorável',    color: '#4ade80' },
                { label: '40–70 Neutro',      color: '#fbbf24' },
                { label: '< 40 Desfavorável', color: '#f87171' },
              ].map(l => (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: l.color, display: 'inline-block', flexShrink: 0 }} />
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Month status (read-only) */}
      <DcaStatusDoMesCard
        tacticalPool={tacticalPool}
        contributions={contributions}
        usedThisMonth={usedThisMonth}
      />

      {/* Indicators breakdown */}
      {indicators.length > 0 && <DcaIndicatorBreakdown signals={indicators} />}

      {/* Opportunities history */}
      <TacticalOpportunitiesHistory contributions={contributions} />

    </div>
  )
}
