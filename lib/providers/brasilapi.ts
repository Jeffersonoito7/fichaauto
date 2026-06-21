// BrasilAPI — GRATUITA, sem autenticação
// Docs: https://brasilapi.com.br/docs

const BASE = 'https://brasilapi.com.br/api'

// Busca preco FIPE pelo codigo (ex: "001004-9") — gratuito, atualizado mensalmente
export async function getFipePorCodigo(codigoFipe: string) {
  if (!codigoFipe) return null
  try {
    const res = await fetch(`${BASE}/fipe/preco/v1/${codigoFipe}`, {
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return null
    const data = await res.json()
    // BrasilAPI retorna array com um ou mais itens
    return Array.isArray(data) ? data[0] ?? null : data
  } catch {
    return null
  }
}

export async function getFipeTabelas() {
  const res = await fetch(`${BASE}/fipe/tabelas/v1`, { next: { revalidate: 86400 } })
  if (!res.ok) return null
  return res.json()
}

export async function getMarcas(tipo: 'carros' | 'motos' | 'caminhoes' = 'carros') {
  const res = await fetch(`${BASE}/fipe/marcas/v1/${tipo}`, { next: { revalidate: 86400 } })
  if (!res.ok) return null
  return res.json()
}

export async function getCnpj(cnpj: string) {
  const clean = cnpj.replace(/\D/g, '')
  const res = await fetch(`${BASE}/cnpj/v1/${clean}`, { cache: 'no-store' })
  if (!res.ok) return null
  return res.json()
}

export async function getCep(cep: string) {
  const clean = cep.replace(/\D/g, '')
  const res = await fetch(`${BASE}/cep/v2/${clean}`, { next: { revalidate: 86400 } })
  if (!res.ok) return null
  return res.json()
}

export async function getDdd(ddd: string) {
  const res = await fetch(`${BASE}/ddd/v1/${ddd}`, { next: { revalidate: 86400 } })
  if (!res.ok) return null
  return res.json()
}
