import { NextRequest, NextResponse } from 'next/server'
import { getAuthEmail, salvarConsulta, registrarAuditoria } from '@/lib/consulta-helper'
import { buscarConsultaAnterior, textoIdade } from '@/lib/reaproveitar-consulta'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { getToken } from '@/lib/providers/assertiva'
import { CREDITO } from '@/lib/products'
import { lerSaldoProduto, debitarSaldoProduto, mensagemSemSaldo } from '@/lib/saldo'

const BASE_URL   = 'https://api.assertivasolucoes.com.br'
const FINALIDADE = 2

async function assertivaGet(path: string) {
  const token = await getToken()
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Assertiva ${path} erro ${res.status}`)
  return res.json()
}

function limpaCpf(c: string) { return c.replace(/\D/g, '') }

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ cpf: string }> }
) {
  const { cpf: cpfParam } = await context.params
  const cpf = limpaCpf(cpfParam)

  if (cpf.length !== 11) {
    return NextResponse.json({ error: 'CPF inválido' }, { status: 400 })
  }

  const email = await getAuthEmail()
  if (!email) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const svc = createServiceRoleClient() as any
  const { data: perfil } = await svc.from('perfis')
    .select('role, pode_credito, tenant_id')
    .eq('email', email)
    .maybeSingle()

  const isAdmin = perfil?.role === 'super_admin' || email === process.env.ADMIN_EMAIL
  if (!isAdmin && !perfil?.pode_credito) {
    return NextResponse.json({ error: 'Sem acesso ao produto Análise de Crédito.' }, { status: 403 })
  }

  // Caixa único da empresa, em reais. Antes isto contava unidades em
  // perfis.creditos_credito, fora do caixa: a empresa tinha dinheiro e a tela
  // dizia "sem créditos disponíveis".
  const { saldo, origem, precoTenant } = await lerSaldoProduto(svc, {
    email, tenantId: perfil?.tenant_id ?? null, produto: 'credito',
  })
  const custo = precoTenant ?? CREDITO.avulsoCpf

  if (!isAdmin && saldo < custo) {
    return NextResponse.json(
      { error: mensagemSemSaldo(saldo, custo, origem), recarregar: true, saldo },
      { status: 402 }
    )
  }

  // ── Reaproveitamento dentro da mesma empresa ──
  const forcar = req.nextUrl.searchParams.get('atualizar') === '1'
  if (!forcar && perfil?.tenant_id) {
    const anterior = await buscarConsultaAnterior(perfil.tenant_id, cpf, 'credito_cpf')
    if (anterior) {
      await svc.from('consultas').insert({
        email, tenant_id: perfil.tenant_id, tipo: 'credito_cpf', documento: cpf,
        descricao: 'reaproveitada', resultado: anterior.resultado,
        custo: 0, reaproveitada: true, origem_id: anterior.id,
      })
      registrarAuditoria({ email, acao: 'credito_cpf_reaproveitada', documento: cpf, custo: 0 })
      return NextResponse.json({
        ...anterior.resultado,
        _reaproveitada: true,
        _consultadaEm:  anterior.consultadaEm,
        _diasAtras:     anterior.diasAtras,
        _envelhecida:   anterior.envelhecida,
        _idadeTexto:    textoIdade(anterior),
        _consultadaPor: anterior.consultadaPor,
      })
    }
  }

  const erros: string[] = []
  const safe = async (path: string, nome: string) => {
    try { return await assertivaGet(path) }
    catch (e: any) { erros.push(`${nome}: ${e.message}`); return null }
  }

  const [rawScore, rawAcoes] = await Promise.all([
    safe(`/score/v3/pf/credito/${cpf}?idFinalidade=${FINALIDADE}`, 'score'),
    safe(`/score/v3/pf/acoes/${cpf}?idFinalidade=${FINALIDADE}`,   'acoes'),
  ])

  // Debita só depois do retorno da API, para falha externa não comer saldo.
  if (!isAdmin) {
    await debitarSaldoProduto(svc, {
      email, tenantId: perfil?.tenant_id ?? null, valor: custo, produto: 'credito',
    })
  }

  // Extrair score
  const sc = rawScore?.resposta?.score ?? {}
  const pontos = sc?.pontos ?? sc?.pontuacao ?? sc?.valor ?? null
  const rd = rawScore?.resposta?.registrosDebitos ?? {}
  const negativacoes: any[] = Array.isArray(rd?.list ?? rd?.lista) ? (rd?.list ?? rd?.lista) : []
  const pp = rawScore?.resposta?.protestosPublicos ?? {}
  const rp = rawScore?.resposta?.rendaPresumida ?? {}

  const score = {
    score:             pontos,
    pontuacao:         pontos,
    faixa:             sc?.faixa ?? sc?.classificacao ?? null,
    negativacoes,
    totalDebitos:      rd?.qtdDebitos ?? rd?.quantidade ?? negativacoes.length,
    valorTotalDebitos: rd?.valorTotal ?? rd?.valor ?? 0,
    rendaPresumida:    rp?.valor ?? rp?.faixaRenda ?? null,
    faixaRenda:        rp?.faixaRenda ?? rp?.descricao ?? null,
  }

  const protestos = {
    total:              pp?.qtdProtestos ?? 0,
    lista:              Array.isArray(pp?.list ?? pp?.lista) ? (pp?.list ?? pp?.lista) : [],
    valorTotal:         pp?.valorTotal ?? null,
    primeiraOcorrencia: pp?.primeiraOcorrencia ?? null,
    ultimaOcorrencia:   pp?.ultimaOcorrencia ?? null,
  }

  // Extrair processos (ações)
  const ac = rawAcoes?.resposta?.acoes ?? {}
  const processos = {
    total:    ac?.qtdAcoes ?? ac?.quantidade ?? ac?.total ?? 0,
    lista:    ac?.acoes ?? ac?.lista ?? [],
  }

  const resultado = { cpf, score, protestos, processos, erros }
  await salvarConsulta({ email, tipo: 'credito_cpf', documento: cpf, descricao: `Crédito CPF ${cpf}`, resultado }).catch(() => null)

  return NextResponse.json({ ...resultado })
}
