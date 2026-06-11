import type { Metadata } from 'next'
import './globals.css'
import RegisterSW from '@/components/RegisterSW'
import InstallPWA from '@/components/InstallPWA'

export const metadata: Metadata = {
  title: 'Ficha Auto — Consulta Veicular Completa',
  description: 'Plataforma profissional de consulta veicular. Placa, RENAJUD, Gravame, Leilão, Sinistro, FIPE e muito mais.',
  keywords: 'consulta veicular, placa, RENAJUD, gravame, leilão, sinistro, FIPE, DETRAN',
  openGraph: {
    title: 'Ficha Auto — Consulta Veicular Completa',
    description: 'Plataforma profissional de consulta veicular para despachantes, lojistas e compradores.',
    type: 'website',
    url: 'https://fichaauto.com.br',
  },
  metadataBase: new URL('https://fichaauto.com.br'),
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        {/* PWA */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#00703C" />
        <meta name="application-name" content="Ficha Auto" />
        <meta name="mobile-web-app-capable" content="yes" />
        {/* iOS */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Ficha Auto" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        {/* Ícone */}
        <link rel="icon" href="/icon-192.png" type="image/png" />
      </head>
      <body>
        <RegisterSW />
        <InstallPWA />
        {children}
      </body>
    </html>
  )
}
