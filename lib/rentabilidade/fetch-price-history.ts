import { unstable_cache } from 'next/cache'
import { fetchJson } from '../utils/http'
import type { PricePoint } from './types'
import type { BinanceKline } from '../types/indicator'

const BINANCE_BASE = process.env.BINANCE_BASE_URL ?? 'https://data-api.binance.vision'

async function fetchBtcBrlPrice(): Promise<number> {
  const data = await fetchJson<{ data?: { amount?: string } }>(
    'https://api.coinbase.com/v2/prices/BTC-BRL/spot'
  )
  const price = parseFloat(data.data?.amount ?? '')
  if (!price || price <= 0) throw new Error('Coinbase: invalid BTC-BRL price')
  return price
}

const fetchHistoryOnly = unstable_cache(
  async (): Promise<PricePoint[]> => {
    const url = `${BINANCE_BASE}/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=1500`
    const [klines, spotBrl] = await Promise.all([
      fetchJson<BinanceKline[]>(url),
      fetchBtcBrlPrice(),
    ])

    const closes = klines.map(k => parseFloat(k[4]))
    const lastUsdtClose = closes[closes.length - 1]
    if (!lastUsdtClose || lastUsdtClose <= 0) throw new Error(`Binance: invalid BTCUSDT data (lastClose=${lastUsdtClose})`)

    const usdToBrl = spotBrl / lastUsdtClose

    return klines
      .map(k => {
        const closeUsdt = parseFloat(k[4])
        if (isNaN(closeUsdt)) return null
        return {
          date:  new Date(k[0]).toISOString().slice(0, 10),
          price: Math.round(closeUsdt * usdToBrl),
        }
      })
      .filter((p): p is PricePoint => p !== null)
  },
  ['btc-price-history-brl'],
  { revalidate: 3600 },
)

export async function fetchBtcPriceHistoryBrl(): Promise<{ history: PricePoint[]; currentPrice: number }> {
  const [history, currentPrice] = await Promise.all([
    fetchHistoryOnly(),
    fetchBtcBrlPrice(),
  ])
  return { history, currentPrice }
}
