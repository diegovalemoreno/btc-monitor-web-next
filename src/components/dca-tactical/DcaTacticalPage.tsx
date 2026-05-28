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

import AccumulationHero      from '@/components/dca/AccumulationHero'
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

const HERO_LABEL: Record<DcaMarketState, string> = {
  DEFENSIVE:  'Em cautela',
  NEUTRAL:    'Neutro',
  FAVORABLE:  'Favorável',
  AGGRESSIVE: 'Excepcional',
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

// ── Opportunities history ────────────────────────────────────────────────────
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
              <div
                key={c.id}
                style={{
                  display:      'flex',
                  alignItems:   'center',
                  gap:          '16px',
                  padding:      '14px 24px',
                  borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.04)',
                  borderLeft:   `3px solid ${color}`,
                  transition:   'background 0.12s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'var(--text-dim)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
              >
                <div style={{ flexShrink: 0, minWidth: '100px' }}>
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
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                    {c.notes ?? '—'}
                  </span>
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', flexShrink: 0 }}>
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

  const marketState       = classifyDcaMarketState(score)
  const configWithDerived : DcaTacticalConfig = { ...config, usedThisMonth }
  const allocation        : DcaAllocation | null = monthlyAmount > 0
    ? calculateDcaAllocation(monthlyAmount, configWithDerived, score, marketState)
    : null
  const indicators        : DcaIndicatorSignal[] = market?.indicatorGroups
    ? buildIndicatorSignals(market.indicatorGroups)
    : []
  const tacticalPool = monthlyAmount - (allocation?.structuralDcaAmount ?? 0)

  const regime     = (market?.marketRegime ?? '').toLowerCase()
  const trendLabel = regime.includes('bull') ? 'Alta' : regime.includes('bear') ? 'Baixa' : 'Lateral'
  const trendColor = trendLabel === 'Alta' ? '#4ade80' : trendLabel === 'Baixa' ? '#f87171' : '#fbbf24'

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

  // ── Hero data ────────────────────────────────────────────────────────────────
  const noCapital  = (allocation?.remainingTactical ?? 0) <= 0
  const suggestNow = allocation
    ? (noCapital ? 0 : Math.min(allocation.tacticalContributionAmount, allocation.remainingTactical))
    : null
  const reserveNow = allocation ? Math.max(0, allocation.tacticalReserveAmount) : null

  const defaultExplanation: Record<DcaMarketState, string> = {
    AGGRESSIVE: 'Condições excepcionais detectadas. Múltiplos sinais favoráveis simultâneos — janela histórica para maximizar acumulação.',
    FAVORABLE:  'Mercado apresenta condições favoráveis para acumulação. Indicadores apontam bom ponto de entrada.',
    NEUTRAL:    'Condições neutras de mercado. Mantenha o plano regular de acumulação com disciplina.',
    DEFENSIVE:  'Mercado em estado defensivo. Conserve a reserva aguardando melhores janelas de entrada.',
  }

  const heroExplanation = noCapital
    ? 'Reserva para oportunidades já utilizada neste mês. Próxima janela disponível no próximo ciclo.'
    : (market?.summary || defaultExplanation[marketState])

  const marketPills = market ? [
    {
      label: 'Oportunidade',
      value: market.opportunityScore >= 70 ? 'Favorável' : market.opportunityScore >= 40 ? 'Neutro' : 'Desfavorável',
      color: market.opportunityScore >= 70 ? '#4ade80'   : market.opportunityScore >= 40 ? '#fbbf24' : '#f87171',
    },
    {
      label: 'Risco',
      value: market.riskScore < 30 ? 'Baixo' : market.riskScore < 60 ? 'Médio' : 'Alto',
      color: market.riskScore < 30 ? '#4ade80' : market.riskScore < 60 ? '#fbbf24' : '#f87171',
    },
    {
      label: 'Tendência',
      value: trendLabel,
      color: trendColor,
    },
  ] : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Hero */}
      {allocation && (
        <AccumulationHero
          label="Oportunidade tática"
          monthlyAmount={allocation.monthlyContribution}
          suggestAmount={suggestNow}
          reserveAmount={reserveNow}
          marketLabel={HERO_LABEL[marketState]}
          marketColor={STATE_COLOR[marketState]}
          explanation={heroExplanation}
        >
          {indicators.length > 0 && <DcaIndicatorBreakdown signals={indicators} />}
        </AccumulationHero>
      )}

      {/* Market context — 3 simple pills */}
      {marketPills.length > 0 && (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {marketPills.map(({ label, value, color }) => (
            <div
              key={label}
              style={{
                padding:      '12px 18px',
                background:   `${color}0a`,
                border:       `1px solid ${color}28`,
                borderRadius: '10px',
                minWidth:     '110px',
              }}
            >
              <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '6px' }}>
                {label}
              </div>
              <div style={{ fontSize: '15px', fontWeight: 700, color }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Month progress */}
      <DcaStatusDoMesCard
        tacticalPool={tacticalPool}
        contributions={contributions}
        usedThisMonth={usedThisMonth}
      />

      {/* Opportunities history */}
      <TacticalOpportunitiesHistory contributions={contributions} />

    </div>
  )
}
