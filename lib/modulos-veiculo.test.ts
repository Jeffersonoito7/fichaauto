// Testes da conta de custo da consulta veicular.
//
// Esta conta decide quanto o cliente paga quando a empresa não tem preço de
// tabela, então errar aqui é errar em dinheiro, em toda consulta, sem erro
// visível em lugar nenhum. Antes ela vivia inline dentro do motor de consulta,
// fora do alcance de qualquer teste.

import { describe, it, expect } from 'vitest'
import {
  custoDaConsulta, custoDe, resolverModulos, CUSTO_MODULO, MODULOS_PADRAO,
  CUSTO_REFERENCIA, MODULO_OBRIGATORIO, type ModuloVeiculo,
} from './modulos-veiculo'

// Custos medidos em 14/09/2026 com extrato real da Assertiva.
const IDENT     = CUSTO_MODULO.placa_identificacao.custo // 3,22
const LEILAO_AS = 13.79
const BIN       = CUSTO_MODULO.placa_bin_federal.custo   // 12,42

describe('custoDaConsulta — a base já paga não é cobrada duas vezes', () => {
  it('reproduz o custo real da consulta completa na Assertiva: R$ 57,38', () => {
    const r = custoDaConsulta({
      modulos: MODULOS_PADRAO,
      custoLeilao:   LEILAO_AS,
      custoNacional: BIN,
      custoEstadual: BIN,
    })
    expect(r).toBe(57.38)
    expect(r).toBe(CUSTO_REFERENCIA)
  })

  it('com a base reaproveitada, desconta exatamente os R$ 3,22 da identificação', () => {
    const comum = {
      modulos: MODULOS_PADRAO,
      custoLeilao:   LEILAO_AS,
      custoNacional: BIN,
      custoEstadual: BIN,
    }
    const cheio  = custoDaConsulta(comum)
    const com    = custoDaConsulta({ ...comum, baseReaproveitada: true })

    expect(parseFloat((cheio - com).toFixed(2))).toBe(IDENT)
    expect(com).toBe(54.16)
  })

  it('confirmar o veículo não encarece a consulta: 3,22 + 54,16 fecha em 57,38', () => {
    // Esta é a promessa feita ao cliente. Se ela quebrar, a consulta passa a
    // custar R$ 60,60 e ninguém percebe, porque nada falha.
    const etapaConfirmacao = IDENT
    const etapaCompleta = custoDaConsulta({
      modulos: MODULOS_PADRAO,
      custoLeilao:   LEILAO_AS,
      custoNacional: BIN,
      custoEstadual: BIN,
      baseReaproveitada: true,
    })
    expect(parseFloat((etapaConfirmacao + etapaCompleta).toFixed(2))).toBe(57.38)
  })

  it('sem reaproveitar, a identificação continua na conta', () => {
    const r = custoDaConsulta({ modulos: ['placa_identificacao'] })
    expect(r).toBe(IDENT)
  })

  it('reaproveitando, uma consulta só de identificação não custa nada', () => {
    const r = custoDaConsulta({ modulos: ['placa_identificacao'], baseReaproveitada: true })
    expect(r).toBe(0)
  })

  it('leilão mais barato pelo fornecedor alternativo derruba o total', () => {
    const infocar = custoDaConsulta({
      modulos: MODULOS_PADRAO, custoLeilao: 5.56, custoNacional: BIN, custoEstadual: BIN,
    })
    expect(infocar).toBeLessThan(57.38)
    expect(infocar).toBe(49.15)
  })

  it('módulo de preço variável nunca entra pela tabela fixa, só pelo custo informado', () => {
    // Se entrasse nos dois lugares, o cliente pagaria o leilão em dobro.
    const semCustoInformado = custoDaConsulta({ modulos: ['placa_identificacao', 'placa_leilao'] })
    expect(semCustoInformado).toBe(IDENT)
  })

  it('módulo gratuito não soma nada', () => {
    const r = custoDaConsulta({ modulos: ['placa_identificacao', 'placa_fipe', 'placa_processos_cnj'] })
    expect(r).toBe(IDENT)
  })

  it('lista vazia custa zero em vez de estourar', () => {
    expect(custoDaConsulta({ modulos: [] })).toBe(0)
  })

  it('arredonda para 2 casas, sem resto de ponto flutuante', () => {
    const r = custoDaConsulta({
      modulos: ['placa_identificacao', 'placa_gravame', 'placa_sinistro'],
    })
    // 3,22 + 8,90 + 6,63
    expect(r).toBe(18.75)
    expect(String(r)).not.toMatch(/\d{3,}$/)
  })
})

describe('resolverModulos', () => {
  it('sem configuração roda o pacote completo, para ninguém perder dado por cadastro em branco', () => {
    expect(resolverModulos(null)).toEqual(MODULOS_PADRAO)
    expect(resolverModulos([])).toEqual(MODULOS_PADRAO)
  })

  it('sempre inclui a identificação, que é de onde sai o protocolo dos outros', () => {
    const r = resolverModulos(['placa_gravame'])
    expect(r).toContain(MODULO_OBRIGATORIO)
    expect(r[0]).toBe(MODULO_OBRIGATORIO)
  })

  it('descarta id que não é módulo de veículo executável hoje', () => {
    const r = resolverModulos(['placa_gravame', 'placa_recall', 'inventado'])
    expect(r).not.toContain('placa_recall' as ModuloVeiculo)
    expect(r).not.toContain('inventado' as ModuloVeiculo)
    expect(r).toContain('placa_gravame')
  })

  it('lista só com id inválido cai no pacote completo, não numa consulta vazia', () => {
    expect(resolverModulos(['inventado', 'outro'])).toEqual(MODULOS_PADRAO)
  })
})

describe('custoDe', () => {
  it('soma os módulos pela tabela medida', () => {
    expect(custoDe(['placa_identificacao', 'placa_gravame'])).toBe(12.12)
  })

  it('id desconhecido vale zero em vez de NaN', () => {
    expect(custoDe(['placa_identificacao', 'nao_existe' as ModuloVeiculo])).toBe(IDENT)
  })
})
