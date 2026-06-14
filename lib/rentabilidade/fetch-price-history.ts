import { unstable_cache } from 'next/cache'
import { fetchJson } from '../utils/http'
import type { PricePoint } from './types'
import type { BinanceKline } from '../types/indicator'

const BINANCE_BASE = process.env.BINANCE_BASE_URL ?? 'https://data-api.binance.vision'

async function fetchUsdToBrl(): Promise<number> {
  const data = await fetchJson<{ rates?: { BRL?: number } }>(
    'https://api.frankfurter.app/latest?from=USD&to=BRL'
  )
  const rate = data.rates?.BRL
  if (!rate || rate <= 0) throw new Error('Frankfurter: invalid USD-BRL rate')
  return rate
}

async function _fetchBtcPriceHistoryBrl(): Promise<{ history: PricePoint[]; currentPrice: number }> {
  const url = `${BINANCE_BASE}/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=1500`
  const [klines, usdToBrl] = await Promise.all([
    fetchJson<BinanceKline[]>(url),
    fetchUsdToBrl(),
  ])

  const closes = klines.map(k => parseFloat(k[4]))
  const lastUsdtClose = closes[closes.length - 1]
  if (!lastUsdtClose || lastUsdtClose <= 0) throw new Error(`Binance: invalid BTCUSDT data (lastClose=${lastUsdtClose})`)

  const currentPrice = Math.round(lastUsdtClose * usdToBrl)

  const history: PricePoint[] = klines
    .map(k => {
      const closeUsdt = parseFloat(k[4])
      if (isNaN(closeUsdt)) return null
      return {
        date:  new Date(k[0]).toISOString().slice(0, 10),
        price: Math.round(closeUsdt * usdToBrl),
      }
    })
    .filter((p): p is PricePoint => p !== null)

  return { history, currentPrice }
}

export const fetchBtcPriceHistoryBrl = unstable_cache(
  _fetchBtcPriceHistoryBrl,
  ['btc-price-history-brl'],
  { revalidate: 3600 },
)
