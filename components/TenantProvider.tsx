'use client'
import { createContext, useContext, type ReactNode } from 'react'
import { type Tenant, TENANT_FICHA_AUTO } from '@/lib/tenant'

const TenantContext = createContext<Tenant>(TENANT_FICHA_AUTO)

export function TenantProvider({ tenant, children }: { tenant: Tenant; children: ReactNode }) {
  return (
    <TenantContext.Provider value={tenant}>
      <style>{`
        :root {
          --cor-primaria:   ${tenant.cor_primaria};
          --cor-secundaria: ${tenant.cor_secundaria};
          --cor-texto:      ${tenant.cor_texto};
        }
      `}</style>
      {children}
    </TenantContext.Provider>
  )
}

export function useTenant(): Tenant {
  return useContext(TenantContext)
}

/** Logo do tenant: imagem se tiver logo_url, senao o componente padrao Ficha Auto. */
export function TenantLogo({ height = 36, className = '' }: { height?: number; className?: string }) {
  const tenant = useTenant()

  if (tenant.logo_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={tenant.logo_url}
        alt={tenant.nome_fantasia ?? tenant.nome}
        style={{ height }}
        className={`object-contain ${className}`}
      />
    )
  }

  // Fallback: componente padrao do Ficha Auto
  const { LogoHorizontal } = require('@/components/LogoFichaAuto')
  return <LogoHorizontal height={height} theme="light" />
}

export function TenantLogoDark({ height = 36, className = '' }: { height?: number; className?: string }) {
  const tenant = useTenant()

  if (tenant.logo_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={tenant.logo_url}
        alt={tenant.nome_fantasia ?? tenant.nome}
        style={{ height }}
        className={`object-contain ${className}`}
      />
    )
  }

  const { LogoHorizontal } = require('@/components/LogoFichaAuto')
  return <LogoHorizontal height={height} theme="dark" />
}
