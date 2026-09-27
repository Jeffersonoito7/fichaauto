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

export async function lerSaldo(
  svc: any,
  opts: { email: string; tenantId: string | null },
): Promise<SaldoInfo> {
  if (opts.tenantId) {
    const { data } = await svc
      .from('tenants')
      .select('saldo_veiculo, preco_veiculo')
      .eq('id', opts.tenantId)
      .maybeSingle()
    return {
      saldo:       Number(data?.saldo_veiculo ?? 0),
      origem:      'tenant',
      precoTenant: data?.preco_veiculo != null ? Number(data.preco_veiculo) : null,
    }
  }

  const { data } = await svc
    .from('perfis')
    .select('saldo_veiculo')
    .eq('email', opts.email)
    .maybeSingle()
  return { saldo: Number(data?.saldo_veiculo ?? 0), origem: 'perfil', precoTenant: null }
}

/**
 * Debita o valor. Para empresa usa RPC atômica, senão dois operadores
 * consultando ao mesmo tempo gastariam o mesmo saldo duas vezes.
 * Devolve o que sobrou, para a tela avisar quando estiver acabando.
 */
export async function debitarSaldo(
  svc: any,
  opts: { email: string; tenantId: string | null; valor: number },
): Promise<{ sucesso: boolean; restante: number }> {
  const valor = parseFloat(opts.valor.toFixed(2))

  if (opts.tenantId) {
    const { data, error } = await svc.rpc('debitar_saldo_tenant', {
      p_tenant_id: opts.tenantId,
      p_valor:     valor,
    })
    if (error) {
      console.error('[debitarSaldo] rpc falhou:', error.message)
      return { sucesso: false, restante: 0 }
    }
    const linha = Array.isArray(data) ? data[0] : data
    return { sucesso: !!linha?.sucesso, restante: Number(linha?.saldo_restante ?? 0) }
  }

  const { data: perfil } = await svc
    .from('perfis').select('saldo_veiculo').eq('email', opts.email).maybeSingle()
  const atual = Number(perfil?.saldo_veiculo ?? 0)
  if (atual < valor) return { sucesso: false, restante: atual }

  const restante = parseFloat((atual - valor).toFixed(2))
  await svc.from('perfis')
    .update({ saldo_veiculo: restante, atualizado_em: new Date().toISOString() })
    .eq('email', opts.email)
  return { sucesso: true, restante }
}

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/** Mensagem de saldo insuficiente, já dizendo quanto falta. */
export function mensagemSemSaldo(saldo: number, custo: number): string {
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
