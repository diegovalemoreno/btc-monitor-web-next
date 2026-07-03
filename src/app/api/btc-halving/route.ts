import { NextResponse } from 'next/server'
import { computeHalvingEstimate } from '@/lib/btc/halving'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const res = await fetch('https://mempool.space/api/blocks/tip/height', { next: { revalidate: 300 } })
    if (!res.ok) throw new Error('mempool.space indisponível')

    const text = (await res.text()).trim()
    if (!/^\d+$/.test(text)) throw new Error('Altura de bloco inválida')

    const currentHeight = Number(text)
    if (!Number.isInteger(currentHeight) || currentHeight <= 0) throw new Error('Altura de bloco inválida')

    const estimate = computeHalvingEstimate(currentHeight)

    return NextResponse.json({ currentHeight, ...estimate })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 503 })
  }
}
