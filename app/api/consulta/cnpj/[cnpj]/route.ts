import { NextRequest, NextResponse } from 'next/server'
import {
  consultarCnpjBasico, consultarQsaCnpj, consultarScoreCnpj,
  consultarProcessosCnpj, consultarProtestosCnpj, consultarRelacionadasCnpj,
} from '@/lib/providers/assertiva'
import { getCnpj } from '@/lib/providers/brasilapi'

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

  const erros: string[] = []
  const avisos: string[] = []

  const safe = async (fn: () => Promise<any>, nome: string) => {
    try { return await fn() }
    catch (e: any) { erros.push(`${nome}: ${e.message}`); return null }
  }

  const [basico, qsa, score, processos, protestos, relacionadas] =
    await Promise.all([
      safe(() => consultarCnpjBasico(cnpj),       'basico'),
      safe(() => consultarQsaCnpj(cnpj),           'qsa'),
      safe(() => consultarScoreCnpj(cnpj),         'score'),
      safe(() => consultarProcessosCnpj(cnpj),     'processos'),
      safe(() => consultarProtestosCnpj(cnpj),     'protestos'),
      safe(() => consultarRelacionadasCnpj(cnpj),  'relacionadas'),
    ])

  // Fallback BrasilAPI quando Assertiva não retornou dados básicos
  let basicoFinal = basico
  let qsaFinal    = qsa
  if (!basico?.razaoSocial && !basico?.nome) {
    basicoFinal = await basicoFallback(cnpj).catch(() => null)
    if (basicoFinal) avisos.push('Dados básicos via BrasilAPI (Assertiva indisponível)')
  }
  if (!qsa?.socios?.length && !qsa?.lista?.length) {
    qsaFinal = await qsaFallback(cnpj).catch(() => null)
    if (qsaFinal) avisos.push('Quadro societário via BrasilAPI')
  }

  return NextResponse.json({
    cnpj,
    basico:      basicoFinal,
    qsa:         qsaFinal,
    score,
    processos,
    protestos,
    relacionadas,
    erros,
    avisos,
  })
}
