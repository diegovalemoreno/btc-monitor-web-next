'use client'

import { useState, useEffect, useCallback } from 'react'
import type { DcaPlanRow, RiskProfile, DcaContributionRow } from '@/lib/db/types'
import type { DcaTacticalConfig, DcaAllocation, DcaMarketState } from '@/lib/dca-tactical/types'
import { DEFAULT_TACTICAL_CONFIG } from '@/lib/dca-tactical/types'
import type { DcaStrategyProfile } from '@/lib/dca-tactical/types'
import { calculateDcaOpportunityScore, classifyDcaMarketState } from '@/lib/dca-tactical/score'
import { calculateDcaAllocation } from '@/lib/dca-tactical/allocation'
import type { IndicatorGroup } from '@lib/shared/types/signal'
import { STATE_COLOR, STATE_LABEL } from './DcaScoreGauge'

import TacticalCard, { type TacticalCardData } from './tactical/TacticalCard'
import TacticalHero         from './tactical/TacticalHero'
import OpportunityBar        from './tactical/OpportunityBar'
import MarketKPIRow          from './tactical/MarketKPIRow'
import TacticalSectionHeader from './tactical/TacticalSectionHeader'
import TacticalConsensus     from './tactical/TacticalConsensus'
import TacticalInsights      from './tactical/TacticalInsights'
import DcaStatusDoMesCard    from './DcaStatusDoMesCard'

// ── Types ─────────────────────────────────────────────────────────────────────

interface MarketKpis {
  marketCapUsd: number | null
  volume24hUsd: number | null
  athUsd:       number | null
  athDropPct:   number | null
  dominancePct: number | null
}

interface BtcTechnical {
  rsi14:        number | null
  macdHist:     number | null
  macdPositive: boolean | null
  macdGrowing:  boolean | null
  ma200:        number | null
  ma50:         number | null
  ma200DistPct: number | null
  crossType:    'golden' | 'death' | null
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
  generatedAt:       string
  insights:          string[]
}

interface Props { plan: DcaPlanRow | null }

// ── Constants ─────────────────────────────────────────────────────────────────

const fmt0 = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n)

const STORAGE_KEY = 'btcm_dca_tac_cfg_v1'

const RISK_TO_STRATEGY: Record<RiskProfile, DcaStrategyProfile> = {
  CONSERVATIVE: 'CONSERVATIVE',
  MODERATE:     'BALANCED',
  AGGRESSIVE:   'AGGRESSIVE',
}

