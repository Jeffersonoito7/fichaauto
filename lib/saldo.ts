// ─── Saldo: empresa primeiro, pessoa como exceção ────────────────────────────
// Numa associação o caixa é um só: a empresa carrega e todos os operadores
// consomem dali. Quem não pertence a empresa nenhuma (consulta avulsa) continua
// usando o saldo do próprio perfil.

/** Carga mínima aceita numa recarga de empresa. */
export const RECARGA_MINIMA = 1000

export interface SaldoInfo {
  /** Saldo disponível em reais. */
  saldo: number
  /** De onde ele sai: o caixa da empresa ou a carteira da pessoa. */
  origem: 'tenant' | 'perfil'
  /** Preço de tabela da empresa. Nulo significa cobrar o custo real. */
  precoTenant: number | null
}

/**
 * Produtos que têm caixa próprio. Veículo é um caixa, CPF/CNPJ é outro:
 * a empresa recarrega cada um separadamente (migration 004).
 * CNPJ usa o caixa de CPF, como já era no perfil e como diz a 004
 * ("saldo_cpf → Produto 2 (consulta CPF e CNPJ)").
 */
export type ProdutoSaldo = 'veiculo' | 'cpf'

const CAIXA = {
  veiculo: {
    colunaSaldo: 'saldo_veiculo',
    colunaPreco: 'preco_veiculo',
    rpcDebito:   'debitar_saldo_tenant',
  },
  cpf: {
    colunaSaldo: 'saldo_cpf',
    colunaPreco: 'preco_cpf',
    rpcDebito:   'debitar_saldo_cpf_tenant',
  },
} as const

/**
 * Lê o caixa do produto. Com empresa é o caixa dela; sem empresa (consulta
 * avulsa) cai no saldo do próprio perfil.
 */
export async function lerSaldoProduto(
  svc: any,
  opts: { email: string; tenantId: string | null; produto: ProdutoSaldo },
): Promise<SaldoInfo> {
  const { colunaSaldo, colunaPreco } = CAIXA[opts.produto]

  if (opts.tenantId) {
    const { data } = await svc
      .from('tenants')
      .select(`${colunaSaldo}, ${colunaPreco}`)
      .eq('id', opts.tenantId)
      .maybeSingle()
    return {
      saldo:       Number(data?.[colunaSaldo] ?? 0),
      origem:      'tenant',
      precoTenant: data?.[colunaPreco] != null ? Number(data[colunaPreco]) : null,
    }
  }

  const { data } = await svc
    .from('perfis')
    .select(colunaSaldo)
    .eq('email', opts.email)
    .maybeSingle()
  return { saldo: Number(data?.[colunaSaldo] ?? 0), origem: 'perfil', precoTenant: null }
}

export async function lerSaldo(
  svc: any,
  opts: { email: string; tenantId: string | null },
): Promise<SaldoInfo> {
  return lerSaldoProduto(svc, { ...opts, produto: 'veiculo' })
}

/** Caixa de CPF/CNPJ: empresa primeiro, perfil só quando não há empresa. */
export async function lerSaldoCpf(
  svc: any,
  opts: { email: string; tenantId: string | null },
): Promise<SaldoInfo> {
  return lerSaldoProduto(svc, { ...opts, produto: 'cpf' })
}

/**
 * Debita o valor. Para empresa usa RPC atômica, senão dois operadores
 * consultando ao mesmo tempo gastariam o mesmo saldo duas vezes.
 * Devolve o que sobrou, para a tela avisar quando estiver acabando.
 */
export async function debitarSaldoProduto(
  svc: any,
  opts: { email: string; tenantId: string | null; valor: number; produto: ProdutoSaldo },
): Promise<{ sucesso: boolean; restante: number }> {
  const { colunaSaldo, rpcDebito } = CAIXA[opts.produto]
  const valor = parseFloat(opts.valor.toFixed(2))

  if (opts.tenantId) {
    const { data, error } = await svc.rpc(rpcDebito, {
      p_tenant_id: opts.tenantId,
      p_valor:     valor,
    })
    if (error) {
      console.error(`[debitarSaldo:${opts.produto}] rpc falhou:`, error.message)
      return { sucesso: false, restante: 0 }
    }
    const linha = Array.isArray(data) ? data[0] : data
    return { sucesso: !!linha?.sucesso, restante: Number(linha?.saldo_restante ?? 0) }
  }

  const { data: perfil } = await svc
    .from('perfis').select(colunaSaldo).eq('email', opts.email).maybeSingle()
  const atual = Number(perfil?.[colunaSaldo] ?? 0)
  if (atual < valor) return { sucesso: false, restante: atual }

  const restante = parseFloat((atual - valor).toFixed(2))
  await svc.from('perfis')
    .update({ [colunaSaldo]: restante, atualizado_em: new Date().toISOString() })
    .eq('email', opts.email)
  return { sucesso: true, restante }
}

export async function debitarSaldo(
  svc: any,
  opts: { email: string; tenantId: string | null; valor: number },
): Promise<{ sucesso: boolean; restante: number }> {
  return debitarSaldoProduto(svc, { ...opts, produto: 'veiculo' })
}

/** Debita o caixa de CPF/CNPJ: empresa via RPC atômica, perfil via update. */
export async function debitarSaldoCpf(
  svc: any,
  opts: { email: string; tenantId: string | null; valor: number },
): Promise<{ sucesso: boolean; restante: number }> {
  return debitarSaldoProduto(svc, { ...opts, produto: 'cpf' })
}

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/**
 * Mensagem de saldo insuficiente, já dizendo quanto falta.
 * `origem` existe porque quem não tem empresa não pode ser mandado para a
 * recarga mínima de empresa; ele recarrega a carteira dele.
 */
export function mensagemSemSaldo(
  saldo: number,
  custo: number,
  origem: SaldoInfo['origem'] = 'tenant',
): string {
  if (origem === 'perfil') {
    return `Saldo insuficiente. Esta consulta custa ${brl(custo)} e você tem ${brl(saldo)}. `
         + `Recarregue sua carteira para continuar consultando.`
  }
  return `Saldo insuficiente. Esta consulta custa ${brl(custo)} e sua empresa tem ${brl(saldo)}. `
       + `Recarregue a partir de ${brl(RECARGA_MINIMA)} para continuar consultando.`
}

/**
 * Avisa quando o saldo está acabando, para a empresa recarregar antes de
 * travar no meio de um atendimento. O limite é o suficiente para umas poucas
 * consultas, não um valor fixo que envelhece quando o custo muda.
 */
export function saldoAcabando(restante: number, custoMedio: number): boolean {
  return restante > 0 && restante < custoMedio * 3
}
