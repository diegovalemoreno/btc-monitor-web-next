import { NextResponse } from 'next/server'

export const revalidate = 3600

interface CoinMetricsRow {
  asset: string
  time:  string
  RealizedPrice_Adj_STH?: string | null
  RealizedPrice_Adj_LTH?: string | null
  PriceUSD?:              string | null
}

export async function GET() {
  try {
    const [cmRes, fxRes] = await Promise.all([
      fetch(
        'https://community-api.coinmetrics.io/v4/timeseries/asset-metrics' +
        '?assets=btc&metrics=RealizedPrice_Adj_STH,RealizedPrice_Adj_LTH,PriceUSD&frequency=1d',
        { headers: { Accept: 'application/json' } }
      ),
      fetch('https://api.frankfurter.app/latest?from=USD&to=BRL'),
    ])

    if (!fxRes.ok) throw new Error(`Frankfurter: ${fxRes.status}`)

    if (!cmRes.ok) {
      const cmErr = await cmRes.json().catch(() => ({})) as { error?: { type?: string } }
      if (cmErr?.error?.type === 'bad_parameter') {
        return NextResponse.json(
          { error: 'Métricas STH/LTH não disponíveis no plano community' },
          { status: 503 }
        )
      }
      throw new Error(`CoinMetrics: ${cmRes.status}`)
    }

    const cm = await cmRes.json() as { data: CoinMetricsRow[] }
    const fx = await fxRes.json() as { rates: { BRL: number } }

    const usdBrlRate = fx.rates?.BRL
    if (!usdBrlRate || usdBrlRate <= 0) throw new Error('Frankfurter: taxa USD/BRL inválida')

    const sample = cm.data?.[0]
    if (!sample || sample.RealizedPrice_Adj_STH == null || sample.RealizedPrice_Adj_LTH == null) {
      return NextResponse.json(
        { error: 'Métricas STH/LTH não disponíveis no plano community' },
        { status: 503 }
      )
    }

    const data = cm.data
      .filter(r => r.RealizedPrice_Adj_STH != null && r.RealizedPrice_Adj_LTH != null && r.PriceUSD != null)
      .map(r => {
        const sthUsd  = parseFloat(r.RealizedPrice_Adj_STH!)
        const lthUsd  = parseFloat(r.RealizedPrice_Adj_LTH!)
        const spotUsd = parseFloat(r.PriceUSD!)
        return {
          date:    r.time.slice(0, 10),
          sthUsd,  lthUsd,  spotUsd,
          sthBrl:  sthUsd  * usdBrlRate,
          lthBrl:  lthUsd  * usdBrlRate,
          spotBrl: spotUsd * usdBrlRate,
        }
      })

    return NextResponse.json({ data, usdBrlRate })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 503 })
  }
}
