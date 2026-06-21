import type { Metadata } from 'next'
import { headers } from 'next/headers'
import './globals.css'
import RegisterSW from '@/components/RegisterSW'
import InstallPWA from '@/components/InstallPWA'
import { TenantProvider } from '@/components/TenantProvider'
import { TENANT_FICHA_AUTO, type Tenant } from '@/lib/tenant'

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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Le headers injetados pelo middleware para montar o tenant
  const hdrs = await headers()
  const tenantId = hdrs.get('x-tenant-id')

  let tenant: Tenant = TENANT_FICHA_AUTO

  if (tenantId) {
    tenant = {
      ...TENANT_FICHA_AUTO,
      id:             tenantId,
      slug:           hdrs.get('x-tenant-slug')          ?? TENANT_FICHA_AUTO.slug,
      nome:           hdrs.get('x-tenant-nome')          ?? TENANT_FICHA_AUTO.nome,
      nome_fantasia:  hdrs.get('x-tenant-nome')          ?? null,
      logo_url:       hdrs.get('x-tenant-logo') || null,
      cor_primaria:   hdrs.get('x-tenant-cor-primaria')  ?? TENANT_FICHA_AUTO.cor_primaria,
      cor_secundaria: hdrs.get('x-tenant-cor-secundaria') ?? TENANT_FICHA_AUTO.cor_secundaria,
      cor_texto:      hdrs.get('x-tenant-cor-texto')     ?? TENANT_FICHA_AUTO.cor_texto,
    }
  }

  const nomeSite = tenant.nome_fantasia ?? tenant.nome

  return (
    <html lang="pt-BR">
      <head>
        {/* PWA */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content={tenant.cor_primaria} />
        <meta name="application-name" content={nomeSite} />
        <meta name="mobile-web-app-capable" content="yes" />
        {/* iOS */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content={nomeSite} />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        {/* Icone */}
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/icon-192.png" type="image/png" sizes="192x192" />
      </head>
      <body>
        <TenantProvider tenant={tenant}>
          <RegisterSW />
          <InstallPWA />
          {children}
        </TenantProvider>
      </body>
    </html>
  )
}
