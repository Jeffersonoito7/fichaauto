// Testes da distinção entre "consultei e não achei" e "não consultei".
//
// Cada caso aqui é uma forma concreta de o relatório mentir para quem vai
// decidir uma compra com base nele.

import { describe, it, expect } from 'vitest'
import { blocoVeio, statusDeOcorrencia, statusDeScore } from './bloco-consultado'

describe('blocoVeio', () => {
  it('objeto vazio é ausente, que é o que sobra de `data.protestos ?? {}`', () => {
    expect(blocoVeio({})).toBe(false)
  })

  it('nulo e indefinido são ausentes', () => {
    expect(blocoVeio(null)).toBe(false)
    expect(blocoVeio(undefined)).toBe(false)
  })

  it('array vazio é ausente', () => {
    expect(blocoVeio([])).toBe(false)
  })

  it('objeto com conteúdo veio, mesmo que o conteúdo diga zero', () => {
    // "consultei e achei zero protestos" É informação, e precisa aparecer.
    expect(blocoVeio({ total: 0, lista: [] })).toBe(true)
  })

  it('array com itens veio', () => {
    expect(blocoVeio([{ numero: '123' }])).toBe(true)
  })
})

describe('statusDeOcorrencia', () => {
  it('NUNCA pinta de verde um bloco que não foi consultado', () => {
    // Era este o defeito: protesto saía verde "NADA CONSTA" sem consulta.
    expect(statusDeOcorrencia(undefined, 0)).toBe('ausente')
    expect(statusDeOcorrencia({}, 0)).toBe('ausente')
    expect(statusDeOcorrencia(null, undefined)).toBe('ausente')
  })

  it('verde só quando consultou e não achou nada', () => {
    expect(statusDeOcorrencia({ total: 0 }, 0)).toBe('ok')
  })

  it('vermelho quando consultou e achou', () => {
    expect(statusDeOcorrencia({ total: 3 }, 3)).toBe('error')
  })

  it('bloco presente com total ausente conta como nada encontrado', () => {
    expect(statusDeOcorrencia({ lista: [] }, undefined)).toBe('ok')
  })
})

describe('statusDeScore', () => {
  it('score ausente NÃO vira vermelho: não difama quem nunca foi consultado', () => {
    // `Number(undefined ?? 0)` dava 0 e caía na faixa pior.
    expect(statusDeScore(undefined, undefined)).toBe('ausente')
    expect(statusDeScore({}, 0)).toBe('ausente')
    expect(statusDeScore({ score: 0 }, 0)).toBe('ausente')
  })

  it('classifica por faixa quando o score realmente veio', () => {
    expect(statusDeScore({ score: 850 }, 850)).toBe('ok')
    expect(statusDeScore({ score: 456 }, 456)).toBe('warn')
    expect(statusDeScore({ score: 200 }, 200)).toBe('error')
  })

  it('limites das faixas', () => {
    expect(statusDeScore({ score: 700 }, 700)).toBe('ok')
    expect(statusDeScore({ score: 699 }, 699)).toBe('warn')
    expect(statusDeScore({ score: 400 }, 400)).toBe('warn')
    expect(statusDeScore({ score: 399 }, 399)).toBe('error')
  })

  it('score do CNPJ real da Oito7 (456) classifica como médio risco', () => {
    expect(statusDeScore({ score: 456, faixa: { titulo: 'Médio risco' } }, 456)).toBe('warn')
  })
})