const INDICATOR_WHAT: Record<string, string> = {
  'Medo & Ganância':  'Índice 0–100 de sentimento. Medo extremo (≤20) = todos vendendo em pânico = historicamente os melhores pontos de entrada. Ganância extrema (≥80) = euforia de topo = pior hora para comprar.',
  'Taxa de Funding':  'Funding negativo = shorts pagam longs = mercado alavancado na baixa, possível exaustão dos vendedores e reversão.',
  'Variação 7d':      'Queda forte em 7 dias pode indicar capitulação — janelas históricas de acumulação. Alta forte pode sinalizar sobrecompra de curto prazo.',
  'Open Interest':    'OI alto com preço elevado = risco de liquidações em cascata. OI caindo após queda = limpeza de alavancagem, possivelmente estabilizando.',
  'Liq. de Longs':    'Liquidações em massa de posições compradas sinalizam capitulação e criam fundos locais — oportunidade para quem está fora.',
  'MVRV':             'Abaixo de 1: BTC abaixo do custo médio dos holders — historicamente raro e muito favorável. Acima de 3.5: holders em grande lucro, sinal de topo.',
  'Preço Realizado':  'Quando o preço de mercado fica abaixo do Preço Realizado, a maioria dos holders está no prejuízo — zona histórica de acumulação.',
  'Mayer Multiple':   'Preço ÷ MM200. Abaixo de 1.0 = historicamente barato. Abaixo de 0.7 = zona rara. Acima de 2.4 = extremo histórico de sobrevalorização.',
  'Hash Ribbon':      'Quando mineradores capitulam (hashrate cai), pode sinalizar fundo. Cruzamento de recuperação = sinal histórico de compra.',
  'Pressão venda':    'Alta pressão = mais BTC chegando ao mercado. Baixa pressão = holders retendo, expectativa de valorização.',
  'Médias Móveis':    'Posição do preço vs MAs de 50d, 100d e 200d. Abaixo de múltiplas MAs = desconto histórico. Golden/Death Cross indicam mudança de tendência.',
  'ETF Institucional':'Entradas positivas = instituições comprando. Saídas = desinvestimento — reflete demanda do mercado tradicional.',
  'Pi Cycle Top':     'Quando MM111 cruza o dobro da MM350, historicamente coincide com topos de ciclo. Longe do cruzamento = bom para acumular.',
  'Bollinger %B':     'Abaixo de 0: sobrevendido (abaixo da banda inferior). Acima de 1: sobrecomprado. Extremos indicam reversão iminente.',
  'DXY (Dólar Index)':'DXY forte = pressão sobre BTC. DXY fraco = condições historicamente favoráveis para criptomoedas.',
  'Long/Short Ratio': 'Excesso de longs = otimismo excessivo, risco. Excesso de shorts = pessimismo extremo, potencial reversão.',
  'BTC Dominância':   'Crescendo = capital migrando para BTC. Caindo = altcoins superando — geralmente ocorre em topos de ciclo.',
  'Heatmap Liquidações':'Identifica zonas onde o mercado tende a se mover para liquidar posições alavancadas antes de reverter.',
  'Stablecoin Ratio': 'Ratio alto = muito capital parado esperando entrar — sinal de demanda futura reprimida.',
  'Regime de Mercado':'Classificação sintética do estado atual: capitulação, compra tática, neutro, risk-off, alavancagem excessiva ou euforia.',
  'Sinais Compostos': 'Detecta padrões multi-indicadores como "funding negativo + OI caindo + medo extremo" que individualmente seriam inconclusivos.',
}

// ── Scoring helpers ───────────────────────────────────────────────────────────

function dl(s: number): number { return Math.round(Math.max(-2, Math.min(2, s))) }
function scoreRsi(v: number): number { return v<30?2:v<45?1:v<60?0:v<70?-1:-2 }
function rsiLabel(v: number): string { return v<30?'Sobrevendido':v<45?'Abaixo do Normal':v<60?'Neutro':v<70?'Acima do Normal':'Sobrecomprado' }
function scoreMacd(pos: boolean, grow: boolean): number { return !pos&&grow?2:!pos&&!grow?1:pos&&!grow?-1:-2 }
function macdLabel(pos: boolean, grow: boolean): string {
  return !pos&&grow?'Venda Enfraquecendo — Reversão Provável':!pos&&!grow?'Correção Forte — Fundo em Formação':pos&&!grow?'Alta Perdendo Força — Ciclo Maduro':'Alta Acelerando — Possível Topo'
}
function scoreMa200Dist(pct: number): number { return pct<-30?2:pct<-10?1:pct<30?0:pct<80?-1:-2 }
function scoreAthDrop(d: number): number { return d>70?2:d>50?1:d>25?0:d>10?-1:0 }
function impactLabelOf(level: number): string {
  const L: Record<string, string> = { '2': 'Positivo Forte', '1': 'Positivo', '0': 'Neutro', '-1': 'Negativo', '-2': 'Negativo Forte' }
  return L[String(level)] ?? 'Neutro'
}

function parseSummary(summary: string): { rawValue: string | null; specificLabel: string | null } {
  if (!summary || summary.startsWith('indisponível')) return { rawValue: null, specificLabel: null }
  const clean = summary.replace(/\s*\([+-]?\d+\)\s*$/, '').trim()
  if (!clean) return { rawValue: null, specificLabel: null }
  const dashIdx = clean.indexOf(' — ')
  if (dashIdx !== -1) {
    return { rawValue: clean.slice(0, dashIdx).trim() || null, specificLabel: clean.slice(dashIdx + 3).trim() || null }
  }
  const numMatch = clean.match(/[-+]?[\d.,]+[%×xkKmMbB$]?/)
  return { rawValue: numMatch ? numMatch[0] : clean, specificLabel: null }
}

