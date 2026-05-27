// Scenario A: yesterday, strong buy signals, expected raw score ~90
import type { IndicatorScore } from '../../shared/types/signal'

export const SCENARIO_A_INDICATORS: IndicatorScore[] = [
  { name: 'Medo & Ganância',     score:  2, summary: 'Medo extremo (18)' },
  { name: 'Taxa de Funding',     score:  2, summary: 'Negativo (-0.015%)' },
  { name: 'Variação 7d',         score:  1, summary: '-12% semana' },
  { name: 'Open Interest',       score:  1, summary: '-11% desalavancagem' },
  { name: 'Liq. de Longs',       score:  0, summary: 'Moderada' },
  { name: 'MVRV',                score:  2, summary: '0.85 — abaixo de 1' },
  { name: 'Preço Realizado',     score:  2, summary: 'BTC abaixo do preço realizado' },
  { name: 'Mayer Multiple',      score:  2, summary: '0.82' },
  { name: 'Hash Ribbon',         score:  1, summary: 'Cruzamento recente' },
  { name: 'Pressão venda',       score:  0, summary: 'Neutro' },
  { name: 'Médias Móveis',       score:  1, summary: 'Abaixo MA50d' },
  { name: 'ETF Institucional',   score:  0, summary: 'Entrada líquida leve' },
  { name: 'Pi Cycle Top',        score: -1, summary: 'Sem sinal' },
  { name: 'Bollinger %B',        score: -1, summary: 'Abaixo da banda inferior' },
  { name: 'DXY (Dólar Index)',   score:  0, summary: 'Neutro' },
  { name: 'Long/Short Ratio',    score:  1, summary: '0.82 (45% longs)' },
  { name: 'BTC Dominância',      score:  1, summary: '54% alta' },
  { name: 'Heatmap Liquidações', score:  1, summary: 'Cluster de suporte' },
  { name: 'Stablecoin Ratio',    score:  0, summary: 'Neutro' },
]

export const SCENARIO_A_EXPECTED_RAW_RANGE = [85, 95] as const
