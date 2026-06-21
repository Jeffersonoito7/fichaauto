import { consultarCompleto } from './assertiva'
import { getFipePorCodigo }  from './brasilapi'
import { buscarProcessosProprietario } from './datajud'

export async function consultarVeiculo(placa: string, chassi?: string) {
  const resultado = await consultarCompleto(placa, chassi)

  const placaResp  = resultado.placa ?? {}
  const pDesc      = placaResp.resposta?.descricao      ?? placaResp
  const pIdent     = placaResp.resposta?.identificadores ?? placaResp
  const sinistroR  = resultado.sinistro?.resposta        ?? resultado.sinistro ?? {}
  const tabelaFipe = sinistroR?.tabelaFipe ?? sinistroR?.fipe ?? {}

  // Codigo FIPE: vem do sinistro/precificador da Assertiva
  const codigoFipe: string =
    tabelaFipe?.codigo      ?? tabelaFipe?.codigoFipe ??
    sinistroR?.codigoFipe   ?? sinistroR?.codigo      ??
    pDesc?.codigoFipe       ?? pDesc?.codFipe         ?? ''

  // Nome do proprietario para DataJud
  const nomeProprietario: string | null =
    pDesc?.proprietario      ?? pDesc?.nomeProprietario ??
    pDesc?.nomeProp          ?? pIdent?.proprietario    ??
    pIdent?.nomeProprietario ?? placaResp?.proprietario ?? null

  // BrasilAPI FIPE (gratuita) + DataJud em paralelo
  const [fipe, datajud] = await Promise.all([
    codigoFipe
      ? getFipePorCodigo(codigoFipe).catch(() => null)
      : Promise.resolve(null),
    nomeProprietario
      ? buscarProcessosProprietario(nomeProprietario).catch(() => null)
      : Promise.resolve(null),
  ])

  return { provider: 'assertiva', ...resultado, fipe, datajud }
}
