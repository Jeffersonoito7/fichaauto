import { NextRequest, NextResponse } from 'next/server'
import { getAuthEmail, salvarConsulta } from '@/lib/consulta-helper'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { getCnpj } from '@/lib/providers/brasilapi'
import { consultarSancoesCnpj } from '@/lib/providers/sancoes-gov'
import { PRECO } from '@/lib/products'

const BASE_URL  = 'https://api.assertivasolucoes.com.br'
const TOKEN_URL = 'https://api.assertivasolucoes.com.br/oauth2/v3/token'
const FINALIDADE = 2

let _token: string | null = null
let _tokenExpiry = 0

async function getToken(): Promise<string> {
  if (_token && Date.now() < _tokenExpiry) return _token
  const basic = Buffer.from(`${process.env.ASSERTIVA_LOGIN ?? ''}:${process.env.ASSERTIVA_PASSWORD ?? ''}`).toString('base64')
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

async function basicoFallback(cnpj: string) {
  const d = await getCnpj(cnpj)
  if (!d) return null
  return {
    razaoSocial:       d.razao_social,
    nome:              d.razao_social,
    nomeFantasia:      d.nome_fantasia,
    situacaoCadastral: d.descricao_situacao_cadastral,
    situacao:          d.descricao_situacao_cadastral,
    dataAbertura:      d.data_inicio_atividade,
    cnae:              d.cnae_fiscal_descricao,
    cnaePrincipal:     d.cnae_fiscal_descricao,
    naturezaJuridica:  d.natureza_juridica,
    porte:             d.porte,
    capitalSocial:     d.capital_social,
    logradouro:        d.logradouro,
    numero:            d.numero,
    bairro:            d.bairro,
    municipio:         d.municipio,
    uf:                d.uf,
    cep:               d.cep,
    email:             d.email,
    telefone:          d.ddd_telefone_1,
    optanteSimples:    d.opcao_pelo_simples,
    _fonte:            'BrasilAPI',
  }
}

async function qsaFallback(cnpj: string) {
  const d = await getCnpj(cnpj)
  if (!d?.qsa?.length) return null
  return {
    socios: d.qsa.map((s: any) => ({
      nome:          s.nome_socio,
      qualificacao:  s.qualificacao_socio,
      cpf:           s.cpf_cnpj_socio,
    })),
    lista: d.qsa,
  }
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ cnpj: string }> }
) {
  const { cnpj: cnpjParam } = await context.params
  const cnpj = limpaCnpj(cnpjParam)

  if (cnpj.length !== 14) {
    return NextResponse.json({ error: 'CNPJ inválido' }, { status: 400 })
  }

  // Auth
  const email = await getAuthEmail()
  if (!email) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const svc = createServiceRoleClient() as any
  const { data: perfil } = await svc.from('perfis').select('saldo_cpf, role').eq('email', email).maybeSingle()
  const isAdmin = perfil?.role === 'super_admin' || email === process.env.ADMIN_EMAIL
  const saldo = parseFloat(perfil?.saldo_cpf ?? '0')
  const custo = PRECO.cnpj
  if (!isAdmin && saldo < custo) return NextResponse.json({ error: `Saldo insuficiente. Esta consulta custa R$ ${custo.toFixed(2).replace('.', ',')}. Recarregue sua carteira.` }, { status: 402 })

  const erros: string[] = []
  const avisos: string[] = []

  // Score/SPC/Serasa é produto separado — apenas localize aqui
  const [rawLocalize] = await Promise.all([
    assertivaGet(`/localize/v3/cnpj?cnpj=${cnpj}&idFinalidade=${FINALIDADE}`).catch((e: any) => { erros.push(`localize: ${e.message}`); return null }),
  ])

  // Extrair basico do localize
  // Assertiva v3 CNPJ: dados em resposta.dadosCadastrais (não em ocorrencias.cadastro)
  const resp  = rawLocalize?.resposta ?? {}
  const cad   = resp.dadosCadastrais ?? resp.ocorrencias?.cadastro ?? resp.cadastro ?? {}
  const telsR = resp.telefones ?? resp.ocorrencias?.telefones ?? {}
  const tels: any[] = Array.isArray(telsR)
    ? telsR
    : [...(Array.isArray(telsR?.moveis) ? telsR.moveis : []), ...(Array.isArray(telsR?.fixos) ? telsR.fixos : [])]
  const mails: any[] = Array.isArray(resp.emails ?? resp.ocorrencias?.emails) ? (resp.emails ?? resp.ocorrencias?.emails) : []
  const endsArr: any[] = Array.isArray(resp.enderecos ?? resp.ocorrencias?.enderecos) ? (resp.enderecos ?? resp.ocorrencias?.enderecos) : []
  const end0 = endsArr[0] ?? {}
  const razaoSocial = cad?.razaoSocial ?? cad?.nome ?? null
  const basico = rawLocalize ? {
    razaoSocial, nome: razaoSocial,
    nomeFantasia:     cad?.nomeFantasia ?? cad?.nomeEmpresa,
    situacaoCadastral: cad?.situacaoCadastral ?? cad?.situacao,
    situacao:         cad?.situacaoCadastral ?? cad?.situacao,
    dataAbertura:     cad?.dataAbertura ?? cad?.dataFundacao,
    cnae:             cad?.cnaeDescricao ?? cad?.cnae ?? cad?.cnaePrincipal,
    cnaePrincipal:    cad?.cnaeDescricao ?? cad?.cnae,
    naturezaJuridica: cad?.naturezaJuridica ?? cad?.tipo,
    porte:            cad?.porteEmpresa ?? cad?.porte,
    capitalSocial:    cad?.capitalSocial,
    optanteSimples:   cad?.optanteSimples ?? cad?.simplesNacional,
    logradouro:       end0?.logradouro ?? end0?.nomeLogradouro ?? cad?.logradouro,
    numero:           end0?.numero ?? end0?.numeroLogradouro ?? cad?.numero,
    bairro:           end0?.bairro ?? end0?.nomeBairro ?? cad?.bairro,
    municipio:        end0?.cidade ?? end0?.municipio ?? end0?.nomeMunicipio ?? cad?.municipio,
    uf:               end0?.uf ?? end0?.estado ?? end0?.siglaUf ?? cad?.uf,
    cep:              end0?.cep ?? cad?.cep,
    telefone:         cad?.telefone ?? (tels.length ? (tels[0]?.numero ?? '') : undefined),
    email:            cad?.email ?? (mails.length ? (mails[0]?.email ?? mails[0]?.enderecoEmail) : undefined),
  } : null

  // Extrair QSA do mesmo localize
  // Assertiva v3 CNPJ: sócios em resposta.socios com campos nomeOuRazaoSocial/documento/dataEntrada
  const rawSocios = resp.socios ?? resp.ocorrencias?.socios ?? resp.ocorrencias?.quadroSocietario ?? resp.quadroSocietario ?? []
  const sociosNorm = (Array.isArray(rawSocios) ? rawSocios : []).map((s: any) => ({
    nome:         s.nomeOuRazaoSocial ?? s.nome ?? s.nomePessoa ?? s.razaoSocial ?? '',
    cpf:          s.documento ?? s.cpf ?? s.cnpj ?? '',
    qualificacao: s.qualificacaoSocio ?? s.qualificacao ?? s.cargo ?? '',
    dataEntrada:  s.dataEntrada ?? s.dataEntrada ?? '',
  }))
  const qsa = { socios: sociosNorm, lista: sociosNorm }

  // Extrair relacionadas do mesmo localize
  const rawRel = resp.ocorrencias?.empresasRelacionadas ?? resp.empresasRelacionadas ?? []
  const relacionadas = { empresas: Array.isArray(rawRel) ? rawRel : [], lista: Array.isArray(rawRel) ? rawRel : [] }

  // Fallback BrasilAPI quando Assertiva não retornou dados básicos
  let basicoFinal = basico
  let qsaFinal = qsa
  if (!basico?.razaoSocial && !basico?.nome) {
    basicoFinal = await basicoFallback(cnpj).catch(() => null)
    if (basicoFinal) avisos.push('Dados básicos via BrasilAPI (Assertiva indisponível)')
  }
  if (!qsa?.socios?.length) {
    const fb = await qsaFallback(cnpj).catch(() => null)
    if (fb) { qsaFinal = fb; avisos.push('Quadro societário via BrasilAPI') }
  }

  const sancoes = await consultarSancoesCnpj(cnpj)

  const resultado = { cnpj, basico: basicoFinal, qsa: qsaFinal, relacionadas, sancoes, erros, avisos }

  // Debitar somente após retorno da API (evita perda de saldo em falha externa)
  if (!isAdmin) await svc.from('perfis').update({ saldo_cpf: parseFloat((saldo - custo).toFixed(2)), atualizado_em: new Date().toISOString() }).eq('email', email)

  const saved = await salvarConsulta({ email, tipo: 'cnpj', documento: cnpj, descricao: basicoFinal?.razaoSocial ?? cnpj, resultado }).catch(() => null)

  return NextResponse.json({ ...resultado, token: saved?.token ?? null })
}
