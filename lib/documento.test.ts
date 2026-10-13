// Testes do dígito verificador de CPF e CNPJ.
//
// Esta validação é a defesa mais barata contra erro de digitação virar consulta
// paga. O caso que a motivou está no primeiro teste.

import { describe, it, expect } from 'vitest'
import { cpfValido, cnpjValido, soDigitos, formatarCpf } from './documento'

describe('cpfValido', () => {
  it('recusa o CPF que gerou o prejuízo real em 12/10/2026', () => {
    // 11 dígitos, passou na validação antiga, a Assertiva devolveu 400 nas duas
    // chamadas e o cliente foi debitado em R$ 14,90 por um relatório vazio.
    expect(cpfValido('06222697968')).toBe(false)
  })

  it('aceita CPF com dígito verificador correto', () => {
    expect(cpfValido('11144477735')).toBe(true)
  })

  it('aceita com máscara, porque é como a pessoa digita', () => {
    expect(cpfValido('111.444.777-35')).toBe(true)
  })

  it('recusa os onze dígitos repetidos, que passam na conta por coincidência', () => {
    for (const d of '0123456789') {
      expect(cpfValido(d.repeat(11))).toBe(false)
    }
  })

  it('recusa tamanho errado, vazio e nulo sem estourar', () => {
    expect(cpfValido('1114447773')).toBe(false)
    expect(cpfValido('111444777351')).toBe(false)
    expect(cpfValido('')).toBe(false)
    expect(cpfValido(undefined as any)).toBe(false)
  })

  it('recusa quando só o último dígito está trocado', () => {
    // O erro de digitação típico: um número só, no fim.
    expect(cpfValido('11144477734')).toBe(false)
  })

  it('recusa quando dois dígitos do meio foram trocados de posição', () => {
    expect(cpfValido('11144747735')).toBe(false)
  })

  it('recusa texto que não é número', () => {
    expect(cpfValido('abcdefghijk')).toBe(false)
  })
})

describe('cnpjValido', () => {
  it('aceita o CNPJ real da Oito7', () => {
    expect(cnpjValido('62302560000158')).toBe(true)
    expect(cnpjValido('62.302.560/0001-58')).toBe(true)
  })

  it('recusa dígito verificador errado', () => {
    expect(cnpjValido('62302560000159')).toBe(false)
  })

  it('recusa os quatorze dígitos repetidos', () => {
    expect(cnpjValido('11111111111111')).toBe(false)
  })

  it('recusa tamanho errado e vazio', () => {
    expect(cnpjValido('6230256000015')).toBe(false)
    expect(cnpjValido('')).toBe(false)
  })
})

describe('soDigitos e formatarCpf', () => {
  it('tira máscara e espaço', () => {
    expect(soDigitos(' 111.444.777-35 ')).toBe('11144477735')
  })

  it('formata para a mensagem de erro mostrar o que a pessoa digitou', () => {
    expect(formatarCpf('06222697968')).toBe('062.226.979-68')
  })

  it('não tenta formatar o que não tem 11 dígitos', () => {
    expect(formatarCpf('123')).toBe('123')
  })
})
