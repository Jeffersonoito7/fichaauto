// ─── Mapa único de módulos da consulta veicular ──────────────────────────────
// Liga o catálogo de negócio (lib/products.ts) ao custo real e à execução.
//
// Antes deste arquivo existiam DOIS vocabulários de módulo incompatíveis: o
// catálogo usava 'placa_gravame' e o motor de consulta usava 'gravame'. Como o
// admin gravava o primeiro e o motor esperava o segundo, nenhum módulo era
// reconhecido e a restrição nunca funcionou. Aqui existe um só vocabulário: o
// do catálogo.
//
// Custos medidos em 14/09/2026 com extrato real da Assertiva (placa HUF 495),
// à razão de R$ 0,001364 por unidade.

import type { ModuloId } from './products'

/** Módulos de placa que hoje podem ser executados de verdade. */
export type ModuloVeiculo =
  | 'placa_identificacao'
  | 'placa_bin_federal'
  | 'placa_bin_estadual'
  | 'placa_sinistro'
  | 'placa_gravame'
  | 'placa_leilao'
  | 'placa_fipe'
  | 'placa_processos_cnj'

export interface CustoModulo {
  /** Custo por consulta em reais. */
  custo: number
  /** Chave no resultado devolvido ao relatório. */
  chave: string
  /** Se depende do protocolo da consulta-base da Assertiva. */
  exigeProtocolo: boolean
  fornecedor: string
}

export const CUSTO_MODULO: Record<ModuloVeiculo, CustoModulo> = {
  placa_identificacao: { custo: 3.22,  chave: 'placa',       exigeProtocolo: false, fornecedor: 'assertiva' },
  placa_bin_federal:   { custo: 12.42, chave: 'binFederal',  exigeProtocolo: true,  fornecedor: 'assertiva' },
  placa_bin_estadual:  { custo: 12.42, chave: 'binEstadual', exigeProtocolo: true,  fornecedor: 'assertiva' },
  placa_gravame:       { custo: 8.90,  chave: 'gravame',     exigeProtocolo: true,  fornecedor: 'assertiva' },
  placa_sinistro:      { custo: 6.63,  chave: 'sinistro',    exigeProtocolo: true,  fornecedor: 'assertiva' },
  // Leilão passa pelo roteador de fornecedor: Infocar R$ 5,56, Assertiva R$ 13,79.
  placa_leilao:        { custo: 5.56,  chave: 'leilao',      exigeProtocolo: true,  fornecedor: 'infocar'   },
  // FIPE sai da resposta do precificador mais a BrasilAPI, sem chamada paga extra.
  placa_fipe:          { custo: 0,     chave: 'fipe',        exigeProtocolo: false, fornecedor: 'brasilapi' },
  placa_processos_cnj: { custo: 0,     chave: 'datajud',     exigeProtocolo: false, fornecedor: 'datajud'   },
}

/** Conjunto completo, usado quando o cliente não tem restrição configurada. */
export const MODULOS_PADRAO: ModuloVeiculo[] = [
  'placa_identificacao',
  'placa_bin_federal',
  'placa_bin_estadual',
  'placa_gravame',
  'placa_sinistro',
  'placa_leilao',
  'placa_fipe',
  'placa_processos_cnj',
]

/**
 * A identificação é a base de tudo: é dela que sai o protocolo exigido pelos
 * demais módulos da Assertiva, além dos dados do veículo. Nunca pode sair.
 */
export const MODULO_OBRIGATORIO: ModuloVeiculo = 'placa_identificacao'

const VALIDOS = new Set<string>(MODULOS_PADRAO)

/**
 * Normaliza o que veio do banco para uma lista de módulos executáveis.
 *
 * Lista vazia ou nula significa "sem restrição configurada", e nesse caso
 * devolve o pacote completo, preservando o comportamento de antes deste
 * motor existir. Assim nenhum cliente perde dado por omissão de cadastro.
 */
export function resolverModulos(configurados?: string[] | null): ModuloVeiculo[] {
  if (!configurados || configurados.length === 0) return [...MODULOS_PADRAO]

  const filtrados = configurados.filter((m): m is ModuloVeiculo => VALIDOS.has(m))
  if (filtrados.length === 0) return [...MODULOS_PADRAO]

  if (!filtrados.includes(MODULO_OBRIGATORIO)) filtrados.unshift(MODULO_OBRIGATORIO)
  return filtrados
}

/** Custo total de um conjunto de módulos, para margem e painel financeiro. */
export function custoDe(modulos: ModuloVeiculo[]): number {
  const total = modulos.reduce((s, m) => s + (CUSTO_MODULO[m]?.custo ?? 0), 0)
  return parseFloat(total.toFixed(2))
}

/**
 * Referência de economia: o que a consulta completa custava antes, com TODOS
 * os módulos e o leilão ainda na Assertiva. Medido em 14/09/2026: R$ 57,38.
 * É contra este número que a economia é calculada.
 */
export const CUSTO_LEILAO_ASSERTIVA = 13.79
export const CUSTO_REFERENCIA = parseFloat(
  (custoDe(MODULOS_PADRAO) - CUSTO_MODULO.placa_leilao.custo + CUSTO_LEILAO_ASSERTIVA).toFixed(2)
)

/**
 * Módulos cujo preço depende do fornecedor que de fato respondeu, e por isso
 * não saem da tabela fixa.
 */
export const MODULOS_DE_PRECO_VARIAVEL: ModuloVeiculo[] = [
  'placa_leilao', 'placa_bin_federal', 'placa_bin_estadual',
]

/**
 * Custo real de uma consulta.
 *
 * Esta conta vivia dentro do motor de consulta, onde nenhum teste alcançava, e
 * ela decide quanto o cliente paga quando a empresa não tem preço de tabela.
 *
 * `baseReaproveitada` é o ponto delicado: quando a consulta-base veio da etapa
 * de confirmação do veículo, ela JÁ FOI PAGA ali. Contar de novo cobraria
 * R$ 3,22 duas vezes pela mesma chamada e faria a confirmação encarecer a
 * consulta, que é exatamente o que ela não pode fazer.
 */
export function custoDaConsulta(opts: {
  modulos: ModuloVeiculo[]
  custoLeilao?: number
  custoNacional?: number
  custoEstadual?: number
  baseReaproveitada?: boolean
}): number {
  const jaPago: ModuloVeiculo[] = opts.baseReaproveitada ? [MODULO_OBRIGATORIO] : []

  const fixos = custoDe(
    opts.modulos.filter(m =>
      !MODULOS_DE_PRECO_VARIAVEL.includes(m) && !jaPago.includes(m))
  )

  const variaveis =
    (opts.custoLeilao   ?? 0) +
    (opts.custoNacional ?? 0) +
    (opts.custoEstadual ?? 0)

  return parseFloat((fixos + variaveis).toFixed(2))
}

/**
 * Quanto esta consulta economizou contra a referência.
 * @param modulos  módulos efetivamente executados
 * @param custoLeilao custo cobrado pelo fornecedor de leilão que respondeu
 */
export function economiaDe(modulos: ModuloVeiculo[], custoLeilao: number): number {
  const real = custoDe(modulos.filter(m => m !== 'placa_leilao'))
    + (modulos.includes('placa_leilao') ? custoLeilao : 0)
  return parseFloat((CUSTO_REFERENCIA - real).toFixed(2))
}

/** Confere se um id do catálogo é um módulo de veículo executável hoje. */
export function ehModuloVeiculo(id: ModuloId | string): id is ModuloVeiculo {
  return VALIDOS.has(id)
}