function indicatorToCard(ind: { name: string; score: number; summary: string }): TacticalCardData {
  const { rawValue, specificLabel } = parseSummary(ind.summary)
  const level = dl(Math.round(ind.score / 5))
  return {
    name:        ind.name,
    statusLabel: specificLabel ?? impactLabelOf(level),
    description: INDICATOR_WHAT[ind.name] ?? '',
    value:       rawValue,
    score:       ind.score,
    dotLevel:    level,
  }
}

function buildTrendExtraCards(tech: BtcTechnical | null): TacticalCardData[] {
  if (!tech) return []
  const cards: TacticalCardData[] = []

  if (tech.rsi14 !== null) {
    const s = scoreRsi(tech.rsi14)
    cards.push({ name: 'RSI 14 Dias', statusLabel: rsiLabel(tech.rsi14), description: 'Abaixo de 30: sobrevendido — queda exagerada, historicamente favorável para acumulação em 12 meses. Acima de 70: sobrecomprado — preço esticado, pior momento para comprar.', value: String(tech.rsi14), score: s, dotLevel: dl(s) })
  }
  if (tech.macdPositive !== null && tech.macdGrowing !== null) {
    const s = scoreMacd(tech.macdPositive, tech.macdGrowing)
    cards.push({ name: 'MACD — Momentum', statusLabel: macdLabel(tech.macdPositive, tech.macdGrowing), description: 'Para quem acumula 1+ ano: correção forte = fundo em formação = melhor entrada. Alta acelerando = possível topo = pior entrada.', value: tech.macdHist !== null ? String(Math.round(tech.macdHist)) : '—', score: s, dotLevel: dl(s) })
  }
  if (tech.ma200DistPct !== null) {
    const s    = scoreMa200Dist(tech.ma200DistPct)
    const sign = tech.ma200DistPct > 0 ? '+' : ''
    cards.push({ name: 'Preço vs MM200', statusLabel: tech.ma200DistPct < 0 ? `${tech.ma200DistPct.toFixed(1)}% abaixo da MM200` : `+${tech.ma200DistPct.toFixed(1)}% acima da MM200`, description: `MM200 = $${tech.ma200?.toLocaleString('en-US') ?? '—'}. Abaixo = zona de desconto histórico. Mais de 80% acima = mercado esticado.`, value: `${sign}${tech.ma200DistPct.toFixed(1)}%`, score: s, dotLevel: dl(s) })
  }
  if (tech.crossType !== null) {
    const isGolden = tech.crossType === 'golden'
    const s        = isGolden ? -1 : 1
    cards.push({ name: 'Cruz MM50 / MM200', statusLabel: isGolden ? 'Cruz Dourada — Preço Já Recuperado' : 'Cruz da Morte — Zona de Fundo Histórico', description: `MM50 = $${tech.ma50?.toLocaleString('en-US') ?? '—'} | MM200 = $${tech.ma200?.toLocaleString('en-US') ?? '—'}. Para 1+ ano: Cruz da Morte = zona de fundo histórico = comprar. Cruz Dourada = preço já subiu = entrada menos vantajosa.`, value: isGolden ? 'Dourada' : 'Morte', score: s, dotLevel: dl(s) })
  }
  return cards
}

function buildOnchainExtraCards(kpis: MarketKpis | null, btcPriceUsd: number | null): TacticalCardData[] {
  if (!kpis?.athUsd || !btcPriceUsd) return []
  const dropPct = ((kpis.athUsd - btcPriceUsd) / kpis.athUsd) * 100
  const s       = scoreAthDrop(dropPct)
  return [{ name: 'Distância do ATH', statusLabel: `−${dropPct.toFixed(0)}% do topo histórico`, description: `ATH = $${Math.round(kpis.athUsd).toLocaleString('en-US')}. Quedas acima de 50% do ATH são janelas raras com alto retorno histórico em 1 ano.`, value: `−${dropPct.toFixed(0)}%`, score: s, dotLevel: dl(s) }]
}

