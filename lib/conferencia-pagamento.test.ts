// Testes da conferência de pagamento PIX.
//
// Esta função decide se um pagamento vira saldo. Cada caso aqui corresponde a
// um jeito concreto de perder dinheiro ou de travar venda legítima.

import { describe, it, expect } from 'vitest'
import { conferirPagamento, TOLERANCIA } from './conferencia-pagamento'

describe('conferirPagamento', () => {
  it('aceita quando o valor pago é igual ao cobrado', () => {
    const r = conferirPagamento({ valorCobrado: 1000, valorPago: 1000 })
    expect(r).toEqual({ aceito: true, valorPago: 1000 })
  })

  it('RECUSA o ataque que motivou esta função: cobrança de mil paga com um real', () => {
    const r = conferirPagamento({ valorCobrado: 1000, valorPago: 1 })
    expect(r.aceito).toBe(false)
    expect(r.aceito === false && r.motivo).toBe('pago_a_menor')
  })

  it('recusa diferença pequena mas acima da tolerância', () => {
    const r = conferirPagamento({ valorCobrado: 100, valorPago: 99.9 })
    expect(r.aceito).toBe(false)
  })

  it('aceita diferença dentro da tolerância de um centavo (arredondamento)', () => {
    const r = conferirPagamento({ valorCobrado: 100, valorPago: 100 - TOLERANCIA })
    expect(r.aceito).toBe(true)
  })

  it('aceita pagamento a maior, e quem credita usa o cobrado', () => {
    // O excedente nunca vira saldo sozinho: isso é responsabilidade do chamador,
    // que credita transacao.valor, não o que veio no aviso.
    const r = conferirPagamento({ valorCobrado: 100, valorPago: 150 })
    expect(r).toEqual({ aceito: true, valorPago: 150 })
  })

  it('aceita string, que é como a Efí e o Postgres mandam números', () => {
    const r = conferirPagamento({ valorCobrado: '36.90', valorPago: '36.90' })
    expect(r).toEqual({ aceito: true, valorPago: 36.9 })
  })

  it('recusa pagamento a menor mesmo vindo como string', () => {
    const r = conferirPagamento({ valorCobrado: '1000.00', valorPago: '1.00' })
    expect(r.aceito).toBe(false)
  })

  it('aviso sem valor não credita, em vez de confiar no que nós gravamos', () => {
    for (const vazio of [undefined, null, '', '   ', 'abc', NaN]) {
      const r = conferirPagamento({ valorCobrado: 100, valorPago: vazio })
      expect(r.aceito).toBe(false)
      expect(r.aceito === false && r.motivo).toBe('sem_valor')
    }
  })

  it('string vazia NÃO vira zero: Number("") é 0 e passaria por pagamento', () => {
    const r = conferirPagamento({ valorCobrado: 0, valorPago: '' })
    expect(r.aceito).toBe(false)
  })

  it('sem cobrança registrada não inventa divergência', () => {
    // Transação legada sem valor gravado: não é motivo para travar o crédito.
    const r = conferirPagamento({ valorCobrado: null, valorPago: 50 })
    expect(r).toEqual({ aceito: true, valorPago: 50 })
    expect(conferirPagamento({ valorCobrado: 0, valorPago: 50 }).aceito).toBe(true)
  })

  it('valor pago zero é recusado quando havia cobrança', () => {
    const r = conferirPagamento({ valorCobrado: 36.9, valorPago: 0 })
    expect(r.aceito).toBe(false)
    expect(r.aceito === false && r.motivo).toBe('pago_a_menor')
  })

  it('valor negativo não é aceito como pagamento', () => {
    const r = conferirPagamento({ valorCobrado: 100, valorPago: -100 })
    expect(r.aceito).toBe(false)
  })

  it('devolve o valor pago para gravação, mesmo quando recusa', () => {
    // O webhook grava valor_pago antes de marcar divergente, para conciliação.
    const r = conferirPagamento({ valorCobrado: 1000, valorPago: 1 })
    expect(r.valorPago).toBe(1)
  })
})
