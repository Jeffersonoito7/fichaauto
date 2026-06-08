import { NextRequest, NextResponse } from 'next/server'
import { getAuthEmail, salvarConsulta } from '@/lib/consulta-helper'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { CREDITO } from '@/lib/products'

const BASE_URL   = 'https://api.assertivasolucoes.com.br'
const TOKEN_URL  = 'https://api.assertivasolucoes.com.br/oauth2/v3/token'
const FINALIDADE = 2

let _token: string | null = null
let _tokenExpiry = 0

async function getToken(): Promise<string> {
  if (_token && Date.now() < _tokenExpiry) return _token
  const basic = Buffer.from(
    `${process.env.ASSERTIVA_LOGIN ?? ''}:${process.env.ASSERTIVA_PASSWORD ?? ''}`
  ).toString('base64')
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Authorization': `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Token error ${res.status}`)
  const json = await res.json()
  _token = json.access_token ?? json.token
  _tokenExpiry = Date.now() + (json.expires_in ?? 3600) * 1000 - 300_000
  return _token!
}

async function assertivaGet(path: string) {
  const token = await getToken()
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Assertiva ${path} erro ${res.status}`)
  return res.json()
}

function limpaCnpj(c: string) { return c.replace(/\D/g, '') }

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ cnpj: string }> }
) {
  const { cnpj: cnpjParam } = await context.params
  const cnpj = limpaCnpj(cnpjParam)

  if (cnpj.length !== 14) {
    return NextResponse.json({ error: 'CNPJ inválido' }, { status: 400 })
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
      error: `Sem créditos disponíveis. Adquira o pack de R$ ${CREDITO.packValor.toFixed(2).replace('.', ',')} (${CREDITO.packQtd} consultas) ou avulso por R$ ${CREDITO.avulsoCnpj.toFixed(2).replace('.', ',')}.`
    }, { status: 402 })
  }

  if (!isAdmin) {
    await svc.from('perfis')
      .update({ creditos_credito: creditos - 1, atualizado_em: new Date().toISOString() })
      .eq('email', email)
  }

  const erros: string[] = []
  const safe = async (path: string, nome: string) => {
    try { return await assertivaGet(path) }
    catch (e: any) { erros.push(`${nome}: ${e.message}`); return null }
  }

  const [rawScore, rawAcoes] = await Promise.all([
    safe(`/score/v3/pj/credito/${cnpj}?idFinalidade=${FINALIDADE}`, 'score'),
    safe(`/score/v3/pj/acoes/${cnpj}?idFinalidade=${FINALIDADE}`,   'acoes'),
  ])

  const sc = rawScore?.resposta?.score ?? {}
  const pontos = sc?.pontuacao ?? sc?.pontos ?? sc?.valor ?? null
  const rd = rawScore?.resposta?.registrosDebitos ?? {}
  const negativacoes: any[] = Array.isArray(rd?.list ?? rd?.lista ?? rd?.registros) ? (rd?.list ?? rd?.lista ?? rd?.registros) : []
  const pp = rawScore?.resposta?.protestosPublicos ?? {}

  const score = {
    score:             pontos,
    pontuacao:         pontos,
    faixa:             sc?.faixa ?? sc?.classificacao ?? null,
    negativacoes,
    totalDebitos:      rd?.qtdDebitos ?? rd?.quantidade ?? negativacoes.length,
    valorTotalDebitos: rd?.valorTotal ?? rd?.valor ?? 0,
  }

  const protestos = {
    total:              pp?.qtdProtestos ?? pp?.sumQuantidade ?? 0,
    lista:              Array.isArray(pp?.list ?? pp?.lista) ? (pp?.list ?? pp?.lista) : [],
    valorTotal:         pp?.valorTotal ?? null,
    primeiraOcorrencia: pp?.primeiraOcorrencia ?? null,
    ultimaOcorrencia:   pp?.ultimaOcorrencia ?? null,
  }

  const ac = rawAcoes?.resposta?.acoes ?? {}
  const processos = {
    total: ac?.qtdAcoes ?? ac?.quantidade ?? ac?.total ?? 0,
    lista: ac?.acoes ?? ac?.lista ?? [],
  }

  const resultado = { cnpj, score, protestos, processos, erros }
  await salvarConsulta({ email, tipo: 'cnpj', documento: cnpj, descricao: `Crédito CNPJ ${cnpj}`, resultado }).catch(() => null)

  return NextResponse.json({ ...resultado })
}
