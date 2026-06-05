import { consultarCompleto } from './assertiva'
import { getFipePorPlaca }   from './brasilapi'
import { buscarProcessosProprietario } from './datajud'

export async function consultarVeiculo(placa: string, chassi?: string) {
  const resultado = await consultarCompleto(placa, chassi)

  // Extrair nome do proprietário para busca no DataJud
  const placaResp = resultado.placa ?? {}
  const pDesc     = placaResp.resposta?.descricao     ?? placaResp
  const pIdent    = placaResp.resposta?.identificadores ?? placaResp
  const nomeProprietario: string | null =
    pDesc?.proprietario     ?? pDesc?.nomeProprietario ??
    pDesc?.nomeProp         ?? pIdent?.proprietario    ??
    pIdent?.nomeProprietario ?? placaResp?.proprietario ?? null

  // Enriquecer em paralelo: FIPE gratuita + DataJud
  const [fipe, datajud] = await Promise.all([
    getFipePorPlaca(placa).catch(() => null),
    nomeProprietario
      ? buscarProcessosProprietario(nomeProprietario).catch(() => null)
      : Promise.resolve(null),
  ])

  return { provider: 'assertiva', ...resultado, fipe, datajud }
}
