/**
 * Consulta gratuita de placa — retorna dados basicos + valor FIPE.
 *
 * Fluxo de custo crescentemente barato:
 *  1. cache_placas (Supabase)  → R$ 0,00
 *  2. PlacaFIPE API            → R$ 0,03  (quando token disponivel)
 *  3. Assertiva consulta-base  → ~R$ 2-5  (fallback, salva no cache para nao repetir)
 *
 * Valor FIPE sempre via BrasilAPI → R$ 0,00
 * Logo da marca via Clearbit CDN  → R$ 0,00
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCachePlaca, setCachePlaca, DadosBasicosPlaca } from '@/lib/cache-placas'

const ASSERT_BASE = 'https://api.assertivasolucoes.com.br'
const TOKEN_URL   = 'https://api.assertivasolucoes.com.br/oauth2/v3/token'
const BRASIL_BASE = 'https://brasilapi.com.br/api'

// Token Assertiva em memoria (reutilizado entre requests)
let _assertToken: string | null = null
let _assertExp   = 0

async function getAssertToken(): Promise<string> {
  if (_assertToken && Date.now() < _assertExp) return _assertToken
  const basic = Buffer.from(
    `${process.env.ASSERTIVA_LOGIN ?? ''}:${process.env.ASSERTIVA_PASSWORD ?? ''}`
  ).toString('base64')
  const res = await fetch(TOKEN_URL, {
    method:  'POST',
    headers: { 'Authorization': `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    'grant_type=client_credentials',
    cache:   'no-store',
  })
  const j = await res.json()
  _assertToken = j.access_token ?? j.token
  _assertExp   = Date.now() + ((j.expires_in ?? 3600) * 1000) - 300_000
  return _assertToken!
}

async function assertGet(path: string) {
  const token = await getAssertToken()
  const res = await fetch(`${ASSERT_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache:   'no-store',
  })
  if (!res.ok) throw new Error(`Assertiva ${res.status}`)
  return res.json()
}

/** Busca valor FIPE pelo codigo via BrasilAPI (gratis). */
async function getFipePorCodigo(codigo: string): Promise<{ valor: number | null; referencia: string | null }> {
  try {
    const res = await fetch(`${BRASIL_BASE}/fipe/preco/v1/${codigo}`, {
      next: { revalidate: 86400 }, // cache 24h no Next.js
    })
    if (!res.ok) return { valor: null, referencia: null }
    const arr = await res.json()
    const item = Array.isArray(arr) ? arr[0] : arr
    return {
      valor:     item?.value ?? item?.preco ?? item?.price ?? null,
      referencia: item?.referenceMonth ?? item?.mesReferencia ?? null,
    }
  } catch {
    return { valor: null, referencia: null }
  }
}

/** Consulta PlacaFIPE (R$ 0,03) quando token disponivel. */
async function consultarPlacaFipe(placa: string): Promise<DadosBasicosPlaca | null> {
  const token = process.env.PLACAFIPE_TOKEN
  if (!token) return null
  try {
    const res = await fetch(`https://api.placafipe.com.br/placa/${placa}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache:   'no-store',
    })
    if (!res.ok) return null
    const d = await res.json()
    if (!d?.marca && !d?.modelo) return null
    return {
      placa,
      marca:       d.marca       ?? null,
      modelo:      d.modelo      ?? null,
      ano_fab:     d.anoFabricacao ?? d.ano ?? null,
      ano_mod:     d.anoModelo   ?? null,
      cor:         d.cor         ?? null,
      combustivel: d.combustivel ?? null,
      renavam:     d.renavam     ?? null,
      chassi:      d.chassi      ?? null,
      codigo_fipe: d.codigoFipe  ?? d.codigo ?? null,
    }
  } catch {
    return null
  }
}

/** Fallback Assertiva consulta-base (~R$ 2-5, salva no cache para nao repetir). */
async function consultarAssertiva(placa: string): Promise<DadosBasicosPlaca | null> {
  try {
    const base  = await assertGet(`/veiculos/v3/consulta-base?tipo=placa&documento=${placa}&idFinalidade=2`)
    const cab   = base?.cabecalho ?? {}
    const resp  = base?.resposta  ?? {}
    const desc  = resp?.descricao ?? resp?.dadosCadastrais ?? resp?.identificacao ?? resp ?? {}
    const pFicha = resp?.fichaTecnica ?? {}

    const marca = cab?.marca ?? desc?.marcaModelo ?? desc?.marca ?? null
    if (!marca) return null

    return {
      placa,
      marca,
      modelo:      cab?.modelo      ?? desc?.modelo      ?? null,
      ano_fab:     cab?.anoFabricacao ?? desc?.anoFabricacao ?? desc?.ano ?? null,
      ano_mod:     cab?.anoModelo   ?? desc?.anoModelo   ?? null,
      cor:         cab?.cor         ?? desc?.cor         ?? null,
      combustivel: cab?.combustivel ?? pFicha?.combustivel ?? pFicha?.tipoCombustivel ?? null,
      renavam:     desc?.renavam    ?? null,
      chassi:      desc?.chassi     ?? null,
      codigo_fipe: desc?.codigoFipe ?? cab?.codigoFipe   ?? desc?.codigo ?? null,
    }
  } catch {
    return null
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ placa: string }> }
) {
  const { placa: placaRaw } = await params
  const placa = placaRaw.replace(/[^A-Za-z0-9]/g, '').toUpperCase()

  // ── 1. Cache local (R$ 0,00) ────────────────────────────────────────────────
  let dados = await getCachePlaca(placa)
  let fonte: string = dados ? 'cache' : ''

  // ── 2. PlacaFIPE (R$ 0,03) ──────────────────────────────────────────────────
  if (!dados) {
    dados = await consultarPlacaFipe(placa)
    if (dados) {
      fonte = 'placafipe'
      await setCachePlaca(dados) // salva para proxima vez ser gratis
    }
  }

  // ── 3. Assertiva fallback (~R$ 2-5, so se nao tiver PlacaFIPE) ─────────────
  if (!dados) {
    dados = await consultarAssertiva(placa)
    if (dados) {
      fonte = 'assertiva'
      await setCachePlaca(dados) // salva para proxima vez ser gratis
    }
  }

  if (!dados) {
    return NextResponse.json({ erro: 'Veículo não encontrado', placa }, { status: 200 })
  }

  // ── Valor FIPE via BrasilAPI (R$ 0,00) ──────────────────────────────────────
  let valorFipe: number | null = null
  let mesReferencia: string | null = null

  if (dados.codigo_fipe) {
    const fipe    = await getFipePorCodigo(dados.codigo_fipe)
    valorFipe     = fipe.valor
    mesReferencia = fipe.referencia
  }

  return NextResponse.json({
    placa,
    marca:        dados.marca,
    modelo:       dados.modelo,
    anoFab:       dados.ano_fab,
    anoMod:       dados.ano_mod,
    cor:          dados.cor,
    combustivel:  dados.combustivel,
    renavam:      dados.renavam,
    chassi:       dados.chassi,
    valorFipe,
    valorMercado: null,
    codigoFipe:   dados.codigo_fipe,
    mesReferencia,
    fonte,
  })
}