function extraCardsForGroup(key: string, tech: BtcTechnical | null, kpis: MarketKpis | null, btcPriceUsd: number | null): TacticalCardData[] {
  if (key === 'trend')   return buildTrendExtraCards(tech)
  if (key === 'onchain') return buildOnchainExtraCards(kpis, btcPriceUsd)
  return []
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function currentYearMonth() {
  const n = new Date()
  return { year: n.getFullYear(), month: n.getMonth() + 1 }
}

// ── Opportunities history ─────────────────────────────────────────────────────
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
  const [kpis,          setKpis]          = useState<MarketKpis | null>(null)
  const [technical,     setTechnical]     = useState<BtcTechnical | null>(null)
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

  useEffect(() => {
    fetch('/api/btc-market-kpis').then(r => r.ok ? r.json() : null).then(d => { if (d) setKpis(d) }).catch(() => {})
    fetch('/api/btc-technical').then(r => r.ok ? r.json() : null).then(d => { if (d) setTechnical(d) }).catch(() => {})
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

  const opportunityScore = market
    ? calculateDcaOpportunityScore({
        opportunityScore:  market.opportunityScore,
        riskScore:         market.riskScore,
        convictionScore:   market.convictionScore,
        euphoriaScore:     market.euphoriaScore  ?? 30,
        capitulationScore: market.capitulationScore ?? 25,
      })
    : 0

  const marketState       = classifyDcaMarketState(opportunityScore)
  const configWithDerived : DcaTacticalConfig = { ...config, usedThisMonth }
  const allocation        : DcaAllocation | null = monthlyAmount > 0
    ? calculateDcaAllocation(monthlyAmount, configWithDerived, opportunityScore, marketState)
    : null
  const tacticalPool = monthlyAmount - (allocation?.structuralDcaAmount ?? 0)

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

  if (!market) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', marginBottom: '24px' }}>

      {/* 1. Hero */}
      <TacticalHero
        score={opportunityScore}
        regime={market.marketRegime}
        reading={market.summary}
        btcPriceUsd={market.btcPriceUsd}
        generatedAt={market.generatedAt}
      />

      {/* 2. Opportunity bar */}
      <OpportunityBar score={opportunityScore} />

      {/* 3. KPI row */}
      <MarketKPIRow
        marketCapUsd={kpis?.marketCapUsd ?? null}
        volume24hUsd={kpis?.volume24hUsd ?? null}
        athUsd={kpis?.athUsd ?? null}
        dominancePct={kpis?.dominancePct ?? null}
        btcPriceUsd={market.btcPriceUsd}
      />

      {/* 4. Indicator sections */}
      {market.indicatorGroups.map(group => {
        const extra    = extraCardsForGroup(group.key, technical, kpis, market.btcPriceUsd)
        const allCards = [...group.indicators.map(indicatorToCard), ...extra]
        const groupScoreWithExtra = group.score + extra.reduce((s, c) => s + c.score, 0)
        return (
          <div key={group.key}>
            <TacticalSectionHeader label={group.label} score={groupScoreWithExtra} />
            {allCards.map((card, idx) => (
              <TacticalCard key={card.name} data={card} delay={idx * 0.04} />
            ))}
          </div>
        )
      })}

      {/* 5. Consensus */}
      <TacticalConsensus
        groups={market.indicatorGroups}
        extraScores={[...buildTrendExtraCards(technical), ...buildOnchainExtraCards(kpis, market.btcPriceUsd)].map(c => c.score)}
      />

      {/* 6. Insights */}
      <TacticalInsights insights={market.insights ?? []} />

      {/* 7. DCA section — collapsible */}
      {monthlyAmount > 0 && (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          <details>
            <summary style={{
              padding:       '16px 32px',
              cursor:        'pointer',
              fontSize:      '11px',
              fontWeight:    700,
              color:         'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '1.2px',
              listStyle:     'none',
              display:       'flex',
              alignItems:    'center',
              gap:           '8px',
            }}>
              <div style={{ width: '3px', height: '14px', background: 'var(--orange)', borderRadius: '2px' }} />
              Alocação DCA Tática
            </summary>
            <div style={{ padding: '0 0 24px' }}>
              <DcaStatusDoMesCard
                tacticalPool={tacticalPool}
                contributions={contributions}
                usedThisMonth={usedThisMonth}
              />
              <div style={{ padding: '0 0 0 0' }}>
                <TacticalOpportunitiesHistory contributions={contributions} />
              </div>
            </div>
          </details>
        </div>
      )}
    </div>
  )
}
