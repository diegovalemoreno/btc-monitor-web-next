import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const TICKER_THRESHOLD_MS = 5 * 60 * 1000 // 5 minutos

async function fetchCurrentPrice(): Promise<{ price: number; source: string }> {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=brl',
      { headers: { Accept: 'application/json' } }
    )
    if (res.ok) {
      const data = await res.json() as { bitcoin?: { brl?: number } }
      const price = data.bitcoin?.brl
      if (price && price > 0) return { price, source: 'coingecko-ticker' }
    }
  } catch { /* fallthrough */ }

  const res = await fetch('https://www.mercadobitcoin.net/api/BTC/ticker/')
  if (!res.ok) throw new Error(`mercadobitcoin: erro ${res.status}`)
  const data = await res.json() as { ticker?: { last?: string } }
  const price = parseFloat(data.ticker?.last ?? '0')
  if (!price || price <= 0) throw new Error('mercadobitcoin: preço inválido')
  return { price, source: 'mercadobitcoin-ticker' }
}

async function fetchHistoricalPrice(targetMs: number): Promise<{ price: number; source: string }> {
  const d = new Date(targetMs)
  const day   = String(d.getUTCDate()).padStart(2, '0')
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const year  = d.getUTCFullYear()

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/bitcoin/history?date=${day}-${month}-${year}&localization=false`,
      { headers: { Accept: 'application/json' } }
    )
    if (res.ok) {
      const data = await res.json() as { market_data?: { current_price?: { brl?: number } } }
      const price = data.market_data?.current_price?.brl
      if (price && price > 0) return { price, source: 'coingecko-history' }
    }
  } catch { /* fallthrough */ }

  const since = Math.floor(targetMs / 1000) - 1800
  const until = Math.floor(targetMs / 1000) + 1800
  const res = await fetch(`https://www.mercadobitcoin.net/api/BTC/trades/${since}/${until}`)
  if (!res.ok) throw new Error(`mercadobitcoin histórico: erro ${res.status}`)
  const trades = await res.json() as { date: number; price: string }[]
  if (!trades.length) throw new Error('sem-dados')
  const closest = trades.reduce((prev, curr) =>
    Math.abs(curr.date * 1000 - targetMs) < Math.abs(prev.date * 1000 - targetMs) ? curr : prev
  )
  const price = parseFloat(closest.price)
  if (!price || price <= 0) throw new Error('mercadobitcoin: preço inválido')
  return { price, source: 'mercadobitcoin-trades' }
}

export async function GET(req: NextRequest) {
  const ts = req.nextUrl.searchParams.get('ts')
  if (!ts) return NextResponse.json({ error: 'ts obrigatório' }, { status: 400 })

  const date = new Date(ts)
  if (isNaN(date.getTime())) return NextResponse.json({ error: 'ts inválido' }, { status: 400 })

  const now = Date.now()
  const targetMs = date.getTime()
  if (targetMs > now + 3_600_000) return NextResponse.json({ error: 'ts futuro' }, { status: 400 })

  try {
    const result = targetMs > now - TICKER_THRESHOLD_MS
      ? await fetchCurrentPrice()
      : await fetchHistoricalPrice(targetMs)
    return NextResponse.json({ btcPriceBrl: result.price, source: result.source })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 503 })
  }
}
