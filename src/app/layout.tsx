import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import './globals.css'
import { ThemeProvider, THEME_INIT_SCRIPT } from '@/contexts/ThemeContext'

export const metadata: Metadata = {
  title:       'BTC Monitor · Leitura de mercado Bitcoin',
  description: 'Indicadores consolidados de mercado Bitcoin para decisões racionais de acumulação.',
}

export const viewport: Viewport = {
  width:        'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
