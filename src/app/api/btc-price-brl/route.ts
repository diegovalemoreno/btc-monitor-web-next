import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const CACHE_TTL_MS = 120_000

interface CacheEntry { brl: number; usd: number; ts: number }
let cache: CacheEntry | null = null

async function fetchFromCoinGecko(): Promise<{ brl: number; usd: number }> {
  const res = await fetch(
    'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=brl,usd',
    { headers: { Accept: 'application/json' } }
  )
  if (!res.ok) throw new Error(`coingecko ${res.status}`)
  const data = await res.json() as { bitcoin?: { brl?: number; usd?: number } }
  const brl = data.bitcoin?.brl
  const usd = data.bitcoin?.usd
  if (!brl || brl <= 0 || !usd || usd <= 0) throw new Error('coingecko: invalid price')
  return { brl, usd }
}

async function fetchFromMercadoBitcoin(): Promise<{ brl: number; usd: number }> {
  const res = await fetch('https://www.mercadobitcoin.net/api/BTC/ticker/')
  if (!res.ok) throw new Error(`mercadobitcoin ${res.status}`)
  const data = await res.json() as { ticker?: { last?: string } }
  const brl = parseFloat(data.ticker?.last ?? '0')
  if (!brl || brl <= 0) throw new Error('mercadobitcoin: invalid price')
  return { brl, usd: 0 }
}

export async function GET() {
  const now = Date.now()
  if (cache && now - cache.ts < CACHE_TTL_MS) {
    return NextResponse.json({ btcPriceBrl: cache.brl, btcPriceUsd: cache.usd, cached: true })
  }

  let prices: { brl: number; usd: number } | null = null
  let source = ''

  try {
    prices = await fetchFromCoinGecko()
    source = 'coingecko'
  } catch {
    try {
      prices = await fetchFromMercadoBitcoin()
      source = 'mercadobitcoin'
    } catch (err2) {
      if (cache) return NextResponse.json({ btcPriceBrl: cache.brl, btcPriceUsd: cache.usd, cached: true, stale: true })
      return NextResponse.json({ error: (err2 as Error).message }, { status: 503 })
    }
  }

  cache = { brl: prices!.brl, usd: prices!.usd, ts: now }
  return NextResponse.json({ btcPriceBrl: prices!.brl, btcPriceUsd: prices!.usd, source, cached: false })
}
