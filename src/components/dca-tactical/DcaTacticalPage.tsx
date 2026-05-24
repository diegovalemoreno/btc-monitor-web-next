'use client'

import { useState, useEffect, useCallback } from 'react'
import type { DcaPlanRow, RiskProfile } from '@/lib/db/types'
import type { DcaTacticalConfig, DcaAllocation, DcaIndicatorSignal } from '@/lib/dca-tactical/types'
import { DEFAULT_TACTICAL_CONFIG } from '@/lib/dca-tactical/types'
import type { DcaStrategyProfile } from '@/lib/dca-tactical/types'
import { calculateDcaOpportunityScore, classifyDcaMarketState, buildIndicatorSignals } from '@/lib/dca-tactical/score'
import { calculateDcaAllocation } from '@/lib/dca-tactical/allocation'
import type { IndicatorGroup } from '@lib/shared/types/signal'

import DcaConfigCard            from './DcaConfigCard'
import DcaRecommendationCard    from './DcaRecommendationCard'
import DcaIndicatorBreakdown    from './DcaIndicatorBreakdown'
import DcaCapitalAllocationCard from './DcaCapitalAllocationCard'
import DcaEducationalNotice     from './DcaEducationalNotice'

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

export default function DcaTacticalPage({ plan }: Props) {
  const [config,  setConfig]  = useState<DcaTacticalConfig>(DEFAULT_TACTICAL_CONFIG)
  const [market,  setMarket]  = useState<MarketSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

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

  const updateConfig = useCallback((updates: Partial<DcaTacticalConfig>) => {
    setConfig(prev => {
      const next = { ...prev, ...updates }
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  const monthlyAmount = config.monthlyAmountOverride ?? plan?.monthly_amount_brl ?? 0

  // Derived values
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

  const allocation: DcaAllocation | null = monthlyAmount > 0
    ? calculateDcaAllocation(monthlyAmount, config, score, marketState)
    : null

  const indicators: DcaIndicatorSignal[] = market?.indicatorGroups
    ? buildIndicatorSignals(market.indicatorGroups)
    : []

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

  // ── Main render ────────────────────────────────────────────
  return (
    <div>
      {/* Recommendation (score + gauge + amounts) */}
      {allocation && (
        <DcaRecommendationCard
          allocation={allocation}
          summary={market?.summary}
        />
      )}

      {/* Allocation bar */}
      {allocation && (
        <DcaCapitalAllocationCard allocation={allocation} />
      )}

      {/* Config panel */}
      <DcaConfigCard config={config} monthlyAmount={monthlyAmount} onUpdate={updateConfig} />

      {/* Indicator breakdown */}
      {indicators.length > 0 && (
        <DcaIndicatorBreakdown signals={indicators} />
      )}

      {/* Disclaimer */}
      <DcaEducationalNotice />
    </div>
  )
}
