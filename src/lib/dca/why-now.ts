import type { IndicatorGroup } from '@/lib/shared/types/signal'

export interface WhyNowItem {
  indicatorName: string
  currentValue: string // extracted from summary (first token before ' — ')
  narrative: string // assertive one-liner for the user
  isPositive: boolean
}

// Priority order: most historically predictive for DCA timing first
const PRIORITY: string[] = [
  'Mayer Multiple',
  'MVRV',
  'Preço Realizado',
  'Pi Cycle Top',
  'Médias Móveis',
  'Bollinger %B',
  'Medo & Ganância',
  'Hash Ribbon',
  'BTC Dominância',
  'Stablecoin Ratio',
]

const NARRATIVE: Record<string, (score: number) => string> = {
  'Mayer Multiple': s =>
    s > 0
      ? 'Abaixo de 1.0 — BTC historicamente barato em relação à MM200. Janela clássica de acumulação.'
      : 'Acima de 1.0 — BTC acima da média histórica. Reduzir exposição.',
  'MVRV': s =>
    s > 0
      ? 'Abaixo de 1.5 — preço próximo ao custo médio dos holders. Historicamente favorável para acumular.'
      : 'Holders com lucro elevado — ciclo maduro ou topo próximo.',
  'Preço Realizado': s =>
    s > 0
      ? 'Preço abaixo do custo médio dos holders. Maioria está no prejuízo — zona histórica de fundo.'
      : 'Preço acima do realizado — holders em lucro, risco de distribuição.',
  'Pi Cycle Top': s =>
    s > 0
      ? 'Ratio longe de 100% — ciclo distante do topo. Fase certa para acumular.'
      : 'Ratio próximo de 100% — indicador histórico de topo. Cautela.',
  'Médias Móveis': s =>
    s > 0
      ? 'Preço abaixo de múltiplas médias móveis — desconto histórico significativo.'
      : 'Preço acima das médias — mercado esticado.',
  'Bollinger %B': s =>
    s > 0
      ? 'Abaixo da banda inferior — estatisticamente sobrevendido. Reversão iminente.'
      : 'Acima da banda superior — estatisticamente sobrecomprado.',
  'Medo & Ganância': s =>
    s > 0
      ? 'Medo extremo no mercado. Historicamente, aportar no pânico traz os maiores retornos.'
      : 'Ganância elevada — euforia de topo. Pior momento para comprar.',
  'Hash Ribbon': s =>
    s > 0
      ? 'Mineradores capitularam e se recuperaram. Sinal histórico de fundo de ciclo.'
      : 'Mineradores sob pressão — fase de baixa em andamento.',
  'BTC Dominância': s =>
    s > 0
      ? 'Dominância do BTC crescendo — capital migrando para Bitcoin. Momento de acumulação em BTC.'
      : 'Dominância caindo — capital em altcoins. Ciclo maduro ou rotação.',
  'Stablecoin Ratio': s =>
    s > 0
      ? 'Alto volume de stablecoins paradas — demanda reprimida esperando entrar.'
      : 'Stablecoins já deployadas — mercado sem pólvora seca.',
}

function extractValue(summary: string): string {
  if (!summary || summary.startsWith('indisponível')) return '—'
  const beforeDash = summary.split(' — ')[0].trim()
  return beforeDash || '—'
}

export function buildWhyNow(groups: IndicatorGroup[]): WhyNowItem[] {
  const byName = new Map<string, { score: number; summary: string }>()
  for (const g of groups) {
    for (const ind of g.indicators) {
      byName.set(ind.name, { score: ind.score, summary: ind.summary })
    }
  }

  const result: WhyNowItem[] = []
  for (const name of PRIORITY) {
    if (result.length >= 4) break
    const ind = byName.get(name)
    if (!ind || ind.score === 0) continue
    const narrativeFn = NARRATIVE[name]
    if (!narrativeFn) continue
    result.push({
      indicatorName: name,
      currentValue: extractValue(ind.summary),
      narrative: narrativeFn(ind.score),
      isPositive: ind.score > 0,
    })
  }
  return result
}
