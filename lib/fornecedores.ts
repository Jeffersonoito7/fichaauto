// ─── Catálogo de fornecedores por módulo da consulta veicular ────────────────
//
// Antes deste arquivo a escolha do fornecedor era invisível e automática: o
// roteador olhava se existia a chave no ambiente e decidia sozinho. O dono não
// tinha onde marcar nada. Aqui a escolha passa a ser dele, e acrescentar um
// fornecedor novo no futuro é adicionar uma linha nesta tabela, sem reescrever
// motor nem tela.
//
// IMPORTANTE: este arquivo NÃO guarda credencial. A chave de cada fornecedor
// continua no ambiente do servidor. Aqui ficam apenas o nome da variável que
// precisa existir e o custo por consulta, para a tela dizer ao dono o que está
// configurado e quanto custa cada opção.

import type { ModuloVeiculo } from './modulos-veiculo'

export type FornecedorId = 'assertiva' | 'infocar' | 'serpro' | 'brasilapi' | 'datajud'

export interface Fornecedor {
  id: FornecedorId
  nome: string
  /** Variável de ambiente que precisa existir para o fornecedor funcionar. */
  envChave: string | null
  /**
   * Fornecedor ainda indisponível por motivo externo ao código. Fica visível
   * na tela, para o dono saber que existe, mas não pode ser escolhido.
   */
  bloqueio?: string
}

export const FORNECEDORES: Record<FornecedorId, Fornecedor> = {
  assertiva: { id: 'assertiva', nome: 'Assertiva', envChave: 'ASSERTIVA_LOGIN' },
  infocar:   { id: 'infocar',   nome: 'Infocar',   envChave: 'INFOCAR_API_KEY' },
  serpro:    {
    id: 'serpro',
    nome: 'SERPRO (WS-SENATRAN)',
    envChave: 'SERPRO_API_KEY',
    bloqueio: 'Aguardando o credenciamento na SENATRAN (solicitação 67886).',
  },
  brasilapi: { id: 'brasilapi', nome: 'BrasilAPI',  envChave: null },
  datajud:   { id: 'datajud',   nome: 'DataJud CNJ', envChave: null },
}

export interface OpcaoFornecedor {
  fornecedor: FornecedorId
  /** Custo por consulta em reais. Zero quando a fonte é gratuita. */
  custo: number
}

/**
 * Quem sabe entregar cada módulo, em ordem de preferência do mais barato.
 * O primeiro da lista é o padrão quando o dono ainda não escolheu nada.
 *
 * Custos de Assertiva medidos em 14/09/2026 com extrato real (placa HUF 495).
 * Custos de Infocar vindos da proposta comercial fechada em 28/09/2026.
 * O custo do SERPRO depende da faixa de volume (Portaria Senatran 417/2026) e
 * só será conhecido após o credenciamento, por isso fica nulo até lá.
 */
export const OPCOES_POR_MODULO: Record<ModuloVeiculo, OpcaoFornecedor[]> = {
  placa_identificacao: [
    { fornecedor: 'assertiva', custo: 3.22 },
    { fornecedor: 'serpro',    custo: 0 },
  ],
  placa_bin_federal: [
    { fornecedor: 'infocar',   custo: 6.07 },
    { fornecedor: 'assertiva', custo: 12.42 },
    { fornecedor: 'serpro',    custo: 0 },
  ],
  placa_bin_estadual: [
    { fornecedor: 'infocar',   custo: 5.97 },
    { fornecedor: 'assertiva', custo: 12.42 },
    { fornecedor: 'serpro',    custo: 0 },
  ],
  placa_gravame: [
    { fornecedor: 'assertiva', custo: 8.90 },
    { fornecedor: 'serpro',    custo: 0 },
  ],
  placa_sinistro: [
    { fornecedor: 'assertiva', custo: 6.63 },
  ],
  placa_leilao: [
    { fornecedor: 'infocar',   custo: 5.56 },
    { fornecedor: 'assertiva', custo: 13.79 },
  ],
  placa_fipe: [
    { fornecedor: 'brasilapi', custo: 0 },
  ],
  placa_processos_cnj: [
    { fornecedor: 'datajud',   custo: 0 },
  ],
}

/** Prefixo das chaves em config_financeiro, que é a tabela chave e valor já existente. */
export const PREFIXO_CONFIG = 'fornecedor_modulo:'

export function chaveConfig(modulo: ModuloVeiculo): string {
  return `${PREFIXO_CONFIG}${modulo}`
}

/** Um fornecedor só está utilizável se a variável dele existir e não houver bloqueio. */
export function fornecedorConfigurado(id: FornecedorId): boolean {
  const f = FORNECEDORES[id]
  if (!f) return false
  if (f.bloqueio) return false
  if (!f.envChave) return true
  return !!process.env[f.envChave]
}

/** Motivo de um fornecedor não poder ser escolhido, ou null se ele estiver pronto. */
export function motivoIndisponivel(id: FornecedorId): string | null {
  const f = FORNECEDORES[id]
  if (!f) return 'Fornecedor desconhecido.'
  if (f.bloqueio) return f.bloqueio
  if (f.envChave && !process.env[f.envChave]) {
    return `Falta configurar ${f.envChave} no servidor.`
  }
  return null
}

/**
 * Resolve qual fornecedor usar de verdade em um módulo.
 *
 * A ordem é: o que o dono escolheu, se estiver utilizável; senão o primeiro da
 * lista que estiver utilizável; senão nenhum. Escolha que aponta para um
 * fornecedor sem chave NUNCA é respeitada, porque isso quebraria a consulta do
 * cliente no meio do caminho.
 */
export function resolverFornecedor(
  modulo: ModuloVeiculo,
  escolhido?: string | null,
): FornecedorId | null {
  const opcoes = OPCOES_POR_MODULO[modulo] ?? []

  if (escolhido) {
    const valida = opcoes.find(o => o.fornecedor === escolhido)
    if (valida && fornecedorConfigurado(valida.fornecedor)) return valida.fornecedor
  }

  const padrao = opcoes.find(o => fornecedorConfigurado(o.fornecedor))
  return padrao?.fornecedor ?? null
}

/** Custo da opção escolhida, para o painel financeiro e o cálculo de margem. */
export function custoDaOpcao(modulo: ModuloVeiculo, fornecedor: FornecedorId): number {
  return OPCOES_POR_MODULO[modulo]?.find(o => o.fornecedor === fornecedor)?.custo ?? 0
}
