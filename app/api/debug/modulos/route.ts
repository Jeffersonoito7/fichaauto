import { NextRequest, NextResponse } from 'next/server'

const BASE_URL   = 'https://api.assertivasolucoes.com.br'
const TOKEN_URL  = 'https://api.assertivasolucoes.com.br/oauth2/v3/token'
const FINALIDADE = 2

async function getToken() {
  const basic = Buffer.from(
    `${process.env.ASSERTIVA_LOGIN ?? ''}:${process.env.ASSERTIVA_PASSWORD ?? ''}`
  ).toString('base64')
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Authorization': `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Token error ${res.status}: ${await res.text()}`)
  const j = await res.json()
  return j.access_token ?? j.token
}

async function testar(token: string, path: string): Promise<{ status: number; ok: boolean; resumo: string; raw?: any }> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    const body = await res.json().catch(() => null)
    const ok = res.status === 200
    const resumo = ok
      ? `OK — ${JSON.stringify(body)?.slice(0, 120)}`
      : `ERRO ${res.status} — ${JSON.stringify(body)?.slice(0, 120)}`
    return { status: res.status, ok, resumo, raw: ok ? body : undefined }
  } catch (e: any) {
    return { status: 0, ok: false, resumo: `EXCEÇÃO: ${e.message}` }
  }
}

