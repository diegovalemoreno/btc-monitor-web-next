import { NextResponse } from 'next/server'

export const revalidate = 3600

// Glassnode response shape: [{ t: unixSeconds, v: number }, ...]
type GlassnodePoint = { t: number; v: number }

function unixToDate(t: number): string {
  return new Date(t * 1000).toISOString().slice(0, 10)
}

export async function GET() {
  const apiKey = process.env.GLASSNODE_API_KEY

  if (!apiKey) {
    return NextResponse.json(
      { error: 'GLASSNODE_API_KEY não configurado. Crie uma conta em glassnode.com e adicione a chave ao .env.local.' },
      { status: 503 }
    )
  }

  try {
    const base  = 'https://api.glassnode.com/v1/metrics'
    const q     = `a=BTC&i=24h&api_key=${apiKey}`

    const [sthRes, lthRes, priceRes, fxRes] = await Promise.all([
      fetch(`${base}/indicators/realized_price_short_term_holder_less_155?${q}`),
      fetch(`${base}/indicators/realized_price_long_term_holder?${q}`),
      fetch(`${base}/market/price_usd_close?${q}`),
      fetch('https://api.frankfurter.app/latest?from=USD&to=BRL'),
    ])

    if (!fxRes.ok) throw new Error(`Frankfurter: ${fxRes.status}`)

    // Glassnode returns 403 for metrics outside the account's plan tier
    if (sthRes.status === 403 || lthRes.status === 403) {
      return NextResponse.json(
        { error: 'Métricas STH/LTH exigem plano pago no Glassnode (Advanced ~$129/mês). O plano gratuito não inclui esses dados.' },
        { status: 403 }
      )
    }

    if (!sthRes.ok)   throw new Error(`Glassnode STH: ${sthRes.status}`)
    if (!lthRes.ok)   throw new Error(`Glassnode LTH: ${lthRes.status}`)
    if (!priceRes.ok) throw new Error(`Glassnode price: ${priceRes.status}`)

    const [sthData, lthData, priceData, fx] = await Promise.all([
      sthRes.json()   as Promise<GlassnodePoint[]>,
      lthRes.json()   as Promise<GlassnodePoint[]>,
      priceRes.json() as Promise<GlassnodePoint[]>,
      fxRes.json()    as Promise<{ rates: { BRL: number } }>,
    ])

    const usdBrlRate = fx.rates?.BRL
    if (!usdBrlRate || usdBrlRate <= 0) throw new Error('Frankfurter: taxa USD/BRL inválida')

    // Index LTH and price by date for O(1) join
    const lthByDate   = new Map(lthData.map(p   => [unixToDate(p.t), p.v]))
    const priceByDate = new Map(priceData.map(p  => [unixToDate(p.t), p.v]))

    const data = sthData
      .map(p => {
        const date    = unixToDate(p.t)
        const sthUsd  = p.v
        const lthUsd  = lthByDate.get(date)
        const spotUsd = priceByDate.get(date)
        if (!lthUsd || !spotUsd) return null
        return {
          date,
          sthUsd,  lthUsd,  spotUsd,
          sthBrl:  sthUsd  * usdBrlRate,
          lthBrl:  lthUsd  * usdBrlRate,
          spotBrl: spotUsd * usdBrlRate,
        }
      })
      .filter(Boolean)

    return NextResponse.json({ data, usdBrlRate })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 503 })
  }
}
