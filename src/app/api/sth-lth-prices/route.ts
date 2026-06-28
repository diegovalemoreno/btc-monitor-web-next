import { NextResponse } from 'next/server'

export const revalidate = 3600

type BinanceKline = [number, string, string, string, string, ...unknown[]]

function sma(prices: number[], window: number): (number | null)[] {
  return prices.map((_, i) => {
    if (i < window - 1) return null
    let sum = 0
    for (let j = i - window + 1; j <= i; j++) sum += prices[j]
    return sum / window
  })
}

export async function GET() {
  try {
    const [klinesRes, fxRes] = await Promise.all([
      fetch('https://data-api.binance.vision/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=1500'),
      fetch('https://api.frankfurter.app/latest?from=USD&to=BRL'),
    ])

    if (!klinesRes.ok) throw new Error(`Binance: ${klinesRes.status}`)
    if (!fxRes.ok)     throw new Error(`Frankfurter: ${fxRes.status}`)

    const klines = await klinesRes.json() as BinanceKline[]
    const fx     = await fxRes.json() as { rates: { BRL: number } }

    const usdBrlRate = fx.rates?.BRL
    if (!usdBrlRate || usdBrlRate <= 0) throw new Error('Frankfurter: taxa USD/BRL inválida')

    const closes = klines.map(k => parseFloat(k[4] as string))
    const sma30  = sma(closes, 30)
    const sma200 = sma(closes, 200)

    const data = klines
      .map((k, i) => {
        const sthUsd  = sma30[i]
        const lthUsd  = sma200[i]
        const spotUsd = closes[i]
        if (sthUsd === null || lthUsd === null) return null
        return {
          date:    new Date(k[0]).toISOString().slice(0, 10),
          sthUsd,  lthUsd,  spotUsd,
          sthBrl:  sthUsd  * usdBrlRate,
          lthBrl:  lthUsd  * usdBrlRate,
          spotBrl: spotUsd * usdBrlRate,
        }
      })
      .filter((p): p is NonNullable<typeof p> => p !== null)

    return NextResponse.json({ data, usdBrlRate })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 503 })
  }
}
