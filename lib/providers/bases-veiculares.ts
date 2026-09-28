// ─── Fonte das bases veiculares (nacional e estadual) ────────────────────────
// Mesmo padrão do roteador de leilão: escolhe o fornecedor mais barato
// disponível e cai na Assertiva se o preferencial falhar.
//
//   Base Nacional  (RENAJUD, roubo/furto)   Infocar R$ 6,07  |  Assertiva R$ 12,42
//   Base Estadual  (débitos, multas)        Infocar R$ 5,97  |  Assertiva R$ 12,42

import { consultarBaseNacional, consultarBaseEstadual, basesInfocarAtivas } from './infocar-bases'
import { consultarBinFederal, consultarBinEstadual } from './assertiva'

export type FonteBase = 'infocar' | 'assertiva' | 'nenhuma'

export const CUSTO_BASE = {
  nacional:  { infocar: 6.07, assertiva: 12.42 },
  estadual:  { infocar: 5.97, assertiva: 12.42 },
} as const

export interface ResultadoBase {
  dados: any
  fonte: FonteBase
  custo: number
  erro?: string
}

/**
 * Busca no fornecedor mais barato disponível. Nunca lança: em caso de falha
 * devolve fonte 'nenhuma' e o motivo, para a consulta seguir com os outros
 * módulos em vez de perder tudo.
 *
 * @param protocolo exigido só pela Assertiva
 */
async function buscar(
  qual: 'nacional' | 'estadual',
  placa: string,
  protocolo?: string,
): Promise<ResultadoBase> {
  const custos = CUSTO_BASE[qual]

  if (basesInfocarAtivas()) {
    try {
      const dados = qual === 'nacional'
        ? await consultarBaseNacional(placa)
        : await consultarBaseEstadual(placa)
      if (dados) return { dados, fonte: 'infocar', custo: custos.infocar }
    } catch (e: any) {
      console.error(`[base ${qual}] Infocar falhou, caindo na Assertiva:`, e?.message ?? e)
    }
  }

  try {
    const dados = qual === 'nacional'
      ? await consultarBinFederal(placa, protocolo)
      : await consultarBinEstadual(placa, protocolo)
    return { dados, fonte: 'assertiva', custo: custos.assertiva }
  } catch (e: any) {
    return { dados: null, fonte: 'nenhuma', custo: 0, erro: e?.message ?? `falha na base ${qual}` }
  }
}

export const buscarBaseNacional = (placa: string, protocolo?: string) =>
  buscar('nacional', placa, protocolo)

export const buscarBaseEstadual = (placa: string, protocolo?: string) =>
  buscar('estadual', placa, protocolo)
