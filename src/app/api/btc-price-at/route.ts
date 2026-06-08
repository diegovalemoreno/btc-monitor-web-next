import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const TICKER_THRESHOLD_MS = 5 * 60 * 1000 // 5 minutos

export async function GET(req: NextRequest) {
  const ts = req.nextUrl.searchParams.get('ts')
  if (!ts) return NextResponse.json({ error: 'ts obrigatório' }, { status: 400 })

  const date = new Date(ts)
  if (isNaN(date.getTime())) return NextResponse.json({ error: 'ts inválido' }, { status: 400 })

  const now = Date.now()
  const targetMs = date.getTime()
  if (targetMs > now) return NextResponse.json({ error: 'ts futuro' }, { status: 400 })

  try {
    if (now - targetMs < TICKER_THRESHOLD_MS) {
      const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCBRL')
      if (!res.ok) throw new Error(`binance ticker ${res.status}`)
      const data = await res.json() as { price: string }
      return NextResponse.json({ btcPriceBrl: parseFloat(data.price), source: 'binance-ticker' })
    }

    const alignedMs = Math.floor(targetMs / 3_600_000) * 3_600_000
    const url = `https://api.binance.com/api/v3/klines?symbol=BTCBRL&interval=1h&startTime=${alignedMs}&limit=1`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`binance klines ${res.status}`)
    const data = await res.json() as unknown[][]
    if (!data.length) return NextResponse.json({ error: 'sem-dados' }, { status: 404 })
    const close = parseFloat(data[0][4] as string)
    if (!close || close <= 0) return NextResponse.json({ error: 'binance: invalid price' }, { status: 503 })
    return NextResponse.json({ btcPriceBrl: close, source: 'binance-klines' })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 503 })
  }
}
