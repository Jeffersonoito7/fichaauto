import { NextRequest, NextResponse } from 'next/server'
import { getAuthEmail, salvarConsulta, registrarAuditoria } from '@/lib/consulta-helper'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { buscarProcessosProprietario } from '@/lib/providers/datajud'
import { consultarSancoesCpf } from '@/lib/providers/sancoes-gov'
import { PRECO } from '@/lib/products'

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

  // as any: Supabase precisa de tipos gerados (supabase gen types) para inferência de select()
  const svc = createServiceRoleClient() as any
  const { data: perfil } = await svc.from('perfis').select('saldo_cpf, role, pode_cpf').eq('email', email).maybeSingle()
  const isAdmin = perfil?.role === 'super_admin' || email === process.env.ADMIN_EMAIL
  if (!isAdmin && !perfil?.pode_cpf) return NextResponse.json({ error: 'Sem permissão para consulta de CPF.' }, { status: 403 })
  const saldo = parseFloat(perfil?.saldo_cpf ?? '0')
  const custo = PRECO.cpf
  if (!isAdmin && saldo < custo) return NextResponse.json({ error: `Saldo insuficiente. Esta consulta custa R$ ${custo.toFixed(2).replace('.', ',')}. Recarregue sua carteira.` }, { status: 402 })

  const erros: string[] = []
  const safe = async (path: string, nome: string) => {
    try { return await assertivaGet(path) }
    catch (e: any) { erros.push(`${nome}: ${e.message}`); return null }
  }

  // ── 5 chamadas únicas à Assertiva (antes eram 12) ──────────────────────────
  // mais-telefones removido: retorna 400 (não contratado) e telefones já
  // vêm completos no localize principal (resposta.telefones.moveis/fixos)
  // 2 chamadas Assertiva: localize + relacionamentos
  // Score/SPC/Serasa e histórico de veículos são produtos separados
  const [
    rawLocalize,  // /localize/v3/cpf → basico + enderecos + emails + societario + telefones
    rawRel,       // /localize/v3/pessoas-de-referencia → relacionamentos
  ] = await Promise.all([
    safe(`/localize/v3/cpf?cpf=${cpf}&idFinalidade=${FINALIDADE}`,                   'localize'),
    safe(`/localize/v3/pessoas-de-referencia?cpf=${cpf}&idFinalidade=${FINALIDADE}`, 'relacionamentos'),
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

  // Detecta falecido: Assertiva pode retornar campo booleano ou na situação
  const falecidoBool = cad.falecido === true || cad.obito === true || cad.indicioObito === true
  const falecidoSit  = typeof sitCpf === 'string' && (
    sitCpf.toUpperCase().includes('FALEC') ||
    sitCpf.toUpperCase().includes('OBITO') ||
    sitCpf.toUpperCase().includes('ÓBITO')
  )

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
    // Campos de óbito — adicionados pela Assertiva
    falecido:       falecidoBool || falecidoSit,
    obito:          cad.obito     ?? null,
    indicioObito:   cad.indicioObito ?? null,
    dataObito:      cad.dataObito ?? cad.dataFalecimento ?? null,
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

  // ── Extrair relacionamentos ───────────────────────────────────────────────
  const relArr = rawRel?.resposta?.pessoasDeReferencia ?? rawRel?.resposta?.relacionamentos ?? []
  const relacionamentos = {
    lista: Array.isArray(relArr) ? relArr : [],
    pessoasDeReferencia: Array.isArray(relArr) ? relArr : [],
    resposta: rawRel?.resposta,
  }

  // DataJud + Sanções Gov (TCU, CEIS, CNEP) — todos gratuitos, paralelo
  const nomeParaDatajud = basico?.nome ?? ''
  const [datajud, sancoes] = await Promise.all([
    nomeParaDatajud.length >= 5
      ? buscarProcessosProprietario(nomeParaDatajud).catch(() => null)
      : Promise.resolve(null),
    consultarSancoesCpf(cpf),
  ])

  const resultado = { cpf, basico, enderecos, telefones, pep: null, societario, relacionamentos, datajud, sancoes, erros }
  const descricao = basico?.nome ?? ''

  // Debitar somente após retorno da API (evita perda de saldo em falha externa)
  if (!isAdmin) await svc.from('perfis').update({ saldo_cpf: parseFloat((saldo - custo).toFixed(2)), atualizado_em: new Date().toISOString() }).eq('email', email)

  const saved = await salvarConsulta({ email, tipo: 'cpf', documento: cpf, descricao, resultado })
  registrarAuditoria({ email, acao: 'consulta_cpf', documento: cpf, custo: isAdmin ? 0 : custo })

  return NextResponse.json({ ...resultado, token: saved?.token ?? null })
}
