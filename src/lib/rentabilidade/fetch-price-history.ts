/**
 * Fetch BTC price history in BRL from CoinGecko
 * Returns current price and historical daily prices
 */

interface PriceHistoryResponse {
  history: Record<string, number> // YYYY-MM-DD -> price in BRL
  currentPrice: number
}

export async function fetchBtcPriceHistoryBrl(): Promise<PriceHistoryResponse> {
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=brl&days=max&interval=daily',
      { next: { revalidate: 3600 } } // Cache for 1 hour
    )

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`)
    }

    const data = await response.json()

    // Convert to Record<YYYY-MM-DD, price>
    const history: Record<string, number> = {}
    data.prices.forEach(([timestamp, price]: [number, number]) => {
      const date = new Date(timestamp)
      const dateStr = date.toISOString().slice(0, 10) // YYYY-MM-DD
      history[dateStr] = price
    })

    // Current price is the last entry
    const currentPrice = data.prices[data.prices.length - 1][1]

    return { history, currentPrice }
  } catch (error) {
    console.error('Failed to fetch BTC price history:', error)
    throw error
  }
}
