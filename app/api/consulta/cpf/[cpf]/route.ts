import { NextRequest, NextResponse } from 'next/server'
import { getAuthEmail, salvarConsulta } from '@/lib/consulta-helper'
import { createServiceRoleClient } from '@/lib/supabase-server'

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

function limpa(c: string) { return c.replace(/\D/g, '') }

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ cpf: string }> }
) {
  const { cpf: cpfParam } = await context.params
  const cpf = limpa(cpfParam)

  if (cpf.length !== 11) {
    return NextResponse.json({ error: 'CPF inválido' }, { status: 400 })
  }

  const email = await getAuthEmail()
  if (!email) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const svc = createServiceRoleClient() as any
  const { data: perfil } = await svc.from('perfis').select('saldo_consultas, role').eq('email', email).maybeSingle()
  const isAdmin = perfil?.role === 'super_admin' || email === process.env.ADMIN_EMAIL
  const saldo = perfil?.saldo_consultas ?? 0
  if (!isAdmin && saldo <= 0) return NextResponse.json({ error: 'Saldo insuficiente.' }, { status: 402 })
  if (!isAdmin) await svc.from('perfis').update({ saldo_consultas: saldo - 1, atualizado_em: new Date().toISOString() }).eq('email', email)

  const erros: string[] = []
  const safe = async (path: string, nome: string) => {
    try { return await assertivaGet(path) }
    catch (e: any) { erros.push(`${nome}: ${e.message}`); return null }
  }

  // ── 5 chamadas únicas à Assertiva (antes eram 12) ──────────────────────────
  // mais-telefones removido: retorna 400 (não contratado) e telefones já
  // vêm completos no localize principal (resposta.telefones.moveis/fixos)
  const [
    rawLocalize,    // /localize/v3/cpf      → basico + enderecos + emails + societario + telefones
    rawScore,       // /score/v3/pf/credito/ → score + negativacoes + protestos + renda
    rawAcoes,       // /score/v3/pf/acoes/   → processos
    rawRel,         // /localize/v3/pessoas-de-referencia → relacionamentos
    rawVeiculos,    // /veiculos/v3/historico-veiculos → veículos por CPF
  ] = await Promise.all([
    safe(`/localize/v3/cpf?cpf=${cpf}&idFinalidade=${FINALIDADE}`,                     'localize'),
    safe(`/score/v3/pf/credito/${cpf}?idFinalidade=${FINALIDADE}`,                     'score'),
    safe(`/score/v3/pf/acoes/${cpf}?idFinalidade=${FINALIDADE}`,                       'acoes'),
    safe(`/localize/v3/pessoas-de-referencia?cpf=${cpf}&idFinalidade=${FINALIDADE}`,   'relacionamentos'),
    safe(`/veiculos/v3/historico-veiculos?documento=${cpf}&idFinalidade=${FINALIDADE}`, 'veiculos'),
  ])

  // ── Extrair dados do /localize/v3/cpf ─────────────────────────────────────
  const resp  = rawLocalize?.resposta ?? {}
  const cad   = resp.dadosCadastrais ?? {}
  const sitCpf = cad.situacaoCadastral ?? cad.situacao ?? null

  const todosTels: any[] = [
    ...(Array.isArray(resp.telefones?.moveis) ? resp.telefones.moveis : []),
    ...(Array.isArray(resp.telefones?.fixos)  ? resp.telefones.fixos  : []),
  ]

  const emailsArr: any[] = Array.isArray(resp.emails) ? resp.emails : []
  const endsArr: any[]   = Array.isArray(resp.enderecos) ? resp.enderecos : []
  const end0 = endsArr[0] ?? {}

  const basico = rawLocalize ? {
    nome:           cad.nome,
    nomeCompleto:   cad.nome,
    situacaoCpf:    sitCpf,
    situacao:       sitCpf,
    dataNascimento: cad.dataNascimento,
    idade:          cad.idade,
    sexo:           cad.sexo,
    nomeMae:        cad.maeNome ?? cad.nomeMae,
    nomePai:        cad.nomePai,
    telefone:       todosTels[0]?.numero,
    telefones:      todosTels,
    email:          emailsArr[0]?.email ?? emailsArr[0]?.enderecoEmail,
    emails:         emailsArr,
    logradouro:     end0.logradouro,
    numero:         end0.numero,
    bairro:         end0.bairro,
    municipio:      end0.cidade ?? end0.municipio,
    uf:             end0.uf,
    cep:            end0.cep,
  } : null

  const enderecos = rawLocalize ? { enderecos: endsArr, lista: endsArr } : null
  const telefones = rawLocalize ? { telefones: todosTels, lista: todosTels } : null
  const societario = rawLocalize ? {
    empresas: Array.isArray(resp.participacoesEmpresas) ? resp.participacoesEmpresas : [],
    lista:    Array.isArray(resp.participacoesEmpresas) ? resp.participacoesEmpresas : [],
  } : null

  // ── Extrair dados do /score/v3/pf/credito ─────────────────────────────────
  const sc  = rawScore?.resposta?.score ?? {}
  const pontos = sc?.pontos ?? sc?.pontuacao ?? sc?.valor ?? null
  const rd  = rawScore?.resposta?.registrosDebitos ?? {}
  const negativacoes: any[] = Array.isArray(rd?.list ?? rd?.lista) ? (rd?.list ?? rd?.lista) : []
  const pp  = rawScore?.resposta?.protestosPublicos ?? {}
  const rp  = rawScore?.resposta?.rendaPresumida ?? {}
  const rendaVal = rp?.valor ?? rp?.faixaRenda ?? rp?.renda ?? null

  const score = rawScore ? {
    score:             pontos,
    pontuacao:         pontos,
    faixa:             sc?.faixa,
    negativacoes,
    totalDebitos:      rd?.qtdDebitos ?? rd?.quantidade ?? negativacoes.length,
    valorTotalDebitos: rd?.valorTotal ?? rd?.valor ?? 0,
    rendaPresumida:    rendaVal,
    faixaRenda:        rp?.faixaRenda ?? rp?.descricao,
  } : null

  const protestos = {
    total:              pp?.qtdProtestos ?? 0,
    quantidade:         pp?.qtdProtestos ?? 0,
    lista:              Array.isArray(pp?.list ?? pp?.lista) ? (pp?.list ?? pp?.lista) : [],
    valorTotal:         pp?.valorTotal ?? null,
    primeiraOcorrencia: pp?.primeiraOcorrencia ?? null,
    ultimaOcorrencia:   pp?.ultimaOcorrencia ?? null,
  }

  const renda = rawScore ? {
    renda:          rendaVal,
    valor:          rendaVal,
    rendaPresumida: rendaVal,
    faixaRenda:     rp?.faixaRenda ?? rp?.descricao,
  } : null

  // ── Extrair processos do /score/v3/pf/acoes ───────────────────────────────
  const ac  = rawAcoes?.resposta?.acoes ?? {}
  const qtdProc = ac?.qtdAcoes ?? ac?.quantidade ?? ac?.total ?? 0
  const processos = { total: qtdProc, quantidade: qtdProc, lista: ac?.acoes ?? ac?.lista ?? [] }

  // ── Extrair relacionamentos ───────────────────────────────────────────────
  const relArr = rawRel?.resposta?.pessoasDeReferencia ?? rawRel?.resposta?.relacionamentos ?? []
  const relacionamentos = {
    lista: Array.isArray(relArr) ? relArr : [],
    pessoasDeReferencia: Array.isArray(relArr) ? relArr : [],
    resposta: rawRel?.resposta,
  }

  // ── Extrair veículos ──────────────────────────────────────────────────────
  const veicArr = rawVeiculos?.resposta?.veiculos ?? rawVeiculos?.resposta?.historico ?? rawVeiculos?.resposta?.lista ?? []
  const veiculos = {
    veiculos: Array.isArray(veicArr) ? veicArr : [],
    lista:    Array.isArray(veicArr) ? veicArr : [],
    historico: Array.isArray(veicArr) ? veicArr : [],
    resposta: rawVeiculos?.resposta,
  }

  const resultado = { cpf, basico, score, processos, protestos, enderecos, telefones, renda, pep: null, societario, relacionamentos, veiculos, erros }
  const descricao = basico?.nome ?? ''

  const saved = await salvarConsulta({ email, tipo: 'cpf', documento: cpf, descricao, resultado })

  return NextResponse.json({ ...resultado, token: saved?.token ?? null })
}
