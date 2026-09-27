/**
 * Tenant — identidade visual e configuracao por cliente white-label.
 *
 * O tenant e detectado pelo dominio da requisicao no middleware e
 * repassado via header x-tenant-id para toda a arvore de componentes.
 */

import { createClient } from '@supabase/supabase-js'

export interface Tenant {
  id:             string
  slug:           string
  nome:           string
  nome_fantasia:  string | null
  dominio:        string | null
  logo_url:       string | null
  cor_primaria:   string
  cor_secundaria: string
  cor_texto:      string
  telefone:       string | null
  email_contato:  string | null
  ativo:          boolean
  saldo_veiculo:  number
  saldo_cpf:      number
  preco_veiculo:  number | null
  preco_cpf:      number | null
}

export const TENANT_FICHA_AUTO: Tenant = {
  id:             'ficha-auto',
  slug:           'ficha-auto',
  nome:           'Ficha Auto',
  nome_fantasia:  'Ficha Auto',
  dominio:        'fichaauto.com.br',
  logo_url:       null, // usa o componente LogoFichaAuto
  cor_primaria:   '#00A651',
  cor_secundaria: '#0055A4',
  cor_texto:      '#FFFFFF',
  telefone:       null,
  email_contato:  null,
  ativo:          true,
  saldo_veiculo:  0,
  saldo_cpf:      0,
  preco_veiculo:  null,
  preco_cpf:      null,
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

/** Busca tenant pelo dominio exato. Retorna null se nao encontrar. */
export async function getTenantByDominio(dominio: string): Promise<Tenant | null> {
  try {
    const { data } = await getServiceClient()
      .from('tenants')
      .select('*')
      .eq('dominio', dominio)
      .eq('ativo', true)
      .maybeSingle()
    if (data) return data

    // Subdomínio nosso: autovale.fichaauto.com.br resolve pelo slug, mesmo que
    // ninguém tenha preenchido a coluna dominio na hora de cadastrar a empresa.
    const slug = slugDoSubdominio(dominio)
    if (!slug) return null

    const { data: porSlug } = await getServiceClient()
      .from('tenants')
      .select('*')
      .eq('slug', slug)
      .eq('ativo', true)
      .maybeSingle()
    return porSlug ?? null
  } catch {
    return null
  }
}

/** Busca tenant pelo slug. */
export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  try {
    const { data } = await getServiceClient()
      .from('tenants')
      .select('*')
      .eq('slug', slug)
      .eq('ativo', true)
      .maybeSingle()
    return data ?? null
  } catch {
    return null
  }
}

/** Busca tenant pelo id. */
export async function getTenantById(id: string): Promise<Tenant | null> {
  try {
    const { data } = await getServiceClient()
      .from('tenants')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    return data ?? null
  } catch {
    return null
  }
}

/** Lista todos os tenants (super admin). */
export async function listarTenants(): Promise<Tenant[]> {
  try {
    const { data } = await getServiceClient()
      .from('tenants')
      .select('*')
      .order('criado_em', { ascending: false })
    return data ?? []
  } catch {
    return []
  }
}

/** Dominios que sao do proprio Ficha Auto (nao sao tenants). */
const DOMINIOS_PROPRIOS = [
  'fichaauto.com.br',
  'www.fichaauto.com.br',
  'localhost',
  '127.0.0.1',
]

export function isDominioProprio(host: string): boolean {
  const base = host.split(':')[0].toLowerCase()
  // Só a lista acima é do próprio Ficha Auto. O `endsWith('.fichaauto.com.br')`
  // que existia aqui engolia TODO subdomínio, então autovale.fichaauto.com.br
  // nunca era reconhecido como empresa e caía na marca padrão.
  return DOMINIOS_PROPRIOS.includes(base)
}

/**
 * Extrai o slug da empresa de um subdomínio nosso.
 * autovale.fichaauto.com.br -> 'autovale'   |   fichaauto.com.br -> null
 */
export function slugDoSubdominio(host: string): string | null {
  const base = host.split(':')[0].toLowerCase()
  if (isDominioProprio(base)) return null
  if (!base.endsWith('.fichaauto.com.br')) return null
  const slug = base.slice(0, -'.fichaauto.com.br'.length)
  return slug && slug !== 'www' ? slug : null
}
