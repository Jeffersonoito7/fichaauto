// ─── Escolha de fornecedor feita pelo dono no painel ─────────────────────────
// Lê o que foi marcado em /dashboard/admin/fornecedores. Guardado na tabela
// config_financeiro, que já é chave e valor e tem RLS fechada, em vez de criar
// tabela nova só para isto.
//
// Nunca lança: se o banco falhar, devolve mapa vazio e o motor cai no
// comportamento automático de antes. Preferir perder a preferência a perder a
// consulta do cliente.

import { createServiceRoleClient } from '@/lib/supabase-server'
import { PREFIXO_CONFIG } from '@/lib/fornecedores'

export type EscolhasFornecedor = Record<string, string>

export async function lerEscolhasFornecedor(): Promise<EscolhasFornecedor> {
  try {
    const svc = createServiceRoleClient() as any
    const { data, error } = await svc
      .from('config_financeiro')
      .select('chave, valor')
      .like('chave', `${PREFIXO_CONFIG}%`)

    if (error) {
      console.error('[escolha-fornecedor]', error.message)
      return {}
    }

    const mapa: EscolhasFornecedor = {}
    for (const linha of data ?? []) {
      mapa[String(linha.chave).slice(PREFIXO_CONFIG.length)] = String(linha.valor)
    }
    return mapa
  } catch (e: any) {
    console.error('[escolha-fornecedor]', e?.message ?? e)
    return {}
  }
}