export async function GET(req: NextRequest) {
  const placa = (req.nextUrl.searchParams.get('placa') ?? 'BRA2E19').replace(/[^A-Z0-9]/gi, '').toUpperCase()
  const cpf   = (req.nextUrl.searchParams.get('cpf')   ?? '02625410337').replace(/\D/g, '')
  const cnpj  = (req.nextUrl.searchParams.get('cnpj')  ?? '').replace(/\D/g, '')

  let token: string
  try { token = await getToken() }
  catch (e: any) { return NextResponse.json({ erro: `Falha no token: ${e.message}` }, { status: 500 }) }

  // 1. Consulta-base da placa para obter protocolo
  const baseRes = await testar(token, `/veiculos/v3/consulta-base?tipo=placa&documento=${placa}&idFinalidade=${FINALIDADE}`)
  const protocolo = baseRes.raw?.cabecalho?.protocolo ?? ''

  const veiculosModulos = [
    { nome: 'Identificação (consulta-base)',       endpoint: `/veiculos/v3/consulta-base?tipo=placa&documento=${placa}&idFinalidade=${FINALIDADE}` },
    { nome: 'BIN Federal (roubo/furto/RENAJUD)',   endpoint: `/veiculos/v3/demais-consultas?tipo=placa&documento=${placa}&consulta=binfederal&protocolo=${protocolo}&idFinalidade=${FINALIDADE}` },
    { nome: 'Indício de Sinistro',                  endpoint: `/veiculos/v3/demais-consultas?tipo=placa&documento=${placa}&consulta=indiciosinistro&protocolo=${protocolo}&idFinalidade=${FINALIDADE}` },
    { nome: 'Gravame',                              endpoint: `/veiculos/v3/demais-consultas?tipo=placa&documento=${placa}&consulta=gravame&protocolo=${protocolo}&idFinalidade=${FINALIDADE}` },
    { nome: 'Histórico de Leilão',                  endpoint: `/veiculos/v3/demais-consultas?tipo=placa&documento=${placa}&consulta=historicoleilao&protocolo=${protocolo}&idFinalidade=${FINALIDADE}` },
    { nome: 'BIN Estadual (restrições estaduais)',  endpoint: `/veiculos/v3/demais-consultas?tipo=placa&documento=${placa}&consulta=binestadual&protocolo=${protocolo}&idFinalidade=${FINALIDADE}` },
    { nome: 'Precificador (FIPE + valor mercado)',  endpoint: `/veiculos/v3/demais-consultas?tipo=placa&documento=${placa}&consulta=precificador&protocolo=${protocolo}&idFinalidade=${FINALIDADE}` },
    { nome: 'Histórico Veículos por CPF',           endpoint: `/veiculos/v3/historico-veiculos?documento=${cpf}&idFinalidade=${FINALIDADE}` },
    { nome: 'Decodificador de Chassi (por chassi)', endpoint: `/veiculos/v3/consulta-base?tipo=chassi&documento=9BFXTNSM9RDB57348&idFinalidade=${FINALIDADE}` },
  ]

  const cpfModulos = [
    { nome: 'Localize CPF (cadastro básico)',        endpoint: `/localize/v3/cpf?cpf=${cpf}&idFinalidade=${FINALIDADE}` },
    { nome: 'Mais Telefones CPF',                    endpoint: `/localize/v3/mais-telefones?cpf=${cpf}&idFinalidade=${FINALIDADE}` },
    { nome: 'Score Crédito PF',                      endpoint: `/score/v3/pf/credito/${cpf}` },
    { nome: 'Ações/Processos PF',                    endpoint: `/score/v3/pf/acoes/${cpf}` },
    { nome: 'Mix PF (societário/participações)',     endpoint: `/mix-v3/pf/${cpf}?idFinalidade=${FINALIDADE}&opcoes=PARTICIPACOES` },
    { nome: 'Pessoas de Referência (relacionamentos)',endpoint: `/localize/v3/pessoas-de-referencia?cpf=${cpf}&idFinalidade=${FINALIDADE}` },
  ]

  const cnpjModulos = cnpj ? [
    { nome: 'Localize CNPJ (cadastro)',             endpoint: `/localize/v3/cnpj?cnpj=${cnpj}&idFinalidade=${FINALIDADE}` },
    { nome: 'Score Crédito PJ',                     endpoint: `/score/v3/pj/credito/${cnpj}` },
    { nome: 'Ações/Processos PJ',                   endpoint: `/score/v3/pj/acoes/${cnpj}` },
  ] : []

  const resultados: Record<string, any> = {
    credenciais: {
      login: (process.env.ASSERTIVA_LOGIN ?? '').slice(0, 10) + '...',
      tokenOk: true,
      protocolo: protocolo || '(não obtido — base falhou)',
    },
    veiculos:    {} as Record<string, any>,
    cpf:         {} as Record<string, any>,
    cnpj:        {} as Record<string, any>,
  }

  for (const m of veiculosModulos) {
    const r = await testar(token, m.endpoint)
    resultados.veiculos[m.nome] = { ok: r.ok, status: r.status, resumo: r.resumo }
  }

  for (const m of cpfModulos) {
    const r = await testar(token, m.endpoint)
    resultados.cpf[m.nome] = { ok: r.ok, status: r.status, resumo: r.resumo }
  }

  for (const m of cnpjModulos) {
    const r = await testar(token, m.endpoint)
    resultados.cnpj[m.nome] = { ok: r.ok, status: r.status, resumo: r.resumo }
  }

  // Resumo simples
  const todasEntradas = [
    ...Object.entries(resultados.veiculos),
    ...Object.entries(resultados.cpf),
    ...Object.entries(resultados.cnpj),
  ]
  resultados.resumo = {
    total:        todasEntradas.length,
    contratados:  todasEntradas.filter(([, v]: any) => v.ok).length,
    naoContratados: todasEntradas.filter(([, v]: any) => !v.ok && v.status === 403).length,
    comErro:      todasEntradas.filter(([, v]: any) => !v.ok && v.status !== 403).length,
    lista: todasEntradas.map(([nome, v]: any) => ({
      modulo: nome,
      status: v.ok ? 'CONTRATADO' : v.status === 403 ? 'NAO_CONTRATADO' : v.status === 404 ? 'NAO_ENCONTRADO' : `ERRO_${v.status}`,
    }))
  }

  return NextResponse.json(resultados, { status: 200 })
}
