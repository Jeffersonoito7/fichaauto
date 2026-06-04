import { NextRequest, NextResponse } from 'next/server'

const BASE_URL  = 'https://api.assertivasolucoes.com.br'
const TOKEN_URL = 'https://api.assertivasolucoes.com.br/oauth2/v3/token'
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
  const j = await res.json()
  return j.access_token ?? j.token
}

async function get(path: string) {
  const token = await getToken()
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  return { status: res.status, data: await res.json().catch(() => null) }
}

export async function GET(req: NextRequest) {
  const cpf = req.nextUrl.searchParams.get('cpf')?.replace(/\D/g, '') ?? ''
  if (cpf.length !== 11) return NextResponse.json({ erro: 'CPF inválido — passe ?cpf=...' })

  const [localize, score, acoes] = await Promise.allSettled([
    get(`/localize/v3/cpf?cpf=${cpf}&idFinalidade=${FINALIDADE}`),
    get(`/score/v3/pf/credito/${cpf}`),
    get(`/score/v3/pf/acoes/${cpf}`),
  ])

  return NextResponse.json({
    cpf,
    localize: localize.status === 'fulfilled' ? localize.value : { erro: (localize as any).reason?.message },
    score:    score.status    === 'fulfilled' ? score.value    : { erro: (score as any).reason?.message },
    acoes:    acoes.status    === 'fulfilled' ? acoes.value    : { erro: (acoes as any).reason?.message },
    // Extração tentada com paths atuais — para diagnóstico
    _extraido: {
      nome_cab:  null, // preenchido abaixo
      caminhos_testados: [
        'cabecalho.nome',
        'cabecalho.nomeCompleto',
        'resposta.nome',
        'resposta.nomeCompleto',
        'resposta.dadosCadastrais.nome',
        'resposta.ocorrencias.cadastro.nome',
        'resposta.cadastro.nome',
        'resposta.identificacao.nome',
      ],
    },
  })
}
