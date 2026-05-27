import { unstable_cache } from 'next/cache'
import { fetchJson } from '../utils/http'
import type { PricePoint } from './types'
import type { BinanceKline } from '../types/indicator'

const BINANCE_BASE = process.env.BINANCE_BASE_URL ?? 'https://data-api.binance.vision'

async function fetchCurrentBrlPrice(): Promise<number> {
  const data = await fetchJson<{ bitcoin?: { brl?: number } }>(
    'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=brl'
  )
  const price = data.bitcoin?.brl
  if (!price || price <= 0) throw new Error('CoinGecko: invalid BRL price')
  return price
}

async function _fetchBtcPriceHistoryBrl(): Promise<{ history: PricePoint[]; currentPrice: number }> {
  const url = `${BINANCE_BASE}/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=1500`
  const [klines, currentBrlPrice] = await Promise.all([
    fetchJson<BinanceKline[]>(url),
    fetchCurrentBrlPrice(),
  ])

  const closes = klines.map(k => parseFloat(k[4]))
  const lastUsdtClose = closes[closes.length - 1]
  if (!lastUsdtClose || lastUsdtClose <= 0) throw new Error(`Binance: invalid BTCUSDT data (lastClose=${lastUsdtClose})`)

  const usdToBrl = currentBrlPrice / lastUsdtClose

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

  return { history, currentPrice: currentBrlPrice }
}

export const fetchBtcPriceHistoryBrl = unstable_cache(
  _fetchBtcPriceHistoryBrl,
  ['btc-price-history-brl'],
  { revalidate: 3600 },
)
