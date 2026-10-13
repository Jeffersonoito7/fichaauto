// Testes da leitura de consulta já salva.
//
// Existe porque esta função é a guarda de custo do modo leitura: quando ela
// devolve null por engano, a tela do relatório oferece uma consulta paga para
// uma placa que a pessoa já tinha. E quando devolve resultado corrompido, o
// relatório abre vazio sem erro nenhum.

import { describe, it, expect } from 'vitest'
import { buscarConsultaSalvaDoUsuario, textoIdade, DIAS_PARA_ENVELHECER } from './reaproveitar-consulta'

/** Imita só o encadeamento do PostgREST que a função usa. */
function svcFake(data: any, opts: { lancar?: boolean } = {}) {
  const filtros: Record<string, any> = {}
  const q: any = {
    select: () => q,
    eq: (col: string, val: any) => { filtros[col] = val; return q },
    not: () => q,
    order: () => q,
    limit: () => q,
    maybeSingle: async () => {
      if (opts.lancar) throw new Error('banco fora')
      return { data }
    },
  }
  return { cliente: { from: () => q }, filtros }
}

const diasAtras = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString()

describe('buscarConsultaSalvaDoUsuario', () => {
  it('devolve a consulta salva do próprio usuário', async () => {
    const { cliente } = svcFake({
      id: 'c1', resultado: { placa: { ok: true } }, created_at: diasAtras(0),
      custo: 57.38, email: 'a@b.com',
    })
    const r = await buscarConsultaSalvaDoUsuario(cliente, 'a@b.com', 'ABC1D23', 'veiculo')
    expect(r?.id).toBe('c1')
    expect(r?.custoOriginal).toBe(57.38)
    expect(r?.envelhecida).toBe(false)
  })

  it('normaliza a placa antes de filtrar, para hífen e minúscula acharem o mesmo registro', async () => {
    const { cliente, filtros } = svcFake({
      id: 'c1', resultado: { placa: { resposta: { descricao: { marcaModelo: 'HONDA/CG 160' } } } }, created_at: diasAtras(1), custo: 0, email: 'a@b.com',
    })
    await buscarConsultaSalvaDoUsuario(cliente, 'a@b.com', 'abc-1d23', 'veiculo')
    expect(filtros.documento).toBe('ABC1D23')
  })

  it('filtra pelo e-mail de quem pediu, nunca servindo consulta de outra pessoa', async () => {
    const { cliente, filtros } = svcFake({
      id: 'c1', resultado: { placa: { resposta: { descricao: { marcaModelo: 'HONDA/CG 160' } } } }, created_at: diasAtras(1), custo: 0, email: 'a@b.com',
    })
    await buscarConsultaSalvaDoUsuario(cliente, 'a@b.com', 'ABC1D23', 'veiculo')
    expect(filtros.email).toBe('a@b.com')
  })

  it('aceita resultado gravado como string escapada em coluna jsonb', async () => {
    const { cliente } = svcFake({
      id: 'c1', resultado: JSON.stringify({ placa: { ok: 1 } }), created_at: diasAtras(2),
      custo: null, email: null,
    })
    const r = await buscarConsultaSalvaDoUsuario(cliente, 'a@b.com', 'ABC1D23', 'veiculo')
    expect(r?.resultado).toEqual({ placa: { ok: 1 } })
    expect(r?.custoOriginal).toBeNull()
  })

  it('recusa string que não é JSON em vez de abrir relatório vazio', async () => {
    const { cliente } = svcFake({
      id: 'c1', resultado: 'isto nao e json', created_at: diasAtras(1), custo: 0, email: null,
    })
    expect(await buscarConsultaSalvaDoUsuario(cliente, 'a@b.com', 'ABC1D23', 'veiculo')).toBeNull()
  })

  it('marca como envelhecida a partir do prazo, e não antes', async () => {
    const nova = svcFake({ id: 'c1', resultado: { placa: { resposta: { descricao: { marcaModelo: 'HONDA/CG 160' } } } }, created_at: diasAtras(DIAS_PARA_ENVELHECER - 1), custo: 0, email: null })
    const velha = svcFake({ id: 'c2', resultado: { placa: { resposta: { descricao: { marcaModelo: 'HONDA/CG 160' } } } }, created_at: diasAtras(DIAS_PARA_ENVELHECER), custo: 0, email: null })
    expect((await buscarConsultaSalvaDoUsuario(nova.cliente, 'a@b.com', 'ABC1D23', 'veiculo'))?.envelhecida).toBe(false)
    expect((await buscarConsultaSalvaDoUsuario(velha.cliente, 'a@b.com', 'ABC1D23', 'veiculo'))?.envelhecida).toBe(true)
  })

  it('devolve null sem e-mail ou sem documento, em vez de varrer a tabela', async () => {
    const { cliente } = svcFake({ id: 'c1', resultado: { placa: { resposta: { descricao: { marcaModelo: 'HONDA/CG 160' } } } }, created_at: diasAtras(0), custo: 0, email: null })
    expect(await buscarConsultaSalvaDoUsuario(cliente, '', 'ABC1D23', 'veiculo')).toBeNull()
    expect(await buscarConsultaSalvaDoUsuario(cliente, 'a@b.com', '---', 'veiculo')).toBeNull()
  })

  it('devolve null quando o banco falha, e não um relatório inventado', async () => {
    const { cliente } = svcFake(null, { lancar: true })
    expect(await buscarConsultaSalvaDoUsuario(cliente, 'a@b.com', 'ABC1D23', 'veiculo')).toBeNull()
  })
})

