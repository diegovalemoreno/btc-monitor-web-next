// src/app/api/btc-market-kpis/route.ts
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [coinsRes, globalRes] = await Promise.all([
      fetch(
        'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin',
        { headers: { Accept: 'application/json' } }
      ),
      fetch(
        'https://api.coingecko.com/api/v3/global',
        { headers: { Accept: 'application/json' } }
      ),
    ])

    if (!coinsRes.ok) throw new Error(`CoinGecko coins: ${coinsRes.status}`)
    if (!globalRes.ok) throw new Error(`CoinGecko global: ${globalRes.status}`)

    const coins  = await coinsRes.json() as { market_cap: number; total_volume: number; ath: number; ath_change_percentage: number }[]
    const global = await globalRes.json() as { data?: { market_cap_percentage?: { btc?: number } } }

    if (!coins.length) throw new Error('CoinGecko: sem dados')

    const { market_cap, total_volume, ath, ath_change_percentage } = coins[0]
    if (!market_cap || !total_volume || !ath) throw new Error('CoinGecko: campos ausentes')

    const dom = global.data?.market_cap_percentage?.btc
    if (!dom || dom <= 0) throw new Error('CoinGecko: dominância indisponível')

    return NextResponse.json({
      marketCapUsd:  market_cap,
      volume24hUsd:  total_volume,
      athUsd:        ath,
      athDropPct:    Math.abs(ath_change_percentage),
      dominancePct:  dom,
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 503 })
  }
}
