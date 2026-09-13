import { NextRequest, NextResponse } from 'next/server'
import { getAuthEmail, salvarConsulta } from '@/lib/consulta-helper'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { getToken } from '@/lib/providers/assertiva'
import { CREDITO } from '@/lib/products'

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
  _req: NextRequest,
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
    .select('creditos_credito, role, pode_credito')
    .eq('email', email)
    .maybeSingle()

  const isAdmin = perfil?.role === 'super_admin' || email === process.env.ADMIN_EMAIL
  if (!isAdmin && !perfil?.pode_credito) {
    return NextResponse.json({ error: 'Sem acesso ao produto Análise de Crédito.' }, { status: 403 })
  }

  const creditos = Number(perfil?.creditos_credito ?? 0)
  if (!isAdmin && creditos < 1) {
    return NextResponse.json({
      error: `Sem créditos disponíveis. Adquira o pack de R$ ${CREDITO.packValor.toFixed(2).replace('.', ',')} (${CREDITO.packQtd} consultas) ou avulso por R$ ${CREDITO.avulsoCpf.toFixed(2).replace('.', ',')}.`
    }, { status: 402 })
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

  if (!isAdmin) {
    await svc.from('perfis')
      .update({ creditos_credito: creditos - 1, atualizado_em: new Date().toISOString() })
      .eq('email', email)
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
  await salvarConsulta({ email, tipo: 'cpf', documento: cpf, descricao: `Crédito CPF ${cpf}`, resultado }).catch(() => null)

  return NextResponse.json({ ...resultado })
}
