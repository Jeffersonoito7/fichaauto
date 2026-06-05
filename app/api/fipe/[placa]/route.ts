import { NextRequest, NextResponse } from 'next/server'

const ASSERT_BASE  = 'https://api.assertivasolucoes.com.br'
const TOKEN_URL    = 'https://api.assertivasolucoes.com.br/oauth2/v3/token'

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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ placa: string }> }
) {
  const { placa: placaRaw } = await params
  const placa = placaRaw.replace(/[^A-Za-z0-9]/g, '').toUpperCase()

  try {
    // 1. Consulta base para obter protocolo + dados básicos do veículo
    const base = await assertGet(
      `/veiculos/v3/consulta-base?tipo=placa&documento=${placa}&idFinalidade=2`
    )
    const protocolo = base?.cabecalho?.protocolo
    const cab       = base?.cabecalho ?? {}
    const resp      = base?.resposta  ?? {}
    const desc      = resp?.descricao ?? resp?.dadosCadastrais ?? resp?.identificacao ?? resp ?? {}

    // Extrair dados de identificação do veículo
    const marca      = cab?.marca      ?? desc?.marca      ?? resp?.marca      ?? null
    const modelo     = cab?.modelo     ?? desc?.modelo     ?? resp?.modelo     ?? null
    const anoFab     = cab?.anoFabricacao ?? desc?.anoFabricacao ?? resp?.anoFabricacao ?? null
    const anoMod     = cab?.anoModelo  ?? desc?.anoModelo  ?? resp?.anoModelo  ?? null
    const cor        = cab?.cor        ?? desc?.cor        ?? resp?.cor        ?? null
    const combustivel = cab?.combustivel ?? desc?.combustivel ?? resp?.combustivel ?? null
    const renavam    = cab?.renavam    ?? desc?.renavam    ?? resp?.renavam    ?? null
    const chassi     = cab?.chassi     ?? desc?.chassi     ?? resp?.chassi     ?? null

    // 2. Precificador — requer protocolo
    let fipeData: any = {}
    if (protocolo) {
      try {
        fipeData = await assertGet(
          `/veiculos/v3/demais-consultas?tipo=placa&documento=${placa}&consulta=precificador&protocolo=${protocolo}&idFinalidade=2`
        )
      } catch { /* precificador pode não estar contratado */ }
    }

    const prec      = fipeData?.resposta ?? fipeData ?? {}
    const precObj   = prec?.precificador ?? prec?.fipe ?? prec ?? {}

    return NextResponse.json({
      placa,
      marca, modelo, anoFab, anoMod, cor, combustivel, renavam, chassi,
      valorFipe:     precObj?.valorFipe    ?? precObj?.valor   ?? prec?.valorFipe    ?? null,
      valorMercado:  precObj?.valorMercado ?? prec?.valorMercado ?? null,
      codigoFipe:    precObj?.codigoFipe   ?? precObj?.codigo  ?? null,
      mesReferencia: precObj?.referenciaFipe ?? precObj?.referencia ?? prec?.mesReferencia ?? null,
      fonte: 'assertiva',
    })
  } catch {
    return NextResponse.json({ erro: 'Consulta FIPE indisponível', placa }, { status: 200 })
  }
}
