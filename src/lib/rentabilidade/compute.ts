import type { DcaContributionRow } from '@/lib/db/types'

/**
 * Patrimonio data computed server-side
 * Contains all the data needed to render rentabilidade page
 */
export interface PatrimonioData {
  contributions: DcaContributionRow[]
  btcPrice: number
  priceHistory: Record<string, number>
}

/**
 * Compute patrimonio data from contributions and price history
 * This server-side function pre-computes what the client component needs
 */
export function computePatrimonio(
  contributions: DcaContributionRow[],
  priceHistory: Record<string, number>,
  currentPrice: number,
): PatrimonioData {
  return {
    contributions,
    btcPrice: currentPrice,
    priceHistory,
  }
}
