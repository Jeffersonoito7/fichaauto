import { describe, it, expect } from 'vitest'
import {
  lerSaldoCpf, debitarSaldoCpf, lerSaldo, debitarSaldo, mensagemSemSaldo,
} from './saldo'

// ─── Dublê do cliente Supabase ────────────────────────────────────────────────
// Só o que lib/saldo.ts usa: from().select().eq().maybeSingle(),
// from().update().eq() e rpc(). Registra tudo para os testes checarem que o
// caixa certo foi tocado e que o errado NÃO foi.

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

      // Reproduz a RPC da migration 018: verifica e debita na mesma operação.
      const t = tenants[args.p_tenant_id]
      const atual = Number(t?.saldo_cpf ?? 0)
      if (!t || atual < args.p_valor) {
        return { data: [{ sucesso: false, saldo_restante: atual }], error: null }
      }
      t.saldo_cpf = parseFloat((atual - args.p_valor).toFixed(2))
      return { data: [{ sucesso: true, saldo_restante: t.saldo_cpf }], error: null }
    },
  }
  return svc
}

const EMAIL  = 'operador@avp.com.br'
const TENANT = '11111111-1111-1111-1111-111111111111'

describe('lerSaldoCpf — de onde sai o dinheiro', () => {
  it('com tenant lê o caixa da EMPRESA, não o do operador', async () => {
    const svc = fakeSvc({
      tenants: { [TENANT]: { saldo_cpf: 500, preco_cpf: 19.9 } },
      perfis:  { [EMAIL]:  { saldo_cpf: 7 } },
    })

    const r = await lerSaldoCpf(svc, { email: EMAIL, tenantId: TENANT })

    expect(r).toEqual({ saldo: 500, origem: 'tenant', precoTenant: 19.9 })
    expect(svc.chamadas.map(c => c.tabela)).toEqual(['tenants'])
  })

  it('sem tenant lê o saldo do PERFIL e não tem preço de tabela', async () => {
    const svc = fakeSvc({ perfis: { [EMAIL]: { saldo_cpf: 42.5 } } })

    const r = await lerSaldoCpf(svc, { email: EMAIL, tenantId: null })

    expect(r).toEqual({ saldo: 42.5, origem: 'perfil', precoTenant: null })
    expect(svc.chamadas.map(c => c.tabela)).toEqual(['perfis'])
  })

  it('empresa sem preço de tabela devolve precoTenant nulo (rota usa o preço do catálogo)', async () => {
    const svc = fakeSvc({ tenants: { [TENANT]: { saldo_cpf: 100, preco_cpf: null } } })

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
    const svc = fakeSvc({ tenants: { [TENANT]: { saldo_cpf: '250.00', preco_cpf: '12.50' } } })
    const r = await lerSaldoCpf(svc, { email: EMAIL, tenantId: TENANT })
    expect(r.saldo).toBe(250)
    expect(r.precoTenant).toBe(12.5)
  })
})

