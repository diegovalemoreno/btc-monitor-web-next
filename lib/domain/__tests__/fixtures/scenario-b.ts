// Scenario B: today, signals weakened slightly, expected raw score ~83
import type { IndicatorScore } from '../../shared/types/signal'

export const SCENARIO_B_INDICATORS: IndicatorScore[] = [
  { name: 'Medo & Ganância',     score:  2, summary: 'Medo (35)' },
  { name: 'Taxa de Funding',     score:  2, summary: 'Neutro (0.005%)' },
  { name: 'Variação 7d',         score:  0, summary: '-4% semana' },
  { name: 'Open Interest',       score:  1, summary: '-5% leve queda' },
  { name: 'Liq. de Longs',       score:  0, summary: 'Moderada' },
  { name: 'MVRV',                score:  2, summary: '0.88 — abaixo de 1' },
  { name: 'Preço Realizado',     score:  2, summary: 'BTC próximo ao preço realizado' },
  { name: 'Mayer Multiple',      score:  2, summary: '0.84' },
  { name: 'Hash Ribbon',         score:  1, summary: 'Cruzamento recente' },
  { name: 'Pressão venda',       score:  0, summary: 'Neutro' },
  { name: 'Médias Móveis',       score:  1, summary: 'Abaixo MA50d' },
  { name: 'ETF Institucional',   score:  0, summary: 'Neutro' },
  { name: 'Pi Cycle Top',        score: -1, summary: 'Sem sinal' },
  { name: 'Bollinger %B',        score: -1, summary: 'Abaixo da banda inferior' },
  { name: 'DXY (Dólar Index)',   score:  0, summary: 'Neutro' },
  { name: 'Long/Short Ratio',    score:  0, summary: '0.95 (49% longs)' },
  { name: 'BTC Dominância',      score:  1, summary: '53% estável' },
  { name: 'Heatmap Liquidações', score:  0, summary: 'Neutro' },
  { name: 'Stablecoin Ratio',    score:  0, summary: 'Neutro' },
]

export const SCENARIO_B_EXPECTED_RAW_RANGE = [75, 87] as const
