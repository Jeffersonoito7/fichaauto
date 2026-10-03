import { describe, it, expect } from 'vitest'
import { ipDaRequisicao, limitar } from './rate-limit'

function req(headers: Record<string, string>): Request {
  return new Request('https://fichaauto.com.br/teste', { headers })
}

describe('ipDaRequisicao', () => {
  it('usa o ULTIMO da cadeia, que e o que o proxy escreveu', () => {
    // O cliente mandou "1.2.3.4" de proposito; o Traefik acrescentou o IP real
    // no fim. Pegar o primeiro (como o codigo antigo fazia) deixaria o
    // atacante escolher o proprio identificador e zerar o contador.
    expect(ipDaRequisicao(req({ 'x-forwarded-for': '1.2.3.4, 200.200.200.200' })))
      .toBe('200.200.200.200')
  })

  it('cadeia com um IP so devolve ele', () => {
    expect(ipDaRequisicao(req({ 'x-forwarded-for': '200.200.200.200' })))
      .toBe('200.200.200.200')
  })

  it('cai no x-real-ip quando nao ha cadeia', () => {
    expect(ipDaRequisicao(req({ 'x-real-ip': '10.0.0.9' }))).toBe('10.0.0.9')
  })

  it('sem cabecalho nenhum devolve um valor fixo, e nao vazio', () => {
    expect(ipDaRequisicao(req({}))).toBe('desconhecido')
  })

  it('ignora espacos e itens vazios na cadeia', () => {
    expect(ipDaRequisicao(req({ 'x-forwarded-for': ' 1.1.1.1 ,  , 9.9.9.9 ' })))
      .toBe('9.9.9.9')
  })
})

describe('limitar', () => {
  it('libera ate o maximo e bloqueia a partir dai', () => {
    const chave = `teste-a-${Math.random()}`
    for (let i = 0; i < 3; i++) {
      expect(limitar(chave, 3, 60_000).permitido).toBe(true)
    }
    const quarta = limitar(chave, 3, 60_000)
    expect(quarta.permitido).toBe(false)
    expect(quarta.esperarSegundos).toBeGreaterThan(0)
  })

  it('conta chaves diferentes separadamente', () => {
    const a = `teste-b-${Math.random()}`
    const b = `teste-c-${Math.random()}`
    limitar(a, 1, 60_000)
    expect(limitar(a, 1, 60_000).permitido).toBe(false)
    expect(limitar(b, 1, 60_000).permitido).toBe(true)
  })

  it('a janela reabre depois que expira', async () => {
    const chave = `teste-d-${Math.random()}`
    expect(limitar(chave, 1, 20).permitido).toBe(true)
    expect(limitar(chave, 1, 20).permitido).toBe(false)
    await new Promise(r => setTimeout(r, 40))
    expect(limitar(chave, 1, 20).permitido).toBe(true)
  })

  it('informa quantas tentativas restam', () => {
    const chave = `teste-e-${Math.random()}`
    expect(limitar(chave, 3, 60_000).restantes).toBe(2)
    expect(limitar(chave, 3, 60_000).restantes).toBe(1)
    expect(limitar(chave, 3, 60_000).restantes).toBe(0)
  })
})
