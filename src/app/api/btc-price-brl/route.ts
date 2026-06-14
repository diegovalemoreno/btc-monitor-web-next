import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const CACHE_TTL_MS = 120_000

interface CacheEntry { brl: number; usd: number; ts: number }
let cache: CacheEntry | null = null

async function fetchFromCoinbase(): Promise<{ brl: number; usd: number }> {
  const [brlRes, usdRes] = await Promise.all([
    fetch('https://api.coinbase.com/v2/prices/BTC-BRL/spot'),
    fetch('https://api.coinbase.com/v2/prices/BTC-USD/spot'),
  ])
  if (!brlRes.ok) throw new Error(`coinbase BRL ${brlRes.status}`)
  if (!usdRes.ok) throw new Error(`coinbase USD ${usdRes.status}`)
  const brlData = await brlRes.json() as { data?: { amount?: string } }
  const usdData = await usdRes.json() as { data?: { amount?: string } }
  const brl = parseFloat(brlData.data?.amount ?? '')
  const usd = parseFloat(usdData.data?.amount ?? '')
  if (!brl || brl <= 0 || !usd || usd <= 0) throw new Error('coinbase: invalid price')
  return { brl, usd }
}

export async function GET() {
  const now = Date.now()
  if (cache && now - cache.ts < CACHE_TTL_MS) {
    return NextResponse.json({ btcPriceBrl: cache.brl, btcPriceUsd: cache.usd, cached: true })
  }

  try {
    const prices = await fetchFromCoinbase()
    cache = { brl: prices.brl, usd: prices.usd, ts: now }
    return NextResponse.json({ btcPriceBrl: prices.brl, btcPriceUsd: prices.usd, source: 'coinbase', cached: false })
  } catch (err) {
    if (cache) return NextResponse.json({ btcPriceBrl: cache.brl, btcPriceUsd: cache.usd, cached: true, stale: true })
    return NextResponse.json({ error: (err as Error).message }, { status: 503 })
  }
}
