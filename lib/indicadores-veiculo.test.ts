import { describe, it, expect } from 'vitest'
import {
  contarRegistrosReais,
  registrosReais,
  statusLista,
  statusTexto,
  rotuloStatus,
  rotuloTexto,
  naoConsultado,
  contarLeilao,
  statusLeilao,
  registrosGravame,
  statusGravame,
  ehSentinelaAusencia,
  CAMPOS_ID_GRAVAME,
} from './indicadores-veiculo'

describe('contarRegistrosReais — o bug de produção', () => {
  it('[{}] da Assertiva conta ZERO (não é leilão)', () => {
    expect(contarRegistrosReais([{}])).toBe(0)
  })

  it('[] conta ZERO', () => {
    expect(contarRegistrosReais([])).toBe(0)
  })

  it('null e undefined contam ZERO', () => {
    expect(contarRegistrosReais(null)).toBe(0)
    expect(contarRegistrosReais(undefined)).toBe(0)
  })

  it('objeto só com metadado interno _base conta ZERO', () => {
    expect(contarRegistrosReais([{ _base: 'HISTÓRICO' }])).toBe(0)
  })

  it('registro com data e leiloeiro conta UM', () => {
    expect(contarRegistrosReais([{ data: '01/01/2024', leiloeiro: 'X' }])).toBe(1)
  })

  it('registro com situacao NADA CONSTA conta ZERO', () => {
    expect(contarRegistrosReais([{ situacao: 'NADA CONSTA' }])).toBe(0)
  })

  it('SEM REGISTRO e NAO CONSTA também contam ZERO', () => {
    expect(contarRegistrosReais([{ status: 'SEM REGISTRO' }])).toBe(0)
    expect(contarRegistrosReais([{ resultado: 'NAO CONSTA' }])).toBe(0)
  })

  it('registro real mas com situacao NADA CONSTA conta ZERO (sentinela ganha)', () => {
    expect(contarRegistrosReais([{ data: '01/01/2024', situacao: 'NADA CONSTA' }])).toBe(0)
  })

  it('campos identificadores em branco contam ZERO', () => {
    expect(contarRegistrosReais([{ data: '', leiloeiro: '   ', comitente: null }])).toBe(0)
  })

  it('lista mista conta só os reais', () => {
    const lista = [
      {},
      { situacao: 'NADA CONSTA' },
      { data: '01/01/2024', leiloeiro: 'X' },
      { _base: 'HISTÓRICO' },
      { comitente: 'Banco Y', dataLeilao: '10/02/2023' },
      { descricao: '' },
    ]
    expect(contarRegistrosReais(lista)).toBe(2)
    expect(registrosReais(lista).map((l: any) => l.leiloeiro ?? l.comitente)).toEqual(['X', 'Banco Y'])
  })

  it('não é array (objeto, string, número) conta ZERO', () => {
    expect(contarRegistrosReais({ data: '01/01/2024' })).toBe(0)
    expect(contarRegistrosReais('NADA CONSTA')).toBe(0)
    expect(contarRegistrosReais(0)).toBe(0)
  })
})

describe('statusLista — ausente não é limpo', () => {
  it('null/undefined sinalizam nao-consultado', () => {
    expect(statusLista(null)).toBe('nao-consultado')
    expect(statusLista(undefined)).toBe('nao-consultado')
    expect(naoConsultado(null)).toBe(true)
    expect(naoConsultado(undefined)).toBe(true)
    expect(naoConsultado([])).toBe(false)
  })

  it('[] e [{}] consultados viram nada-consta, não nao-consultado', () => {
    expect(statusLista([])).toBe('nada-consta')
    expect(statusLista([{}])).toBe('nada-consta')
  })

  it('registro real vira consta', () => {
    expect(statusLista([{ orgao: 'TJSP' }])).toBe('consta')
  })
})

