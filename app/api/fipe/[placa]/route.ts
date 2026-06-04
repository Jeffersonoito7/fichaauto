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
    const protocolo   = base?.cabecalho?.protocolo
    const descricao   = base?.resposta?.descricao ?? {}

    // 2. Precificador (sinistro + FIPE) — requer protocolo da consulta-base
    let fipeData: any = {}
    if (protocolo) {
      try {
        fipeData = await assertGet(
          `/veiculos/v3/demais-consultas?tipo=placa&documento=${placa}&consulta=precificador&protocolo=${protocolo}&idFinalidade=2`
        )
      } catch { /* precificador pode não estar contratado */ }
    }

    const prec = fipeData?.resposta ?? fipeData

    return NextResponse.json({
      placa,
      valorFipe:     prec?.valorFipe     ?? prec?.fipe?.valor     ?? prec?.precificacao?.valorFipe ?? null,
      valorMercado:  prec?.valorMercado   ?? prec?.precificacao?.valorMercado ?? null,
      marcaModelo:   prec?.marcaModelo    ?? descricao?.marcaModelo ?? null,
      anoModelo:     prec?.anoModelo      ?? descricao?.anoModelo   ?? null,
      codigoFipe:    prec?.codigoFipe     ?? prec?.fipe?.codigo     ?? null,
      mesReferencia: prec?.mesReferencia  ?? null,
      fonte:         'assertiva',
    })
  } catch {
    return NextResponse.json({ erro: 'Consulta FIPE indisponível', placa }, { status: 200 })
  }
}