describe('textoIdade', () => {
  const base = { id: 'x', resultado: {}, consultadaEm: '', envelhecida: false, custoOriginal: null, consultadaPor: null }
  it('escreve a idade em português, sem número solto para hoje e ontem', () => {
    expect(textoIdade({ ...base, diasAtras: 0 })).toBe('consultada hoje')
    expect(textoIdade({ ...base, diasAtras: 1 })).toBe('consultada ontem')
    expect(textoIdade({ ...base, diasAtras: 5 })).toBe('consultada há 5 dias')
    expect(textoIdade({ ...base, diasAtras: 45 })).toBe('consultada há cerca de um mês')
    expect(textoIdade({ ...base, diasAtras: 95 })).toBe('consultada há cerca de 3 meses')
  })
})

describe('reaproveitamento NÃO serve consulta que falhou', () => {
  it('recusa a casca de erro que a AutoVale recebeu em 12/10/2026', async () => {
    // Resultado real gravado: blocos vazios e dois erros 400 da Assertiva.
    // Antes, isto era servido como relatório pronto na tentativa seguinte.
    const { cliente } = svcFake({
      id: 'c1', created_at: diasAtras(0), custo: 0, email: 'a@b.com',
      resultado: {
        cpf: '06222697968',
        basico: {}, enderecos: [], telefones: [], societario: [],
        relacionamentos: [], datajud: null, sancoes: null, pep: null,
        erros: [
          'relacionamentos: Assertiva erro 400',
          'localize: Assertiva erro 400',
        ],
      },
    })
    expect(await buscarConsultaSalvaDoUsuario(cliente, 'a@b.com', '06222697968', 'cpf')).toBeNull()
  })

  it('recusa resultado que só tem erros', async () => {
    const { cliente } = svcFake({
      id: 'c1', created_at: diasAtras(0), custo: 0, email: null,
      resultado: { erros: ['falhou'] },
    })
    expect(await buscarConsultaSalvaDoUsuario(cliente, 'a@b.com', 'ABC1D23', 'veiculo')).toBeNull()
  })

  it('ACEITA consulta boa, para a correção não quebrar o reaproveitamento legítimo', async () => {
    const { cliente } = svcFake({
      id: 'c1', created_at: diasAtras(0), custo: 57.38, email: 'a@b.com',
      resultado: { placa: { resposta: { descricao: { marcaModelo: 'HONDA/CG 160' } } }, erros: [] },
    })
    const r = await buscarConsultaSalvaDoUsuario(cliente, 'a@b.com', 'ABC1D23', 'veiculo')
    expect(r?.id).toBe('c1')
  })

  it('aceita quando o dado veio e a consulta achou zero ocorrências', async () => {
    // "consultei e não achei nada" É resultado válido e deve ser reaproveitado.
    const { cliente } = svcFake({
      id: 'c1', created_at: diasAtras(0), custo: 14.9, email: 'a@b.com',
      resultado: { basico: { nome: 'FULANO DE TAL' }, enderecos: [], erros: [] },
    })
    expect((await buscarConsultaSalvaDoUsuario(cliente, 'a@b.com', '11144477735', 'cpf'))?.id).toBe('c1')
  })

  it('metadado sozinho não conta como conteúdo', async () => {
    const { cliente } = svcFake({
      id: 'c1', created_at: diasAtras(0), custo: 0, email: 'a@b.com',
      resultado: { cpf: '11144477735', _custoTotal: 14.9, erros: [] },
    })
    expect(await buscarConsultaSalvaDoUsuario(cliente, 'a@b.com', '11144477735', 'cpf')).toBeNull()
  })
})
