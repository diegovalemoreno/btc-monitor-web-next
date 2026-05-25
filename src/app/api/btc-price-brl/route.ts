import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const CACHE_TTL_MS = 120_000

interface CacheEntry { price: number; ts: number }
let cache: CacheEntry | null = null

async function fetchFromCoinGecko(): Promise<number> {
  const res = await fetch(
    'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=brl',
    { headers: { Accept: 'application/json' } }
  )
  if (!res.ok) throw new Error(`coingecko ${res.status}`)
  const data = await res.json() as { bitcoin?: { brl?: number } }
  const price = data.bitcoin?.brl
  if (!price || price <= 0) throw new Error('coingecko: invalid price')
  return price
}

async function fetchFromMercadoBitcoin(): Promise<number> {
  const res = await fetch('https://www.mercadobitcoin.net/api/BTC/ticker/')
  if (!res.ok) throw new Error(`mercadobitcoin ${res.status}`)
  const data = await res.json() as { ticker?: { last?: string } }
  const price = parseFloat(data.ticker?.last ?? '0')
  if (!price || price <= 0) throw new Error('mercadobitcoin: invalid price')
  return price
}

export async function GET() {
  const now = Date.now()
  if (cache && now - cache.ts < CACHE_TTL_MS) {
    return NextResponse.json({ btcPriceBrl: cache.price, cached: true })
  }

  let price: number | null = null
  let source = ''

  try {
    price = await fetchFromCoinGecko()
    source = 'coingecko'
  } catch {
    try {
      price = await fetchFromMercadoBitcoin()
      source = 'mercadobitcoin'
    } catch (err2) {
      if (cache) return NextResponse.json({ btcPriceBrl: cache.price, cached: true, stale: true })
      return NextResponse.json({ error: (err2 as Error).message }, { status: 503 })
    }
  }

  cache = { price: price!, ts: now }
  return NextResponse.json({ btcPriceBrl: price, source, cached: false })
}
