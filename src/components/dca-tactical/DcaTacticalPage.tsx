'use client'

import { useState, useEffect, useCallback } from 'react'
import type { DcaPlanRow, RiskProfile, DcaContributionRow, ContributionType } from '@/lib/db/types'
import type { DcaTacticalConfig, DcaAllocation, DcaIndicatorSignal } from '@/lib/dca-tactical/types'
import { DEFAULT_TACTICAL_CONFIG } from '@/lib/dca-tactical/types'
import type { DcaStrategyProfile } from '@/lib/dca-tactical/types'
import { calculateDcaOpportunityScore, classifyDcaMarketState, buildIndicatorSignals } from '@/lib/dca-tactical/score'
import { calculateDcaAllocation } from '@/lib/dca-tactical/allocation'
import type { IndicatorGroup } from '@lib/shared/types/signal'

import Tooltip               from '@/components/shared/Tooltip'
import DcaConfigCard         from './DcaConfigCard'
import DcaRecommendationCard from './DcaRecommendationCard'
import DcaIndicatorBreakdown from './DcaIndicatorBreakdown'
import DcaStatusDoMesCard    from './DcaStatusDoMesCard'
import DcaEducationalNotice  from './DcaEducationalNotice'

const fmt = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

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

export default function DcaTacticalPage({ plan }: Props) {
  const [config,        setConfig]        = useState<DcaTacticalConfig>(DEFAULT_TACTICAL_CONFIG)
  const [market,        setMarket]        = useState<MarketSnapshot | null>(null)
  const [contributions, setContributions] = useState<DcaContributionRow[]>([])
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState<string | null>(null)

  // Load config from localStorage after hydration
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        setConfig(prev => ({ ...prev, ...JSON.parse(raw) }))
      } else if (plan) {
        setConfig(prev => ({
          ...prev,
          strategyProfile: RISK_TO_STRATEGY[plan.risk_profile],
        }))
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

  // Fetch this month's contributions
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

  const updateConfig = useCallback((updates: Partial<DcaTacticalConfig>) => {
    setConfig(prev => {
      const next = { ...prev, ...updates }
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  // plan.monthly_amount_brl takes precedence over localStorage override
  const monthlyAmount = plan?.monthly_amount_brl ?? config.monthlyAmountOverride ?? 0

  // usedThisMonth derived from real contributions (TACTICAL + MANUAL, not STRUCTURAL_DCA)
  const usedThisMonth = contributions
    .filter(c => c.contribution_type !== 'STRUCTURAL_DCA')
    .reduce((sum, c) => sum + c.amount, 0)

  // Derived score / state / allocation
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

  // Contribution handlers
  const handleRegister = useCallback(async (data: {
    amount: number
    contribution_date: string
    contribution_type: ContributionType
    notes: string | null
    sats_purchased: number | null
    btc_price_brl: number | null
    effective_price_brl: number | null
  }) => {
    const res = await fetch('/api/dca/contributions', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        ...data,
        market_score_snapshot: score,
        market_state_snapshot: marketState,
      }),
    })
    if (!res.ok) {
      const { error: msg } = await res.json().catch(() => ({ error: 'Erro ao registrar' }))
      throw new Error(msg ?? 'Erro ao registrar')
    }
    fetchContributions()
  }, [score, marketState, fetchContributions])

  const handleDelete = useCallback(async (id: string) => {
    const res = await fetch(`/api/dca/contributions/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Erro ao remover aporte')
    fetchContributions()
  }, [fetchContributions])

  // ── Loading ────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: '48px 0', textAlign: 'center' }}>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Carregando dados de mercado…
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="skeleton"
              style={{ width: '8px', height: '8px', borderRadius: '50%', animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    )
  }

  // ── Error ──────────────────────────────────────────────────
  if (error) {
    return (
      <div style={{
        padding:      '20px 24px',
        background:   'rgba(255,23,68,0.08)',
        border:       '1px solid rgba(255,23,68,0.2)',
        borderRadius: '10px',
        marginBottom: '24px',
      }}>
        <div style={{ fontSize: '12px', color: '#FF1744' }}>
          Erro ao carregar dados de mercado: {error}
        </div>
      </div>
    )
  }

  // ── No monthly amount ──────────────────────────────────────
  if (monthlyAmount === 0) {
    return (
      <div>
        <div style={{
          padding:      '20px 24px',
          background:   'var(--orange-subtle)',
          border:       '1px solid var(--border-strong)',
          borderRadius: '10px',
          marginBottom: '24px',
          fontSize:     '13px',
          color:        'var(--text-sec)',
        }}>
          Configure o aporte mensal no painel abaixo para receber a sugestão de alocação tática.
        </div>
        <DcaConfigCard config={config} monthlyAmount={0} onUpdate={updateConfig} />
        <DcaEducationalNotice />
      </div>
    )
  }

  const tacticalPool = monthlyAmount - (allocation?.structuralDcaAmount ?? 0)
  const remaining    = Math.max(0, tacticalPool - usedThisMonth)

  // ── Main render ────────────────────────────────────────────
  return (
    <div>

      {/* KPI cards — allocation summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <TacticalKPICard
          accent="var(--orange)"
          label="DCA Estrutural"
          value={fmt(allocation?.structuralDcaAmount ?? 0)}
          tooltip="Aporte fixo recorrente, executado independente de mercado. Não conta no caixa tático."
        />
        <TacticalKPICard
          accent="#6366F1"
          label="Caixa Tático"
          value={fmt(tacticalPool)}
          tooltip="Total disponível para alocação tática este mês = aporte mensal − DCA estrutural."
        />
        <TacticalKPICard
          accent={usedThisMonth > 0 ? 'var(--orange)' : 'var(--border-strong)'}
          label="Já aportado"
          value={fmt(usedThisMonth)}
          valueColor={usedThisMonth > 0 ? 'var(--orange)' : 'var(--text-muted)'}
          tooltip="Soma dos aportes táticos e manuais registrados neste mês."
        />
        <TacticalKPICard
          accent={remaining > 0 ? '#22C55E' : 'var(--text-muted)'}
          label="Disponível"
          value={fmt(remaining)}
          valueColor={remaining > 0 ? '#22C55E' : 'var(--text-muted)'}
          tooltip="Caixa tático ainda disponível para aportar neste mês."
        />
      </div>

      {/* §1 + §2 — Cenário Atual + Ação Recomendada */}
      {allocation && (
        <DcaRecommendationCard
          allocation={allocation}
          summary={market?.summary}
        />
      )}

      {/* §3 — Status do Mês */}
      <DcaStatusDoMesCard
        monthlyContribution={monthlyAmount}
        structuralDcaAmount={allocation?.structuralDcaAmount ?? 0}
        tacticalPool={tacticalPool}
        contributions={contributions}
        usedThisMonth={usedThisMonth}
        score={score}
        marketState={marketState}
        onRegister={handleRegister}
        onDelete={handleDelete}
      />

      {/* Histórico completo link */}
      <div style={{ marginBottom: '24px', textAlign: 'right' }}>
        <a
          href="/dca/historico"
          style={{ fontSize: '12px', color: 'var(--orange)', textDecoration: 'none', fontWeight: 500 }}
        >
          Ver histórico completo →
        </a>
      </div>

      {/* §4 — Indicadores */}
      {indicators.length > 0 && (
        <DcaIndicatorBreakdown signals={indicators} />
      )}

      {/* Configuração */}
      <DcaConfigCard config={config} monthlyAmount={monthlyAmount} onUpdate={updateConfig} />

      {/* Disclaimer */}
      <DcaEducationalNotice />
    </div>
  )
}

function TacticalKPICard({ accent, label, value, valueColor, tooltip }: {
  accent: string; label: string; value: string; valueColor?: string; tooltip: string
}) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${accent}`, borderRadius: '12px', padding: '18px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
        <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.09em' }}>{label}</span>
        <Tooltip text={tooltip} position="bottom" wide />
      </div>
      <div style={{ fontSize: '22px', fontWeight: 700, color: valueColor ?? 'var(--text)', fontFamily: "'Courier New', monospace" }}>{value}</div>
    </div>
  )
}
