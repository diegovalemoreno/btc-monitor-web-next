'use client'

import { useState, useEffect } from 'react'
import type { TacticalSignal } from '@lib/shared/types/signal'
import type { TacticalCardData } from '../dca-tactical/tactical/TacticalCard'

import TacticalCard         from '../dca-tactical/tactical/TacticalCard'
import TacticalHero         from '../dca-tactical/tactical/TacticalHero'
import OpportunityBar       from '../dca-tactical/tactical/OpportunityBar'
import MarketKPIRow         from '../dca-tactical/tactical/MarketKPIRow'
import TacticalSectionHeader from '../dca-tactical/tactical/TacticalSectionHeader'
import TacticalConsensus    from '../dca-tactical/tactical/TacticalConsensus'
import TacticalInsights     from '../dca-tactical/tactical/TacticalInsights'

// ── Types ─────────────────────────────────────────────────────────────────────

interface MarketKpis {
  marketCapUsd: number | null
  volume24hUsd: number | null
  athUsd:       number | null
  athDropPct:   number | null
  dominancePct: number | null
}

interface BtcTechnical {
  rsi14:           number | null
  macdHist:        number | null
  macdPositive:    boolean | null
  macdGrowing:     boolean | null
  ma200:           number | null
  ma50:            number | null
  ma200DistPct:    number | null
  crossType:       'golden' | 'death' | null
  piCycleRatioPct: number | null
  piCycleScore:    number | null
  piCycleLabel:    string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

const INDICATOR_WHAT: Record<string, string> = {
  'Medo & Ganância':    'Índice 0–100 de sentimento. Medo extremo (≤20) = todos vendendo em pânico = historicamente os melhores pontos de entrada. Ganância extrema (≥80) = euforia de topo = pior hora para comprar.',
  'Taxa de Funding':    'Funding negativo = shorts pagam longs = mercado alavancado na baixa, possível exaustão dos vendedores e reversão.',
  'Variação 7d':        'Queda forte em 7 dias pode indicar capitulação — janelas históricas de acumulação. Alta forte pode sinalizar sobrecompra de curto prazo.',
  'Open Interest':      'OI alto com preço elevado = risco de liquidações em cascata. OI caindo após queda = limpeza de alavancagem, possivelmente estabilizando.',
  'Liq. de Longs':      'Liquidações em massa de posições compradas sinalizam capitulação e criam fundos locais — oportunidade para quem está fora.',
  'MVRV':               'Abaixo de 1: BTC abaixo do custo médio dos holders — historicamente raro e muito favorável. Acima de 3.5: holders em grande lucro, sinal de topo.',
  'Preço Realizado':    'Quando o preço de mercado fica abaixo do Preço Realizado, a maioria dos holders está no prejuízo — zona histórica de acumulação.',
  'Mayer Multiple':     'Preço ÷ MM200. Abaixo de 1.0 = historicamente barato. Abaixo de 0.7 = zona rara. Acima de 2.4 = extremo histórico de sobrevalorização.',
  'Hash Ribbon':        'Quando mineradores capitulam (hashrate cai), pode sinalizar fundo. Cruzamento de recuperação = sinal histórico de compra.',
  'Pressão venda':      'Alta pressão = mais BTC chegando ao mercado. Baixa pressão = holders retendo, expectativa de valorização.',
  'Médias Móveis':      'Posição do preço vs MAs de 50d, 100d e 200d. Abaixo de múltiplas MAs = desconto histórico. Golden/Death Cross indicam mudança de tendência.',
  'ETF Institucional':  'Entradas positivas = instituições comprando. Saídas = desinvestimento — reflete demanda do mercado tradicional.',
  'Pi Cycle Top':       'Quando MM111 cruza o dobro da MM350, historicamente coincide com topos de ciclo. Longe do cruzamento = bom para acumular.',
  'Bollinger %B':       'Abaixo de 0: sobrevendido (abaixo da banda inferior). Acima de 1: sobrecomprado. Extremos indicam reversão iminente.',
  'DXY (Dólar Index)':  'DXY forte = pressão sobre BTC. DXY fraco = condições historicamente favoráveis para criptomoedas.',
  'Long/Short Ratio':   'Excesso de longs = otimismo excessivo, risco. Excesso de shorts = pessimismo extremo, potencial reversão.',
  'BTC Dominância':     'Crescendo = capital migrando para BTC. Caindo = altcoins superando — geralmente ocorre em topos de ciclo.',
  'Heatmap Liquidações':'Identifica zonas onde o mercado tende a se mover para liquidar posições alavancadas antes de reverter.',
  'Stablecoin Ratio':   'Ratio alto = muito capital parado esperando entrar — sinal de demanda futura reprimida.',
  'Regime de Mercado':  'Classificação sintética do estado atual: capitulação, compra tática, neutro, risk-off, alavancagem excessiva ou euforia.',
  'Sinais Compostos':   'Detecta padrões multi-indicadores como "funding negativo + OI caindo + medo extremo" que individualmente seriam inconclusivos.',
}

function indicatorToCard(ind: { name: string; score: number; summary: string }): TacticalCardData {
  const { rawValue, specificLabel } = parseSummary(ind.summary)
  const level = dl(ind.score)
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
  if (tech.piCycleRatioPct !== null && tech.piCycleScore !== null && tech.piCycleLabel !== null) {
    cards.push({ name: 'Pi Cycle — Fase do Ciclo', statusLabel: tech.piCycleLabel, description: `MM111 ÷ (2×MM350) = ${tech.piCycleRatioPct}%. Abaixo de 55% = ciclo longe do topo = boa fase para comprar. Acima de 90–100% = indicador histórico de topo de ciclo: hora de vender.`, value: `${tech.piCycleRatioPct}%`, score: tech.piCycleScore, dotLevel: dl(tech.piCycleScore) })
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

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  signal:           TacticalSignal
  opportunityScore: number
}

export default function TacticalContent({ signal, opportunityScore }: Props) {
  const [kpis,      setKpis]      = useState<MarketKpis | null>(null)
  const [technical, setTechnical] = useState<BtcTechnical | null>(null)

  useEffect(() => {
    fetch('/api/btc-market-kpis').then(r => r.ok ? r.json() : null).then(d => { if (d) setKpis(d) }).catch(() => {})
    fetch('/api/btc-technical').then(r => r.ok ? r.json() : null).then(d => { if (d) setTechnical(d) }).catch(() => {})
  }, [])

  const extraScores = [
    ...buildTrendExtraCards(technical),
    ...buildOnchainExtraCards(kpis, signal.btcPrice),
  ].map(c => c.score)

  return (
    <div style={{
      display:      'flex',
      flexDirection:'column',
      background:   'var(--surface)',
      border:       '1px solid var(--border)',
      borderRadius: '12px',
      overflow:     'hidden',
    }}>
      {/* 1. Hero */}
      <TacticalHero
        score={opportunityScore}
        regime={signal.regime}
        reading={signal.reading}
        btcPriceUsd={signal.btcPrice}
        generatedAt={signal.generatedAt}
      />

      {/* 2. Opportunity bar */}
      <OpportunityBar score={opportunityScore} />

      {/* 3. KPI row */}
      <MarketKPIRow
        marketCapUsd={kpis?.marketCapUsd ?? null}
        volume24hUsd={kpis?.volume24hUsd ?? null}
        athUsd={kpis?.athUsd ?? null}
        dominancePct={kpis?.dominancePct ?? null}
        btcPriceUsd={signal.btcPrice}
      />

      {/* 4. Indicator sections */}
      {signal.indicatorGroups.map(group => {
        const extra    = extraCardsForGroup(group.key, technical, kpis, signal.btcPrice)
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
        groups={signal.indicatorGroups}
        extraScores={extraScores}
      />

      {/* 6. Insights */}
      <TacticalInsights insights={signal.insights ?? []} />
    </div>
  )
}
