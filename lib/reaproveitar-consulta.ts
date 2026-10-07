// ─── Reaproveitamento de consulta dentro da mesma empresa ────────────────────
// Se a empresa já consultou aquela placa ou documento, o resultado guardado é
// oferecido de volta em vez de pagar a API outra vez. Numa associação com
// vários operadores, a mesma placa era paga de novo a cada pessoa diferente.
//
// A consulta antiga NUNCA é servida escondido. O chamador recebe a idade do
// dado e decide: mostrar o que existe ou pagar por uma atualização. Dado
// veicular envelhece (gravame quitado, restrição nova, furto recente), e
// entregar dado velho como se fosse atual é pior que gastar a consulta.

import { createServiceRoleClient } from './supabase-server'

/**
 * A partir de quantos dias uma consulta passa a ser considerada velha.
 * Não bloqueia o reaproveitamento: serve para a tela avisar com destaque
 * que vale atualizar antes de decidir algo com aquele dado.
 */
export const DIAS_PARA_ENVELHECER = 30

export interface ConsultaAnterior {
  id: string
  resultado: any
  consultadaEm: string
  diasAtras: number
  envelhecida: boolean
  custoOriginal: number | null
  consultadaPor: string | null
}

/**
 * Procura uma consulta anterior da MESMA empresa para o mesmo documento.
 * Devolve null quando não há empresa (consulta avulsa) ou nada foi encontrado.
 */
export async function buscarConsultaAnterior(
  tenantId: string | null,
  documento: string,
  tipo: string,
): Promise<ConsultaAnterior | null> {
  if (!tenantId) return null

  const doc = documento.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
  if (!doc) return null

  try {
    const svc = createServiceRoleClient() as any
    const { data } = await svc
      .from('consultas')
      .select('id, resultado, created_at, custo, email')
      .eq('tenant_id', tenantId)
      .eq('documento', doc)
      .eq('tipo', tipo)
      .not('resultado', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    return montarConsultaAnterior(data)
  } catch {
    // Falha na busca nunca pode impedir a consulta nova.
    return null
  }
}

/**
 * Procura a consulta salva do PRÓPRIO usuário, sem passar por empresa.
 *
 * Existe para o modo leitura de quem não tem empresa (venda avulsa, admin):
 * abrir um relatório que já é dele não pode virar consulta paga.
 */
export async function buscarConsultaSalvaDoUsuario(
  svc: any,
  email: string,
  documento: string,
  tipo: string,
): Promise<ConsultaAnterior | null> {
  const doc = documento.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
  if (!email || !doc) return null

  try {
    const { data } = await svc
      .from('consultas')
      .select('id, resultado, created_at, custo, email')
      .eq('email', email)
      .eq('documento', doc)
      .eq('tipo', tipo)
      .not('resultado', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    return montarConsultaAnterior(data)
  } catch {
    return null
  }
}

/** Normaliza a linha do banco. Devolve null quando não dá para confiar nela. */
function montarConsultaAnterior(data: any): ConsultaAnterior | null {
  if (!data?.resultado) return null

  // Consultas antigas foram gravadas com JSON.stringify numa coluna jsonb,
  // então vêm como string escapada em vez de objeto. Aceita os dois.
  let resultado = data.resultado
  if (typeof resultado === 'string') {
    try { resultado = JSON.parse(resultado) } catch { return null }
  }
  if (!resultado || typeof resultado !== 'object') return null

  const consultadaEm = new Date(data.created_at)
  const dias = Math.floor((Date.now() - consultadaEm.getTime()) / 86_400_000)

  return {
    id:            data.id,
    resultado,
    consultadaEm:  data.created_at,
    diasAtras:     dias,
    envelhecida:   dias >= DIAS_PARA_ENVELHECER,
    custoOriginal: data.custo != null ? Number(data.custo) : null,
    consultadaPor: data.email ?? null,
  }
}

/** Texto pronto para a tela, em português, já com a idade certa. */
export function textoIdade(c: ConsultaAnterior): string {
  if (c.diasAtras === 0) return 'consultada hoje'
  if (c.diasAtras === 1) return 'consultada ontem'
  if (c.diasAtras < 30)  return `consultada há ${c.diasAtras} dias`
  if (c.diasAtras < 60)  return 'consultada há cerca de um mês'
  const meses = Math.floor(c.diasAtras / 30)
  return `consultada há cerca de ${meses} meses`
}
