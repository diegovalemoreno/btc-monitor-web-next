// src/app/api/btc-market-kpis/route.ts
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [coinsRes, globalRes] = await Promise.all([
      fetch(
        'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin',
        { headers: { Accept: 'application/json' }, next: { revalidate: 300 } }
      ),
      fetch(
        'https://api.coingecko.com/api/v3/global',
        { headers: { Accept: 'application/json' }, next: { revalidate: 300 } }
      ),
    ])

    if (!coinsRes.ok) throw new Error(`CoinGecko coins: ${coinsRes.status}`)
    if (!globalRes.ok) throw new Error(`CoinGecko global: ${globalRes.status}`)

    const coins  = await coinsRes.json() as [{
      market_cap:             number
      total_volume:           number
      ath:                    number
      ath_change_percentage:  number
    }]
    const global = await globalRes.json() as { data: { market_cap_percentage: { btc: number } } }

    const coin = coins[0]
    return NextResponse.json({
      marketCapUsd:  coin.market_cap,
      volume24hUsd:  coin.total_volume,
      athUsd:        coin.ath,
      athDropPct:    Math.abs(coin.ath_change_percentage),  // positive % below ATH
      dominancePct:  global.data.market_cap_percentage.btc,
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 503 })
  }
}
