import { consultarCompleto } from './assertiva'
import { getFipePorCodigo }  from './brasilapi'
import { buscarProcessosProprietario } from './datajud'
import { buscarLeilao, type FonteLeilao } from './leilao'
import { buscarBaseNacional, buscarBaseEstadual, type FonteBase } from './bases-veiculares'
import { resolverModulos, custoDaConsulta, CUSTO_REFERENCIA } from '@/lib/modulos-veiculo'
import { getCachePlaca } from '@/lib/cache-placas'
import { lerEscolhasDoTenant } from '@/lib/escolha-fornecedor'

export async function consultarVeiculo(
  placa: string,
  chassi?: string,
  modulosContratados?: string[] | null,
  tenantId?: string | null,
  /**
   * Consulta-base já paga na etapa de confirmação do veículo. Quando vem, a
   * base não é consultada nem cobrada de novo, então confirmar a placa não
   * encarece a consulta. Ver lib/consulta-base-pendente.ts.
   */
  basePreConsultada?: any,
) {
  // Só consulta o que o cliente contratou. Sem configuração, roda o pacote
  // completo, para ninguém perder dado por cadastro em branco.
  const modulos = resolverModulos(modulosContratados)

  // De qual API vem cada módulo, conforme o dono marcou em
  // /dashboard/admin/fornecedores. Mapa vazio significa "decide automático",
  // que é exatamente como o sistema funcionava antes desta tela existir.
  const escolhas = await lerEscolhasDoTenant(tenantId ?? null)

  // Leilão é o módulo mais caro da consulta, então vai pelo roteador de
  // fornecedor (Infocar quando houver chave, senão Assertiva).
  let fonteLeilao: FonteLeilao = 'assertiva'
  let custoLeilao = 0
  // Bases nacional e estadual também trocam de fornecedor por preço.
  let fonteNacional: FonteBase = 'assertiva'
  let fonteEstadual: FonteBase = 'assertiva'
  let custoNacional = 0
  let custoEstadual = 0

  const resultado = await consultarCompleto(placa, chassi, {
    modulos,
    basePreConsultada,
    buscarLeilao: async (p, protocolo) => {
      const r = await buscarLeilao(p, protocolo, escolhas['placa_leilao'])
      fonteLeilao = r.fonte
      custoLeilao = r.custo
      if (r.erro) throw new Error(r.erro)
      return r.dados
    },
    buscarBaseNacional: async (p, protocolo) => {
      const r = await buscarBaseNacional(p, protocolo, escolhas['placa_bin_federal'])
      fonteNacional = r.fonte
      custoNacional = r.custo
      if (r.erro) throw new Error(r.erro)
      return r.dados
    },
    buscarBaseEstadual: async (p, protocolo) => {
      const r = await buscarBaseEstadual(p, protocolo, escolhas['placa_bin_estadual'])
      fonteEstadual = r.fonte
      custoEstadual = r.custo
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
  // Só os módulos de preço fixo entram pela tabela; leilão e bases usam o
  // custo do fornecedor que de fato respondeu.
  // A conta mora em lib/modulos-veiculo (custoDaConsulta), com teste: ela decide
  // quanto o cliente paga quando a empresa não tem preço de tabela, e a regra da
  // base já paga é fácil de quebrar sem ninguém notar.
  const custoTotal = custoDaConsulta({
    modulos,
    custoLeilao,
    custoNacional,
    custoEstadual,
    baseReaproveitada: !!basePreConsultada,
  })

  return {
    provider: 'assertiva',
    ...resultado,
    fipe,
    datajud,
    _modulos: modulos,
    _fonteLeilao: fonteLeilao,
    _custoLeilao: custoLeilao,
    _fonteNacional: fonteNacional,
    _fonteEstadual: fonteEstadual,
    _custoTotal: custoTotal,
    _baseReaproveitada: !!basePreConsultada,
    _economia: parseFloat((CUSTO_REFERENCIA - custoTotal).toFixed(2)),
  }
}
