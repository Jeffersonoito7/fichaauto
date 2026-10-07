import { describe, it, expect } from 'vitest'
import {
  lerSaldoCpf, debitarSaldoCpf, lerSaldo, debitarSaldo, lerSaldoProduto,
  debitarSaldoProduto, mensagemSemSaldo, COLUNA_CAIXA, RPC_DEBITO,
} from './saldo'

// ─── Dublê do cliente Supabase ────────────────────────────────────────────────
// Só o que lib/saldo.ts usa: from().select().eq().maybeSingle(),
// from().update().eq() e rpc(). Registra tudo para os testes checarem qual
// caixa foi tocado.
//
// Esta suíte foi reescrita em 06/10/2026, quando o caixa passou a ser ÚNICO por
// empresa. Antes cada produto tinha o seu, e a análise de crédito contava
// unidades no perfil: a AutoVale tinha R$ 385,24 no caixa e lia "sem créditos
// disponíveis" na tela. Os testes antigos afirmavam o desenho separado, então
// falharam de propósito quando a regra mudou.

interface Chamada { tabela: string; update?: any; rpc?: string; args?: any }

function fakeSvc(opts: {
  tenants?: Record<string, any>
  perfis?: Record<string, any>
  rpcErro?: string
}) {
  const chamadas: Chamada[] = []
  const tenants = opts.tenants ?? {}
  const perfis  = opts.perfis ?? {}

  const svc = {
    chamadas,
    from(tabela: string) {
      const tabelaRef = tabela === 'tenants' ? tenants : perfis
      return {
        select() {
          return {
            eq(_coluna: string, valor: string) {
              return {
                async maybeSingle() {
                  chamadas.push({ tabela })
                  return { data: tabelaRef[valor] ?? null }
                },
              }
            },
          }
        },
        update(patch: any) {
          return {
            async eq(_coluna: string, valor: string) {
              chamadas.push({ tabela, update: patch })
              tabelaRef[valor] = { ...(tabelaRef[valor] ?? {}), ...patch }
              return { error: null }
            },
          }
        },
      }
    },
    async rpc(nome: string, args: any) {
      chamadas.push({ tabela: 'rpc', rpc: nome, args })
      if (opts.rpcErro) return { data: null, error: { message: opts.rpcErro } }

      // Reproduz a RPC: verifica e debita o caixa na mesma operação.
      const t = tenants[args.p_tenant_id]
      const atual = Number(t?.[COLUNA_CAIXA] ?? 0)
      if (!t || atual < args.p_valor) {
        return { data: [{ sucesso: false, saldo_restante: atual }], error: null }
      }
      t[COLUNA_CAIXA] = parseFloat((atual - args.p_valor).toFixed(2))
      return { data: [{ sucesso: true, saldo_restante: t[COLUNA_CAIXA] }], error: null }
    },
  }
  return svc
}

const EMAIL  = 'operador@avp.com.br'
const TENANT = '11111111-1111-1111-1111-111111111111'

describe('caixa único — todos os produtos leem o mesmo dinheiro', () => {
  it('veículo, CPF e crédito veem o mesmo saldo da empresa', async () => {
    const svc = fakeSvc({ tenants: { [TENANT]: { saldo_veiculo: 385.24, saldo_cpf: 0 } } })

    const veiculo = await lerSaldoProduto(svc, { email: EMAIL, tenantId: TENANT, produto: 'veiculo' })
    const cpf     = await lerSaldoProduto(svc, { email: EMAIL, tenantId: TENANT, produto: 'cpf' })
    const credito = await lerSaldoProduto(svc, { email: EMAIL, tenantId: TENANT, produto: 'credito' })

    expect([veiculo.saldo, cpf.saldo, credito.saldo]).toEqual([385.24, 385.24, 385.24])
  })

  it('o caixa legado de CPF não é mais lido, mesmo com valor nele', async () => {
    // O bug que motivou a mudança: dinheiro num caixa e o produto lendo outro.
    const svc = fakeSvc({ tenants: { [TENANT]: { saldo_veiculo: 100, saldo_cpf: 999 } } })
    const r = await lerSaldoCpf(svc, { email: EMAIL, tenantId: TENANT })
    expect(r.saldo).toBe(100)
  })

  it('cada produto mantém o PREÇO próprio, só o caixa é compartilhado', async () => {
    const svc = fakeSvc({
      tenants: { [TENANT]: { saldo_veiculo: 500, preco_veiculo: 36.9, preco_cpf: 19.9 } },
    })

    const veiculo = await lerSaldoProduto(svc, { email: EMAIL, tenantId: TENANT, produto: 'veiculo' })
    const cpf     = await lerSaldoProduto(svc, { email: EMAIL, tenantId: TENANT, produto: 'cpf' })

    expect(veiculo.precoTenant).toBe(36.9)
    expect(cpf.precoTenant).toBe(19.9)
  })

  it('crédito não tem coluna de preço e devolve nulo, para a rota usar o catálogo', async () => {
    // Herdar o preço de outro produto cobraria valor errado em silêncio.
    const svc = fakeSvc({
      tenants: { [TENANT]: { saldo_veiculo: 500, preco_veiculo: 36.9, preco_cpf: 19.9 } },
    })
    const r = await lerSaldoProduto(svc, { email: EMAIL, tenantId: TENANT, produto: 'credito' })
    expect(r.precoTenant).toBeNull()
    expect(r.saldo).toBe(500)
  })
})

