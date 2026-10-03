// ─── Fonte de histórico de leilão ────────────────────────────────────────────
// Leilão é o módulo mais caro da consulta veicular, por isso tem fornecedor
// próprio e trocável:
//
//   Infocar    R$  5,56 por consulta   (preferencial)
//   Assertiva  R$ 13,79 por consulta   (reserva)
//
// A escolha é automática: havendo INFOCAR_API_KEY no ambiente, usa a Infocar.
// Sem a chave, cai na Assertiva exatamente como antes. Se a Infocar falhar no
// meio de uma consulta, também cai na Assertiva, para o cliente nunca ficar
// sem o dado por causa de indisponibilidade de fornecedor.

import { consultarLeilao as leilaoInfocar, infocarAtiva } from './infocar'
import { consultarLeilao as leilaoAssertiva } from './assertiva'

export type FonteLeilao = 'infocar' | 'assertiva' | 'nenhuma'

/** Custo por consulta, usado no cálculo de margem e no painel financeiro. */
export const CUSTO_LEILAO: Record<Exclude<FonteLeilao, 'nenhuma'>, number> = {
  infocar:   5.56,
  assertiva: 13.79,
}

export interface ResultadoLeilao {
  dados: any
  fonte: FonteLeilao
  custo: number
  erro?: string
}

/**
 * Busca o histórico de leilão no fornecedor mais barato disponível.
 * Nunca lança: em caso de falha devolve fonte 'nenhuma' e o motivo, para a
 * consulta seguir com os outros módulos.
 *
 * @param protocolo protocolo da consulta-base, exigido só pela Assertiva
 */
export async function buscarLeilao(
  placa: string,
  protocolo?: string,
  preferido?: string,
): Promise<ResultadoLeilao> {
  // O dono escolheu Assertiva no painel: respeita e nem tenta a Infocar.
  if (preferido === 'assertiva') {
    try {
      const dados = await leilaoAssertiva(placa, protocolo)
      return { dados, fonte: 'assertiva', custo: CUSTO_LEILAO.assertiva }
    } catch (e: any) {
      return { dados: null, fonte: 'nenhuma', custo: 0, erro: e?.message ?? 'falha ao consultar leilão' }
    }
  }

  if (infocarAtiva()) {
    try {
      const dados = await leilaoInfocar(placa, 'placa')
      if (dados) return { dados, fonte: 'infocar', custo: CUSTO_LEILAO.infocar }
    } catch (e: any) {
      console.error('[leilao] Infocar falhou, caindo na Assertiva:', e?.message ?? e)
    }
  }

  try {
    const dados = await leilaoAssertiva(placa, protocolo)
    return { dados, fonte: 'assertiva', custo: CUSTO_LEILAO.assertiva }
  } catch (e: any) {
    return { dados: null, fonte: 'nenhuma', custo: 0, erro: e?.message ?? 'falha ao consultar leilão' }
  }
}
