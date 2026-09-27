import { consultarCompleto } from './assertiva'
import { getFipePorCodigo }  from './brasilapi'
import { buscarProcessosProprietario } from './datajud'
import { buscarLeilao, type FonteLeilao } from './leilao'
import { resolverModulos, custoDe, economiaDe } from '@/lib/modulos-veiculo'
import { getCachePlaca } from '@/lib/cache-placas'

export async function consultarVeiculo(
  placa: string,
  chassi?: string,
  modulosContratados?: string[] | null,
) {
  // Só consulta o que o cliente contratou. Sem configuração, roda o pacote
  // completo, para ninguém perder dado por cadastro em branco.
  const modulos = resolverModulos(modulosContratados)

  // Leilão é o módulo mais caro da consulta, então vai pelo roteador de
  // fornecedor (Infocar quando houver chave, senão Assertiva).
  let fonteLeilao: FonteLeilao = 'assertiva'
  let custoLeilao = 0

  const resultado = await consultarCompleto(placa, chassi, {
    modulos,
    buscarLeilao: async (p, protocolo) => {
      const r = await buscarLeilao(p, protocolo)
      fonteLeilao = r.fonte
      custoLeilao = r.custo
      if (r.erro) throw new Error(r.erro)
      return r.dados
    },
  })

  const placaResp  = resultado.placa ?? {}
  const pDesc      = placaResp.resposta?.descricao      ?? placaResp
  const pIdent     = placaResp.resposta?.identificadores ?? placaResp
  const sinistroR  = resultado.sinistro?.resposta        ?? resultado.sinistro ?? {}
  const tabelaFipe = sinistroR?.tabelaFipe ?? sinistroR?.fipe ?? {}

  // Codigo FIPE: vem do sinistro/precificador da Assertiva
  let codigoFipe: string =
    tabelaFipe?.codigo      ?? tabelaFipe?.codigoFipe ??
    sinistroR?.codigoFipe   ?? sinistroR?.codigo      ??
    pDesc?.codigoFipe       ?? pDesc?.codFipe         ?? ''

  // Fallback: busca codigo FIPE no cache de placas (salvo pela consulta gratuita)
  if (!codigoFipe) {
    const cache = await getCachePlaca(placa).catch(() => null)
    codigoFipe = cache?.codigo_fipe ?? ''
  }

  // Nome do proprietario para DataJud
  const nomeProprietario: string | null =
    pDesc?.proprietario      ?? pDesc?.nomeProprietario ??
    pDesc?.nomeProp          ?? pIdent?.proprietario    ??
    pIdent?.nomeProprietario ?? placaResp?.proprietario ?? null

  // BrasilAPI FIPE (gratuita) + DataJud em paralelo, ambos respeitando o módulo
  const [fipe, datajud] = await Promise.all([
    codigoFipe && modulos.includes('placa_fipe')
      ? getFipePorCodigo(codigoFipe).catch(() => null)
      : Promise.resolve(null),
    nomeProprietario && modulos.includes('placa_processos_cnj')
      ? buscarProcessosProprietario(nomeProprietario).catch(() => null)
      : Promise.resolve(null),
  ])

  // Custo real: o leilão usa o valor do fornecedor que de fato respondeu.
  const custoBase = custoDe(modulos.filter(m => m !== 'placa_leilao'))
  const custoTotal = parseFloat((custoBase + custoLeilao).toFixed(2))

  return {
    provider: 'assertiva',
    ...resultado,
    fipe,
    datajud,
    _modulos: modulos,
    _fonteLeilao: fonteLeilao,
    _custoLeilao: custoLeilao,
    _custoTotal: custoTotal,
    _economia: economiaDe(modulos, custoLeilao),
  }
}