describe('debitarSaldoCpf — quem paga a consulta', () => {
  it('com tenant debita pela RPC atômica da empresa, sem tocar no perfil', async () => {
    const svc = fakeSvc({
      tenants: { [TENANT]: { saldo_cpf: 100 } },
      perfis:  { [EMAIL]:  { saldo_cpf: 50 } },
    })

    const r = await debitarSaldoCpf(svc, { email: EMAIL, tenantId: TENANT, valor: 14.9 })

    expect(r).toEqual({ sucesso: true, restante: 85.1 })
    expect(svc.chamadas).toEqual([
      { tabela: 'rpc', rpc: 'debitar_saldo_cpf_tenant', args: { p_tenant_id: TENANT, p_valor: 14.9 } },
    ])
    // Carteira do operador intacta: o caixa é da empresa.
    expect(svc.chamadas.some(c => c.tabela === 'perfis')).toBe(false)
  })

  it('usa a RPC de CPF, nunca a de veículo', async () => {
    const svc = fakeSvc({ tenants: { [TENANT]: { saldo_cpf: 100 } } })
    await debitarSaldoCpf(svc, { email: EMAIL, tenantId: TENANT, valor: 10 })
    expect(svc.chamadas[0].rpc).toBe('debitar_saldo_cpf_tenant')
    expect(svc.chamadas[0].rpc).not.toBe('debitar_saldo_tenant')
  })

  it('sem tenant debita o saldo do perfil', async () => {
    const svc = fakeSvc({ perfis: { [EMAIL]: { saldo_cpf: 50 } } })

    const r = await debitarSaldoCpf(svc, { email: EMAIL, tenantId: null, valor: 14.9 })

    expect(r).toEqual({ sucesso: true, restante: 35.1 })
    const upd = svc.chamadas.find(c => c.update)
    expect(upd?.tabela).toBe('perfis')
    expect(upd?.update.saldo_cpf).toBe(35.1)
    // Não mexe no saldo de veículo do perfil.
    expect(upd?.update).not.toHaveProperty('saldo_veiculo')
  })

  it('empresa sem saldo recusa e NÃO altera o caixa', async () => {
    const svc = fakeSvc({ tenants: { [TENANT]: { saldo_cpf: 5 } } })

    const r = await debitarSaldoCpf(svc, { email: EMAIL, tenantId: TENANT, valor: 14.9 })

    expect(r).toEqual({ sucesso: false, restante: 5 })
  })

  it('perfil sem saldo recusa antes de gravar qualquer update', async () => {
    const svc = fakeSvc({ perfis: { [EMAIL]: { saldo_cpf: 5 } } })

    const r = await debitarSaldoCpf(svc, { email: EMAIL, tenantId: null, valor: 14.9 })

    expect(r).toEqual({ sucesso: false, restante: 5 })
    expect(svc.chamadas.some(c => c.update)).toBe(false)
  })

  it('RPC com erro não dá o débito por bem-sucedido', async () => {
    const svc = fakeSvc({
      tenants:  { [TENANT]: { saldo_cpf: 100 } },
      rpcErro:  'function does not exist',
    })

    const r = await debitarSaldoCpf(svc, { email: EMAIL, tenantId: TENANT, valor: 14.9 })

    expect(r.sucesso).toBe(false)
  })

  it('dois débitos concorrentes na mesma empresa não gastam o mesmo saldo duas vezes', async () => {
    const svc = fakeSvc({ tenants: { [TENANT]: { saldo_cpf: 20 } } })

    const [a, b] = await Promise.all([
      debitarSaldoCpf(svc, { email: EMAIL, tenantId: TENANT, valor: 14.9 }),
      debitarSaldoCpf(svc, { email: 'outro@avp.com.br', tenantId: TENANT, valor: 14.9 }),
    ])

    expect([a.sucesso, b.sucesso].filter(Boolean)).toHaveLength(1)
    expect(svc.chamadas.filter(c => c.rpc)).toHaveLength(2)
  })

  it('arredonda o valor para 2 casas antes de debitar', async () => {
    const svc = fakeSvc({ tenants: { [TENANT]: { saldo_cpf: 100 } } })
    await debitarSaldoCpf(svc, { email: EMAIL, tenantId: TENANT, valor: 14.9 * 3 })
    expect(svc.chamadas[0].args.p_valor).toBe(44.7)
  })
})

describe('caixa de veículo segue intocado', () => {
  it('lerSaldo continua lendo saldo_veiculo/preco_veiculo do tenant', async () => {
    const svc = fakeSvc({
      tenants: { [TENANT]: { saldo_veiculo: 900, preco_veiculo: 36.9, saldo_cpf: 1 } },
    })
    const r = await lerSaldo(svc, { email: EMAIL, tenantId: TENANT })
    expect(r).toEqual({ saldo: 900, origem: 'tenant', precoTenant: 36.9 })
  })

  it('debitarSaldo continua chamando debitar_saldo_tenant', async () => {
    const svc = fakeSvc({ tenants: { [TENANT]: { saldo_veiculo: 900 } } })
    await debitarSaldo(svc, { email: EMAIL, tenantId: TENANT, valor: 36.9 })
    expect(svc.chamadas[0].rpc).toBe('debitar_saldo_tenant')
  })

  it('debitarSaldo sem tenant escreve em saldo_veiculo, não em saldo_cpf', async () => {
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