describe('statusTexto — booleano cru e campo ausente', () => {
  it('false vira nada-consta e nunca o texto "false"', () => {
    expect(statusTexto(false)).toBe('nada-consta')
    expect(rotuloTexto(false).texto).toBe('Nada consta')
    expect(rotuloTexto('false').texto).toBe('Nada consta')
    expect(rotuloTexto('FALSE').texto).toBe('Nada consta')
  })

  it('true vira consta', () => {
    expect(statusTexto(true)).toBe('consta')
    expect(rotuloTexto(true).texto).toBe('Consta registro')
  })

  it('campo ausente ou vazio vira nao-consultado, nunca nada-consta', () => {
    expect(statusTexto(null)).toBe('nao-consultado')
    expect(statusTexto(undefined)).toBe('nao-consultado')
    expect(statusTexto('')).toBe('nao-consultado')
    expect(statusTexto('   ')).toBe('nao-consultado')
    expect(rotuloTexto(undefined).texto).toBe('Não consultado')
  })

  it('sentinelas viram nada-consta e preservam o texto original', () => {
    expect(statusTexto('NADA CONSTA')).toBe('nada-consta')
    expect(statusTexto('Sem restrição')).toBe('nada-consta')
    expect(statusTexto('Não existem indícios de sinistro')).toBe('nada-consta')
    expect(rotuloTexto('NADA CONSTA').texto).toBe('NADA CONSTA')
  })

  it('restrição de verdade vira consta', () => {
    expect(statusTexto('CONSTA RESTRICAO RENAJUD')).toBe('consta')
    expect(rotuloTexto('CONSTA RESTRICAO RENAJUD').texto).toBe('CONSTA RESTRICAO RENAJUD')
  })

  it('objeto com descricao é resolvido pelo conteúdo', () => {
    expect(statusTexto({ descricao: 'NADA CONSTA' })).toBe('nada-consta')
    expect(statusTexto({ descricao: 'ROUBO/FURTO' })).toBe('consta')
    expect(statusTexto({})).toBe('nao-consultado')
  })
})

describe('rotuloStatus', () => {
  it('nao-consultado nunca vira "Não informado" nem "Nada consta"', () => {
    expect(rotuloStatus('nao-consultado')).toBe('Não consultado')
    expect(rotuloStatus('nada-consta')).toBe('Nada consta')
    expect(rotuloStatus('consta', '1 ocorrência(s)')).toBe('1 ocorrência(s)')
  })
})

describe('contarLeilao / statusLeilao — payload real da Assertiva', () => {
  it('{ historicoLeilao: [{}] } conta ZERO', () => {
    expect(contarLeilao({ historicoLeilao: [{}] })).toBe(0)
    expect(statusLeilao({ resposta: { historicoLeilao: [{}] } })).toBe('nada-consta')
  })

  it('histórico com leilão de verdade conta UM', () => {
    const resp = { historicoLeilao: [{ dataLeilao: '03/05/2022', comitente: 'Seguradora Z' }] }
    expect(contarLeilao(resp)).toBe(1)
    expect(statusLeilao({ resposta: resp })).toBe('consta')
  })

  it('bases A/B/remarketing/lotes são somadas e filtradas', () => {
    const resp = {
      baseA: [{}],
      baseB: [{ data: '01/01/2020' }],
      remarketing: [{ situacao: 'SEM REGISTRO' }],
      lotes: [{ comarca: 'Campinas' }],
    }
    expect(contarLeilao(resp)).toBe(2)
  })

  it('módulo de leilão ausente é nao-consultado, não nada-consta', () => {
    expect(statusLeilao(null)).toBe('nao-consultado')
    expect(statusLeilao(undefined)).toBe('nao-consultado')
  })

  it('leilao sem nenhuma base conta ZERO', () => {
    expect(contarLeilao({})).toBe(0)
    expect(contarLeilao(null)).toBe(0)
  })
})

describe('gravame', () => {
  it('gravame objeto vazio conta ZERO', () => {
    expect(registrosGravame({ gravame: {} })).toHaveLength(0)
    expect(registrosGravame({})).toHaveLength(0)
  })

  it('gravame com sentinela conta ZERO', () => {
    expect(registrosGravame({ gravame: { situacao: 'NADA CONSTA' } })).toHaveLength(0)
    expect(registrosGravame({ gravames: [{ restricao: 'SEM RESTRICAO' }] })).toHaveLength(0)
  })

  it('gravame real conta UM', () => {
    expect(registrosGravame({ gravame: { agente: 'BANCO X', restricao: 'ALIENACAO FIDUCIARIA' } })).toHaveLength(1)
  })

  it('módulo de gravame ausente é nao-consultado', () => {
    expect(statusGravame(null)).toBe('nao-consultado')
    expect(statusGravame({ resposta: { gravame: {} } })).toBe('nada-consta')
  })

  it('CAMPOS_ID_GRAVAME está exportado para quem precisar de contagem própria', () => {
    expect(CAMPOS_ID_GRAVAME).toContain('agente')
  })
})

describe('ehSentinelaAusencia', () => {
  it('reconhece as variantes com e sem acento', () => {
    for (const s of ['NADA CONSTA', 'nao consta', 'Não consta', 'sem registro', 'SEM RESTRIÇÃO', 'não existem indícios']) {
      expect(ehSentinelaAusencia(s)).toBe(true)
    }
  })

  it('texto vazio não é sentinela (é ausência de dado)', () => {
    expect(ehSentinelaAusencia('')).toBe(false)
    expect(ehSentinelaAusencia(null)).toBe(false)
  })
})
