import { NextRequest, NextResponse } from 'next/server'

const ASSERT_BASE = 'https://api.assertivasolucoes.com.br'
const TOKEN_URL   = 'https://api.assertivasolucoes.com.br/oauth2/v3/token'
const BRASIL_BASE = 'https://brasilapi.com.br/api'

let _token: string | null = null
let _exp = 0

async function getAssertToken() {
  if (_token && Date.now() < _exp) return _token
  const basic = Buffer.from(
    `${process.env.ASSERTIVA_LOGIN ?? ''}:${process.env.ASSERTIVA_PASSWORD ?? ''}`
  ).toString('base64')
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  })
  const j = await res.json()
  _token = j.access_token ?? j.token
  _exp   = Date.now() + ((j.expires_in ?? 3600) * 1000) - 300_000
  return _token!
}

async function assertGet(path: string) {
  const token = await getAssertToken()
  const res = await fetch(`${ASSERT_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Assertiva ${res.status}`)
  return res.json()
}

async function getFipePorCodigo(codigo: string) {
  try {
    const res = await fetch(`${BRASIL_BASE}/fipe/preco/v1/${codigo}`, {
      next: { revalidate: 86400 },
    })
    if (!res.ok) return null
    const arr = await res.json()
    return Array.isArray(arr) ? arr[0] : arr
  } catch {
    return null
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ placa: string }> }
) {
  const { placa: placaRaw } = await params
  const placa = placaRaw.replace(/[^A-Za-z0-9]/g, '').toUpperCase()

  try {
    // Consulta base Assertiva — apenas para identificação do veículo
    const base = await assertGet(
      `/veiculos/v3/consulta-base?tipo=placa&documento=${placa}&idFinalidade=2`
    )
    const cab  = base?.cabecalho ?? {}
    const resp = base?.resposta  ?? {}
    const desc = resp?.descricao ?? resp?.dadosCadastrais ?? resp?.identificacao ?? resp ?? {}

    const marca       = cab?.marca       ?? desc?.marca       ?? null
    const modelo      = cab?.modelo      ?? desc?.modelo      ?? null
    const anoFab      = cab?.anoFabricacao ?? desc?.anoFabricacao ?? null
    const anoMod      = cab?.anoModelo   ?? desc?.anoModelo   ?? null
    const cor         = cab?.cor         ?? desc?.cor         ?? null
    const combustivel = cab?.combustivel ?? desc?.combustivel ?? null
    const renavam     = cab?.renavam     ?? desc?.renavam     ?? null
    const chassi      = cab?.chassi      ?? desc?.chassi      ?? null

    // Tenta obter valor FIPE grátis via BrasilAPI com o código FIPE do veículo
    const codigoFipe = desc?.codigoFipe ?? cab?.codigoFipe ?? desc?.codigo ?? null
    let valorFipe    = null
    let mesReferencia = null

    if (codigoFipe) {
      const fipe = await getFipePorCodigo(codigoFipe)
      if (fipe) {
        valorFipe    = fipe.value  ?? fipe.preco ?? fipe.price ?? null
        mesReferencia = fipe.referenceMonth ?? fipe.mesReferencia ?? null
      }
    }

    return NextResponse.json({
      placa, marca, modelo, anoFab, anoMod, cor, combustivel, renavam, chassi,
      valorFipe,
      valorMercado:  null,
      codigoFipe,
      mesReferencia,
      fonte: codigoFipe ? 'brasilapi' : 'assertiva',
    })
  } catch {
    return NextResponse.json({ erro: 'Consulta FIPE indisponível', placa }, { status: 200 })
  }
}
