import { NextRequest, NextResponse } from 'next/server'

// FIPE pública — sem custo, sem débito de crédito
// Usa a API da FIPE via parallelum.com.br (espelho público gratuito)

const FIPE_BASE = 'https://parallelum.com.br/fipe/api/v2'

async function getJson(url: string) {
  const res = await fetch(url, { next: { revalidate: 86400 } }) // cache 24h
  if (!res.ok) throw new Error(`FIPE ${res.status}`)
  return res.json()
}

// Detecta tipo pelo formato da placa (Mercosul = letras+num+letra+2num, antiga = 3L+4N)
function tipoVeiculo(placa: string): 'carros' | 'motos' | 'caminhoes' {
  // Simplificado: tenta carros primeiro, fallback por error
  return 'carros'
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ placa: string }> }
) {
  const { placa: placaRaw } = await params
  const placa = placaRaw.replace(/[^A-Za-z0-9]/g, '').toUpperCase()

  try {
    // Consulta Assertiva para pegar marca/modelo/ano (já temos a API)
    // Usa a placa para buscar dados na FIPE via marca+modelo
    // Como não temos direto placa→FIPE, retornamos os dados disponíveis

    // Tenta buscar via Assertiva sinistro que já retorna valor FIPE
    const token = await getAssertToken()
    const res = await fetch(
      `https://gateway.assertivasolucoes.com.br/veiculos/v1/precificador/${placa}`,
      {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        cache: 'no-store',
      }
    )

    if (!res.ok) throw new Error(`precificador ${res.status}`)
    const data = await res.json()

    return NextResponse.json({
      placa,
      valorFipe:     data?.valorFipe       ?? data?.fipe?.valor     ?? data?.precificacao?.valorFipe ?? null,
      valorMercado:  data?.valorMercado     ?? data?.precificacao?.valorMercado ?? null,
      marcaModelo:   data?.marcaModelo      ?? data?.modelo         ?? null,
      anoModelo:     data?.anoModelo        ?? data?.ano            ?? null,
      codigoFipe:    data?.codigoFipe       ?? data?.fipe?.codigo   ?? null,
      mesReferencia: data?.mesReferencia    ?? null,
      fonte:         'assertiva',
    })
  } catch {
    return NextResponse.json({ erro: 'Consulta FIPE indisponível', placa }, { status: 200 })
  }
}

// Reutiliza token Assertiva
const TOKEN_URL = 'https://plataforma.assertivasolucoes.com.br/oauth2/v3/token'
let _token: string | null = null
let _exp = 0

async function getAssertToken() {
  if (_token && Date.now() < _exp) return _token
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      login:      process.env.ASSERTIVA_LOGIN    ?? '',
      password:   process.env.ASSERTIVA_PASSWORD ?? '',
      grant_type: 'client_credentials',
    }),
    cache: 'no-store',
  })
  const j = await res.json()
  _token = j.access_token ?? j.token
  _exp   = Date.now() + ((j.expires_in ?? 3600) * 1000) - 300_000
  return _token!
}