describe('lerSaldoCpf — de onde sai o dinheiro', () => {
  it('com tenant lê o caixa da EMPRESA, não o do operador', async () => {
    const svc = fakeSvc({
      tenants: { [TENANT]: { saldo_veiculo: 500, preco_cpf: 19.9 } },
      perfis:  { [EMAIL]:  { saldo_veiculo: 7 } },
    })

    const r = await lerSaldoCpf(svc, { email: EMAIL, tenantId: TENANT })

    expect(r).toEqual({ saldo: 500, origem: 'tenant', precoTenant: 19.9 })
    expect(svc.chamadas.map(c => c.tabela)).toEqual(['tenants'])
  })

  it('sem tenant lê o saldo do PERFIL e não tem preço de tabela', async () => {
    const svc = fakeSvc({ perfis: { [EMAIL]: { saldo_veiculo: 42.5 } } })

    const r = await lerSaldoCpf(svc, { email: EMAIL, tenantId: null })

    expect(r).toEqual({ saldo: 42.5, origem: 'perfil', precoTenant: null })
    expect(svc.chamadas.map(c => c.tabela)).toEqual(['perfis'])
  })

  it('empresa sem preço de tabela devolve precoTenant nulo (rota usa o preço do catálogo)', async () => {
    const svc = fakeSvc({ tenants: { [TENANT]: { saldo_veiculo: 100, preco_cpf: null } } })

    const r = await lerSaldoCpf(svc, { email: EMAIL, tenantId: TENANT })

    expect(r.precoTenant).toBeNull()
    expect(r.saldo).toBe(100)
  })

  it('empresa inexistente devolve saldo zero em vez de estourar', async () => {
    const svc = fakeSvc({})
    const r = await lerSaldoCpf(svc, { email: EMAIL, tenantId: TENANT })
    expect(r).toEqual({ saldo: 0, origem: 'tenant', precoTenant: null })
  })

  it('numéricos vindos como string do Postgres são convertidos', async () => {
    const svc = fakeSvc({ tenants: { [TENANT]: { saldo_veiculo: '250.00', preco_cpf: '12.50' } } })
    const r = await lerSaldoCpf(svc, { email: EMAIL, tenantId: TENANT })
    expect(r.saldo).toBe(250)
    expect(r.precoTenant).toBe(12.5)
  })
})

