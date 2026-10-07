import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { verificarJwt } from '@/lib/jwt'
import { lerSaldo } from '@/lib/saldo'
import { CREDITO } from '@/lib/products'

export async function GET(_req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('ficha-auth')?.value

    if (!token) {
      return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
    }

    const payload = await verificarJwt(token)
    if (!payload) return NextResponse.json({ erro: 'Token inválido' }, { status: 401 })
    const { email, nome, role } = payload

    // Tenta buscar saldo e plano via service role
    let saldo_veiculo    = 0
    let origem_saldo: 'tenant' | 'perfil' = 'perfil'
    let saldo_cpf        = 0
    let creditos_credito = 0
    let plano: string | null = null
    let pode_placa   = true
    let pode_cpf     = true
    let pode_cnpj    = true
    let pode_lote    = false
    let pode_credito = false
    let tenant_id:   string | null = null
    let tenant_role: string | null = null
    let assinatura_ativa = false
    let tenant_nome: string | null = null
    try {
      // as any: Supabase precisa de tipos gerados (supabase gen types) para inferência de select()
      const service = createServiceRoleClient() as any
      const { data } = await service
        .from('perfis')
        .select('saldo_veiculo, plano, pode_placa, pode_cpf, pode_cnpj, pode_lote, pode_credito, tenant_id, tenant_role')
        .eq('email', email)
        .maybeSingle()
      saldo_veiculo    = parseFloat(data?.saldo_veiculo ?? '0')
      plano            = data?.plano          ?? null
      pode_placa       = data?.pode_placa     ?? true
      pode_cpf         = data?.pode_cpf       ?? true
      pode_cnpj        = data?.pode_cnpj      ?? true
      pode_lote        = data?.pode_lote      ?? false
      pode_credito     = data?.pode_credito   ?? false
      tenant_id        = data?.tenant_id      ?? null
      tenant_role      = data?.tenant_role    ?? null

      // Assinatura vive no tenant, nao no perfil. Sem isso o usuario de uma
      // associacao assinante aparece com saldo zero e consulta bloqueada.
      if (tenant_id) {
        const { data: tenant } = await service
          .from('tenants')
          .select('nome, nome_fantasia, assinatura_ativa, assinatura_vence_em')
          .eq('id', tenant_id)
          .maybeSingle()
        tenant_nome = tenant?.nome_fantasia ?? tenant?.nome ?? null
        assinatura_ativa = !!tenant?.assinatura_ativa
          && !!tenant?.assinatura_vence_em
          && new Date(tenant.assinatura_vence_em) > new Date()
      }

      // O caixa e DA EMPRESA. Ler o saldo do perfil fazia o painel da AutoVale
      // mostrar R$ 0,00 tendo R$ 500 no caixa, e o operador concluia que nao
      // podia consultar. Mesmo leitor usado pelo debito, para a tela e a
      // cobranca nunca olharem lugares diferentes.
      // Caixa único: um valor só, para todos os produtos. Os campos antigos
      // continuam na resposta apontando para ele, porque telas ainda leem
      // saldo_cpf e creditos_credito e passariam a mostrar R$ 0,00.
      const caixa = await lerSaldo(service, { email, tenantId: tenant_id })
      saldo_veiculo = caixa.saldo
      saldo_cpf     = caixa.saldo
      origem_saldo  = caixa.origem
    } catch (e: any) {
      console.error('[/api/auth/me] falha ao buscar perfil no banco:', e?.message ?? e)
    }

    // Quantas análises de crédito cabem no caixa. Deixou de ser um estoque de
    // unidades guardado no perfil e passou a ser uma conta sobre o dinheiro.
    creditos_credito = Math.floor(saldo_veiculo / CREDITO.avulsoCpf)

    return NextResponse.json({ nome, email, role, saldo: saldo_veiculo, origem_saldo, saldo_veiculo, saldo_cpf, creditos_credito, plano, pode_placa, pode_cpf, pode_cnpj, pode_lote, pode_credito, tenant_id, tenant_role, tenant_nome, assinatura_ativa })
  } catch {
    return NextResponse.json({ erro: 'Token inválido' }, { status: 401 })
  }
}
