import type { IndicatorGroup } from '@/lib/shared/types/signal'

export interface WhyNowItem {
  indicatorName: string
  currentValue:  string
  statusLabel:   string   // short colored label (e.g. "Abaixo de 1.0 — BTC Barato")
  description:   string   // longer muted explanation
  score:         number   // raw indicator score (-2 to +2)
  isPositive:    boolean
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

const LABEL_DESC: Record<string, (score: number) => { statusLabel: string; description: string }> = {
  'Mayer Multiple': s => s > 0
    ? { statusLabel: 'Abaixo de 1.0 — BTC Barato',         description: 'BTC historicamente barato em relação à MM200. Janela clássica de acumulação.' }
    : { statusLabel: 'Acima de 1.0 — Reduzir Exposição',   description: 'BTC acima da média histórica. Pior momento para comprar.' },
  'MVRV': s => s > 0
    ? { statusLabel: 'Abaixo de 1.5 — Acumulação',         description: 'Preço próximo ao custo médio dos holders. Historicamente favorável para acumular.' }
    : { statusLabel: 'Lucro Elevado — Topo Próximo',        description: 'Holders com lucro elevado — ciclo maduro ou topo próximo.' },
  'Preço Realizado': s => s > 0
    ? { statusLabel: 'Abaixo do Preço Realizado',           description: 'Maioria dos holders está no prejuízo — zona histórica de fundo de ciclo.' }
    : { statusLabel: 'Acima do Preço Realizado',            description: 'Holders em lucro, risco de distribuição.' },
  'Pi Cycle Top': s => s > 0
    ? { statusLabel: 'Longe do Topo de Ciclo',              description: 'Ratio longe de 100% — ciclo distante do topo. Fase certa para acumular.' }
    : { statusLabel: 'Aproximando do Topo',                 description: 'Ratio próximo de 100% — indicador histórico de topo. Cautela máxima.' },
  'Médias Móveis': s => s > 0
    ? { statusLabel: 'Abaixo das Médias — Desconto',        description: 'Preço abaixo de múltiplas médias móveis — desconto histórico significativo.' }
    : { statusLabel: 'Acima das Médias — Esticado',         description: 'Preço acima das médias — mercado esticado.' },
  'Bollinger %B': s => s > 0
    ? { statusLabel: 'Sobrevendido — Reversão Iminente',    description: 'Abaixo da banda inferior de Bollinger — estatisticamente sobrevendido.' }
    : { statusLabel: 'Sobrecomprado',                       description: 'Acima da banda superior — estatisticamente sobrecomprado.' },
  'Medo & Ganância': s => s > 0
    ? { statusLabel: 'Medo Extremo — Melhor Entrada',       description: 'Historicamente, aportar no pânico traz os maiores retornos em 12 meses.' }
    : { statusLabel: 'Ganância Extrema — Euforia de Topo',  description: 'Pior momento para comprar. Capital em risco elevado.' },
  'Hash Ribbon': s => s > 0
    ? { statusLabel: 'Recuperação dos Mineradores',         description: 'Mineradores capitularam e se recuperaram. Sinal histórico de fundo de ciclo.' }
    : { statusLabel: 'Mineradores Sob Pressão',             description: 'Fase de baixa em andamento para os mineradores.' },
  'BTC Dominância': s => s > 0
    ? { statusLabel: 'Dominância Crescendo — Acumulação',   description: 'Capital migrando para Bitcoin. Momento de acumulação em BTC.' }
    : { statusLabel: 'Dominância Caindo — Rotação',         description: 'Capital em altcoins. Ciclo maduro ou rotação de portfólio.' },
  'Stablecoin Ratio': s => s > 0
    ? { statusLabel: 'Alta Pólvora Seca',                   description: 'Grande volume de stablecoins paradas — demanda reprimida esperando entrar.' }
    : { statusLabel: 'Stablecoins Deployadas',              description: 'Mercado sem pólvora seca — menor demanda futura reprimida.' },
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
    const labelDescFn = LABEL_DESC[name]
    if (!labelDescFn) continue
    const { statusLabel, description } = labelDescFn(ind.score)
    result.push({
      indicatorName: name,
      currentValue:  extractValue(ind.summary),
      statusLabel,
      description,
      score:         ind.score,
      isPositive:    ind.score > 0,
    })
  }
  return result
}
