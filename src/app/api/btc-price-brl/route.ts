import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const CACHE_TTL_MS = 120_000

interface CacheEntry { price: number; ts: number }
let cache: CacheEntry | null = null

export async function GET() {
  const now = Date.now()
  if (cache && now - cache.ts < CACHE_TTL_MS) {
    return NextResponse.json({ btcPriceBrl: cache.price, cached: true })
  }

  try {
    const res = await fetch('https://economia.awesomeapi.com.br/last/BTC-BRL', {
      next: { revalidate: 120 },
    })
    if (!res.ok) throw new Error(`awesomeapi status ${res.status}`)
    const data = await res.json() as { BTCBRL?: { bid: string } }
    const price = parseFloat(data.BTCBRL?.bid ?? '0')
    if (!price || price <= 0) throw new Error('Invalid BTC-BRL price')
    cache = { price, ts: now }
    return NextResponse.json({ btcPriceBrl: price, cached: false })
  } catch (err) {
    if (cache) return NextResponse.json({ btcPriceBrl: cache.price, cached: true, stale: true })
    return NextResponse.json({ error: (err as Error).message }, { status: 503 })
  }
}
