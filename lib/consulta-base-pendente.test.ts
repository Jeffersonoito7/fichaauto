// Testes do resumo do veículo e da normalização da placa.
//
// Estes dois são o que a tela de confirmação mostra. Se o resumo sair errado, a
// pessoa confirma o carro errado achando que conferiu, o que é pior que não ter
// confirmação nenhuma.

import { describe, it, expect } from 'vitest'
import { resumoDoVeiculo, normalizarPlaca, JANELA_MINUTOS } from './consulta-base-pendente'

describe('normalizarPlaca', () => {
  it('tira símbolo e põe em maiúscula, para hífen e minúscula acharem o mesmo registro', () => {
    expect(normalizarPlaca('abc-1d23')).toBe('ABC1D23')
    expect(normalizarPlaca(' tmn 2h51 ')).toBe('TMN2H51')
  })

  it('aguenta vazio e nulo sem estourar', () => {
    expect(normalizarPlaca('')).toBe('')
    expect(normalizarPlaca(undefined as any)).toBe('')
  })
})

describe('resumoDoVeiculo', () => {
  const comDescricao = (descricao: any, identificadores: any = {}) =>
    ({ resposta: { descricao, identificadores } })

  it('lê a estrutura resposta.descricao da Assertiva', () => {
    const r = resumoDoVeiculo(comDescricao({
      marca: 'FIAT', marcaModelo: 'FIAT ARGO DRIVE 1.0',
      anoFabricacao: 2020, anoModelo: 2021, cor: 'PRATA', municipio: 'PETROLINA',
    }, { chassi: '9BD1234567890' }))

    expect(r.marca).toBe('FIAT')
    expect(r.ano).toBe('2020/2021')
    expect(r.cor).toBe('PRATA')
    expect(r.municipio).toBe('PETROLINA')
    expect(r.chassi).toBe('9BD1234567890')
  })

  it('não repete a marca no modelo: a Assertiva manda "FIAT ARGO" em marcaModelo', () => {
    const r = resumoDoVeiculo(comDescricao({ marca: 'FIAT', marcaModelo: 'FIAT ARGO DRIVE 1.0' }))
    expect(r.modelo).toBe('ARGO DRIVE 1.0')
    expect(r.modelo).not.toContain('FIAT FIAT')
  })

  it('tira a marca repetida mesmo com caixa diferente', () => {
    const r = resumoDoVeiculo(comDescricao({ marca: 'Fiat', marcaModelo: 'FIAT ARGO' }))
    expect(r.modelo).toBe('ARGO')
  })

  it('sem campo marca, deduz a marca da primeira palavra de marcaModelo', () => {
    const r = resumoDoVeiculo(comDescricao({ marcaModelo: 'VOLKSWAGEN GOL 1.6' }))
    expect(r.marca).toBe('VOLKSWAGEN')
    expect(r.modelo).toBe('GOL 1.6')
  })

  it('não apaga o modelo quando ele é só a marca', () => {
    // Se o corte deixasse string vazia, a tela mostraria o veículo sem nome.
    const r = resumoDoVeiculo(comDescricao({ marca: 'FIAT', marcaModelo: 'FIAT' }))
    expect(r.modelo).toBe('FIAT')
  })

  it('ano único quando fabricação e modelo são iguais, sem mostrar 2020/2020', () => {
    const r = resumoDoVeiculo(comDescricao({ anoFabricacao: 2020, anoModelo: 2020 }))
    expect(r.ano).toBe('2020')
  })

  it('ano presente mesmo quando só um dos dois veio', () => {
    expect(resumoDoVeiculo(comDescricao({ anoModelo: 2019 })).ano).toBe('2019')
    expect(resumoDoVeiculo(comDescricao({ anoFabricacao: 2018 })).ano).toBe('2018')
  })

  it('aceita payload sem o envelope resposta, lendo os campos na raiz', () => {
    const r = resumoDoVeiculo({ marca: 'HONDA', marcaModelo: 'HONDA CIVIC', anoModelo: 2015 })
    expect(r.marca).toBe('HONDA')
    expect(r.modelo).toBe('CIVIC')
  })

  it('payload vazio devolve tudo nulo, e não string vazia disfarçada', () => {
    const r = resumoDoVeiculo({})
    expect(r).toEqual({ marca: null, modelo: null, ano: null, cor: null, chassi: null, municipio: null })
  })

  it('payload nulo não estoura', () => {
    expect(() => resumoDoVeiculo(null)).not.toThrow()
    expect(resumoDoVeiculo(null).marca).toBeNull()
  })
})

describe('JANELA_MINUTOS', () => {
  it('é curta de propósito: o protocolo da Assertiva não tem validade documentada', () => {
    expect(JANELA_MINUTOS).toBeGreaterThan(0)
    expect(JANELA_MINUTOS).toBeLessThanOrEqual(30)
  })
})
