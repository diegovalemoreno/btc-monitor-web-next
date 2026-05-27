// Canonical weight map for the 19 base indicators.
// Keys match TacticalSignal.indicators[].name (PT display names).
// Derived indicators (Regime de Mercado, Sinais Compostos) intentionally excluded.

export const BASE_WEIGHTS: Record<string, number> = {
  'Medo & Ganância': 1.5,
  'Taxa de Funding': 1.5,
  'Variação 7d': 1,
  'Open Interest': 1.5,
  'Liq. de Longs': 1.5,
  'MVRV': 2,
  'Preço Realizado': 2,
  'Mayer Multiple': 2,
  'Hash Ribbon': 1,
  'Pressão venda': 1,
  'Médias Móveis': 1,
  'ETF Institucional': 1.5,
  'Pi Cycle Top': 1.5,
  'Bollinger %B': 1,
  'DXY (Dólar Index)': 1,
  'Long/Short Ratio': 1.5,
  'BTC Dominância': 1,
  'Heatmap Liquidações': 1.5,
  'Stablecoin Ratio': 1,
}