describe('debitarSaldoCpf — quem paga a consulta', () => {
  it('com tenant debita pela RPC atômica da empresa, sem tocar no perfil', async () => {
    const svc = fakeSvc({
      tenants: { [TENANT]: { saldo_veiculo: 100 } },
      perfis:  { [EMAIL]:  { saldo_veiculo: 50 } },
    })

    const r = await debitarSaldoCpf(svc, { email: EMAIL, tenantId: TENANT, valor: 14.9 })

    expect(r).toEqual({ sucesso: true, restante: 85.1 })
    expect(svc.chamadas).toEqual([
      { tabela: 'rpc', rpc: RPC_DEBITO, args: { p_tenant_id: TENANT, p_valor: 14.9 } },
    ])
    // Carteira do operador intacta: o caixa é da empresa.
    expect(svc.chamadas.some(c => c.tabela === 'perfis')).toBe(false)
  })

  it('todos os produtos debitam pela mesma RPC do caixa', async () => {
    const svc = fakeSvc({ tenants: { [TENANT]: { saldo_veiculo: 300 } } })

    await debitarSaldoProduto(svc, { email: EMAIL, tenantId: TENANT, valor: 10, produto: 'veiculo' })
    await debitarSaldoProduto(svc, { email: EMAIL, tenantId: TENANT, valor: 10, produto: 'cpf' })
    await debitarSaldoProduto(svc, { email: EMAIL, tenantId: TENANT, valor: 10, produto: 'credito' })

    expect(svc.chamadas.map(c => c.rpc)).toEqual([RPC_DEBITO, RPC_DEBITO, RPC_DEBITO])
    // Os três saíram do mesmo dinheiro.
    expect(svc.chamadas.at(-1)!.args.p_valor).toBe(10)
  })

  it('sem tenant debita o saldo do perfil, no caixa único', async () => {
    const svc = fakeSvc({ perfis: { [EMAIL]: { saldo_veiculo: 50 } } })

    const r = await debitarSaldoCpf(svc, { email: EMAIL, tenantId: null, valor: 14.9 })

    expect(r).toEqual({ sucesso: true, restante: 35.1 })
    const upd = svc.chamadas.find(c => c.update)
    expect(upd?.tabela).toBe('perfis')
    expect(upd?.update[COLUNA_CAIXA]).toBe(35.1)
    // A coluna legada não é mais escrita.
    expect(upd?.update).not.toHaveProperty('saldo_cpf')
  })

  it('empresa sem saldo recusa e NÃO altera o caixa', async () => {
    const svc = fakeSvc({ tenants: { [TENANT]: { saldo_veiculo: 5 } } })

    const r = await debitarSaldoCpf(svc, { email: EMAIL, tenantId: TENANT, valor: 14.9 })

    expect(r).toEqual({ sucesso: false, restante: 5 })
    expect(svc.chamadas.find(c => c.rpc)).toBeTruthy()
  })

  it('perfil sem saldo recusa antes de gravar qualquer update', async () => {
    const svc = fakeSvc({ perfis: { [EMAIL]: { saldo_veiculo: 5 } } })

    const r = await debitarSaldoCpf(svc, { email: EMAIL, tenantId: null, valor: 14.9 })

    expect(r).toEqual({ sucesso: false, restante: 5 })
    expect(svc.chamadas.some(c => c.update)).toBe(false)
  })

  it('RPC com erro não dá o débito por bem-sucedido', async () => {
    const svc = fakeSvc({
      tenants:  { [TENANT]: { saldo_veiculo: 100 } },
      rpcErro:  'function does not exist',
    })

    const r = await debitarSaldoCpf(svc, { email: EMAIL, tenantId: TENANT, valor: 14.9 })

    expect(r.sucesso).toBe(false)
  })

  it('dois débitos concorrentes na mesma empresa não gastam o mesmo saldo duas vezes', async () => {
    const svc = fakeSvc({ tenants: { [TENANT]: { saldo_veiculo: 20 } } })

    const [a, b] = await Promise.all([
      debitarSaldoCpf(svc, { email: EMAIL, tenantId: TENANT, valor: 14.9 }),
      debitarSaldoCpf(svc, { email: 'outro@avp.com.br', tenantId: TENANT, valor: 14.9 }),
    ])

    expect([a.sucesso, b.sucesso].filter(Boolean)).toHaveLength(1)
    expect(svc.chamadas.filter(c => c.rpc)).toHaveLength(2)
  })

  it('produtos diferentes concorrendo também disputam o mesmo caixa', async () => {
    // Com caixas separados os dois passariam. Com caixa único, só um passa.
    const svc = fakeSvc({ tenants: { [TENANT]: { saldo_veiculo: 40 } } })

    const [a, b] = await Promise.all([
      debitarSaldoProduto(svc, { email: EMAIL, tenantId: TENANT, valor: 36.9, produto: 'veiculo' }),
      debitarSaldoProduto(svc, { email: EMAIL, tenantId: TENANT, valor: 34.9, produto: 'credito' }),
    ])

    expect([a.sucesso, b.sucesso].filter(Boolean)).toHaveLength(1)
  })

  it('arredonda o valor para 2 casas antes de debitar', async () => {
    const svc = fakeSvc({ tenants: { [TENANT]: { saldo_veiculo: 100 } } })
    await debitarSaldoCpf(svc, { email: EMAIL, tenantId: TENANT, valor: 14.9 * 3 })
    expect(svc.chamadas[0].args.p_valor).toBe(44.7)
  })
})

describe('caixa de veículo', () => {
  it('lerSaldo lê saldo_veiculo/preco_veiculo do tenant', async () => {
    const svc = fakeSvc({
      tenants: { [TENANT]: { saldo_veiculo: 900, preco_veiculo: 36.9, saldo_cpf: 1 } },
    })
    const r = await lerSaldo(svc, { email: EMAIL, tenantId: TENANT })
    expect(r).toEqual({ saldo: 900, origem: 'tenant', precoTenant: 36.9 })
  })

  it('debitarSaldo chama a RPC do caixa', async () => {
    const svc = fakeSvc({ tenants: { [TENANT]: { saldo_veiculo: 900 } } })
    await debitarSaldo(svc, { email: EMAIL, tenantId: TENANT, valor: 36.9 })
    expect(svc.chamadas[0].rpc).toBe(RPC_DEBITO)
  })

  it('debitarSaldo sem tenant escreve no caixa, não na coluna legada', async () => {
    const svc = fakeSvc({ perfis: { [EMAIL]: { saldo_veiculo: 100, saldo_cpf: 100 } } })
    await debitarSaldo(svc, { email: EMAIL, tenantId: null, valor: 36.9 })
    const upd = svc.chamadas.find(c => c.update)
    expect(upd?.update.saldo_veiculo).toBe(63.1)
    expect(upd?.update).not.toHaveProperty('saldo_cpf')
  })
})

describe('mensagemSemSaldo', () => {
  it('para empresa fala em recarga mínima da empresa', () => {
    const m = mensagemSemSaldo(5, 14.9, 'tenant')
    expect(m).toContain('sua empresa tem')
    expect(m).toContain('1.000')
  })

  it('para quem não tem empresa fala na carteira dele, sem recarga mínima', () => {
    const m = mensagemSemSaldo(5, 14.9, 'perfil')
    expect(m).toContain('você tem')
    expect(m).toContain('sua carteira')
    expect(m).not.toContain('1.000')
  })

  it('sem o argumento origem mantém o texto antigo (rota de veículo)', () => {
    expect(mensagemSemSaldo(5, 36.9)).toContain('sua empresa tem')
  })
})
