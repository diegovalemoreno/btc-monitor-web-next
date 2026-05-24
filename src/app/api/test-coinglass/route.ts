import { NextResponse } from 'next/server'

const BASE = 'https://open-api-v4.coinglass.com'
const ENDPOINTS = [
  '/api/futures/liquidation/map?symbol=BTC&timeType=1',
  '/api/futures/liquidation/coin-list?symbol=BTC',
  '/api/futures/liquidation/exchange-list?symbol=BTC&interval=1d',
  '/api/futures/liquidation/order?symbol=BTC',
]

export async function GET() {
  const key = process.env.COINGLASS_API_KEY
  if (!key) return NextResponse.json({ error: 'no key' })

  const results: Record<string, unknown> = {}
  for (const ep of ENDPOINTS) {
    const res = await fetch(`${BASE}${ep}`, { headers: { 'CG-API-KEY': key } })
    const body = await res.json()
    results[ep] = { code: body.code, msg: body.msg, hasData: !!body.data }
  }
  return NextResponse.json(results)
}
