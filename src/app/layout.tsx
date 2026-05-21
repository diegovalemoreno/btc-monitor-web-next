import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'BTC Monitor · Leitura de mercado Bitcoin',
  description:
    'Indicadores consolidados de mercado Bitcoin para decisões racionais de acumulação.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
