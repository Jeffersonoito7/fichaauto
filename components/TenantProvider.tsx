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

  // Empresa sem logo cadastrada: desenha o nome dela com a cor da marca.
  // Antes caia na logo do Ficha Auto, e o cliente via a marca do fornecedor
  // no proprio endereco. Nome improvisado e melhor que marca errada.
  if (tenant.slug !== 'ficha-auto') {
    const nome = tenant.nome_fantasia ?? tenant.nome
    const iniciais = nome.split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase()
    return (
      <span className={`inline-flex items-center gap-2.5 ${className}`} style={{ height }}>
        <span
          className="grid place-items-center rounded-lg font-extrabold text-white shrink-0"
          style={{ width: height, height, backgroundColor: tenant.cor_primaria, fontSize: height * 0.4 }}
        >
          {iniciais}
        </span>
        <span
          className="font-extrabold tracking-tight leading-none"
          style={{ color: tenant.cor_primaria, fontSize: height * 0.46 }}
        >
          {nome}
        </span>
      </span>
    )
  }

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
