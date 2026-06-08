import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const BINANCE = 'https://data-api.binance.vision'

async function fetchCloses(limit: number): Promise<number[]> {
  const url = `${BINANCE}/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=${limit}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Binance klines: ${res.status}`)
  const data = await res.json() as [number, string, string, string, string, ...unknown[]][]
  return data.map(k => parseFloat(k[4]))  // index 4 = close price
}

function sma(arr: number[]): number {
  return arr.reduce((s, v) => s + v, 0) / arr.length
}

function ema(arr: number[], n: number): number[] {
  const k = 2 / (n + 1)
  const out = [arr[0]]
  for (let i = 1; i < arr.length; i++) out.push(arr[i] * k + out[i - 1] * (1 - k))
  return out
}

function computeRsi(closes: number[], period = 14): number {
  const changes = closes.slice(1).map((v, i) => v - closes[i])
  let avgGain = 0, avgLoss = 0
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) avgGain += changes[i]
    else avgLoss += Math.abs(changes[i])
  }
  avgGain /= period
  avgLoss /= period
  for (let i = period; i < changes.length; i++) {
    const g = changes[i] > 0 ? changes[i] : 0
    const l = changes[i] < 0 ? Math.abs(changes[i]) : 0
    avgGain = (avgGain * (period - 1) + g) / period
    avgLoss = (avgLoss * (period - 1) + l) / period
  }
  return avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss)
}

function computeMacd(closes: number[]): { hist: number; positive: boolean; growing: boolean } {
  const e12 = ema(closes, 12)
  const e26 = ema(closes, 26)
  const ml  = e12.map((v, i) => v - e26[i])
  const sl  = ema(ml, 9)
  const h   = ml.map((v, i) => v - sl[i])
  const L   = h.length - 1
  return { hist: h[L], positive: h[L] > 0, growing: h[L] > h[L - 1] }
}

export async function GET() {
  try {
    const closes = await fetchCloses(200)
    if (closes.length < 50) throw new Error('Binance: dados insuficientes')
    const current = closes[closes.length - 1]

    const rsi14 = computeRsi(closes)
    const macd  = computeMacd(closes)
    const ma200 = sma(closes)
    const ma50  = sma(closes.slice(-50))
    const ma200DistPct = ((current - ma200) / ma200) * 100

    return NextResponse.json({
      rsi14:        parseFloat(rsi14.toFixed(1)),
      macdHist:     parseFloat(macd.hist.toFixed(0)),
      macdPositive: macd.positive,
      macdGrowing:  macd.growing,
      ma200:        parseFloat(ma200.toFixed(0)),
      ma50:         parseFloat(ma50.toFixed(0)),
      ma200DistPct: parseFloat(ma200DistPct.toFixed(1)),
      crossType:    ma50 > ma200 ? 'golden' : 'death',
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 503 })
  }
}
