import type { IndicatorGroup } from '@/lib/shared/types/signal'

export interface TacticalPattern {
  name: string
  firedConditions: string[]
  occurrences: number
  avgReturn12m: number // percentage
}

interface SignalSlice {
  indicatorGroups: IndicatorGroup[]
  explanation: { smoothedScore: number }
}

function scoreOf(groups: IndicatorGroup[], name: string): number | null {
  for (const g of groups) {
    const ind = g.indicators.find(i => i.name === name)
    if (ind !== undefined) return ind.score
  }
  return null
}

interface PatternDef {
  name: string
  occurrences: number
  avgReturn12m: number
  check: (signal: SignalSlice) => string[] // returns fired conditions, empty = not fired
}

const PATTERNS: PatternDef[] = [
  {
    name: 'Acumulação Profunda',
    occurrences: 3,
    avgReturn12m: 280,
    check({ indicatorGroups, explanation }) {
      const mayer = scoreOf(indicatorGroups, 'Mayer Multiple') ?? 0
      const mvrv = scoreOf(indicatorGroups, 'MVRV') ?? 0
      const score = explanation.smoothedScore
      const conds: string[] = []
      if (mayer >= 1) conds.push('Mayer Multiple < 1.0 — BTC historicamente barato')
      if (mvrv >= 1) conds.push('MVRV < 1.5 — preço próximo ao custo dos holders')
      if (score < 35) conds.push(`Score de oportunidade ${score} — fundo de ciclo`)
      return conds.length === 3 ? conds : []
    },
  },
  {
    name: 'Capitulação com Pânico',
    occurrences: 4,
    avgReturn12m: 190,
    check({ indicatorGroups, explanation }) {
      const fear = scoreOf(indicatorGroups, 'Medo & Ganância') ?? 0
      const funding = scoreOf(indicatorGroups, 'Taxa de Funding') ?? 0
      const score = explanation.smoothedScore
      const conds: string[] = []
      if (fear >= 2) conds.push('Medo & Ganância em nível extremo — pânico no mercado')
      if (funding >= 1) conds.push('Taxa de Funding negativa — shorts dominam, reversão próxima')
      if (score < 20) conds.push(`Score ${score} — capitulação extrema`)
      return conds.length === 3 ? conds : []
    },
  },
  {
    name: 'Fundo Técnico Confirmado',
    occurrences: 6,
    avgReturn12m: 145,
    check({ indicatorGroups, explanation }) {
      const bollinger = scoreOf(indicatorGroups, 'Bollinger %B') ?? 0
      const mas = scoreOf(indicatorGroups, 'Médias Móveis') ?? 0
      const score = explanation.smoothedScore
      const conds: string[] = []
      if (bollinger >= 1) conds.push('Bollinger %B sobrevendido — abaixo da banda inferior')
      if (mas >= 2) conds.push('Abaixo de múltiplas médias móveis — desconto histórico')
      if (score < 35) conds.push(`Score ${score} — mercado em território de acumulação`)
      return conds.length === 3 ? conds : []
    },
  },
  {
    name: 'Hash Ribbon Recovery',
    occurrences: 5,
    avgReturn12m: 130,
    check({ indicatorGroups, explanation }) {
      const hash = scoreOf(indicatorGroups, 'Hash Ribbon') ?? 0
      const score = explanation.smoothedScore
      const conds: string[] = []
      if (hash >= 1) conds.push('Hash Ribbon cruzando para cima — mineradores se recuperando')
      if (score < 40) conds.push(`Score ${score} — fase de acumulação confirmada`)
      return conds.length === 2 ? conds : []
    },
  },
  {
    name: 'Dry Powder + Pânico',
    occurrences: 4,
    avgReturn12m: 112,
    check({ indicatorGroups, explanation }) {
      const stable = scoreOf(indicatorGroups, 'Stablecoin Ratio') ?? 0
      const fear = scoreOf(indicatorGroups, 'Medo & Ganância') ?? 0
      const dominance = scoreOf(indicatorGroups, 'BTC Dominância') ?? 0
      const conds: string[] = []
      if (stable >= 1) conds.push('Stablecoin Ratio alto — grande pólvora seca esperando')
      if (fear >= 1) conds.push('Medo no mercado — melhor entrada do que euforia')
      if (dominance >= 1) conds.push('BTC Dominância crescendo — capital migrando para Bitcoin')
      return conds.length === 3 ? conds : []
    },
  },
  {
    name: 'Death Cross Undervalued',
    occurrences: 3,
    avgReturn12m: 165,
    check({ indicatorGroups, explanation }) {
      const mas = scoreOf(indicatorGroups, 'Médias Móveis') ?? 0
      const mayer = scoreOf(indicatorGroups, 'Mayer Multiple') ?? 0
      const score = explanation.smoothedScore
      const conds: string[] = []
      if (mas >= 2) conds.push('Preço abaixo de múltiplas MAs — alinhamento de fundo')
      if (mayer >= 2) conds.push('Mayer Multiple < 0.85 — zona de desconto extremo histórico')
      if (score < 35) conds.push(`Score ${score} — condições de fundo de ciclo`)
      return conds.length === 3 ? conds : []
    },
  },
]

export function detectTacticalPatterns(signal: SignalSlice): TacticalPattern[] {
  const result: TacticalPattern[] = []
  for (const def of PATTERNS) {
    const fired = def.check(signal)
    if (fired.length > 0) {
      result.push({
        name: def.name,
        firedConditions: fired,
        occurrences: def.occurrences,
        avgReturn12m: def.avgReturn12m,
      })
    }
  }
  return result
}
