// Rota pública gratuita — preview de placa com FIPE
// Sem auth, sem débito de saldo
// Fonte 1: PlacaFIPE (token via PLACAFIPE_TOKEN)
// Fonte 2: Assertiva básico (fallback automático se PlacaFIPE indisponível)

import { NextRequest, NextResponse } from 'next/server'
import { consultarPlacaFipe } from '@/lib/providers/placafipe'

const TOKEN_URL = 'https://api.assertivasolucoes.com.br/oauth2/v3/token'
const BASE_URL  = 'https://api.assertivasolucoes.com.br'
const FINALIDADE = 2

let _token: string | null = null
let _tokenExpiry = 0

async function getTokenAssertiva(): Promise<string> {
  if (_token && Date.now() < _tokenExpiry) return _token
  const basic = Buffer.from(
    `${process.env.ASSERTIVA_LOGIN ?? ''}:${process.env.ASSERTIVA_PASSWORD ?? ''}`
  ).toString('base64')
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Token Assertiva erro ${res.status}`)
  const json = await res.json()
  _token = json.access_token ?? json.token
  _tokenExpiry = Date.now() + (json.expires_in ?? 3600) * 1000 - 300_000
  return _token!
}

async function previewAssertiva(placa: string) {
  try {
    const token = await getTokenAssertiva()
    const res = await fetch(
      `${BASE_URL}/veiculos/v3/consulta-placa?placa=${placa}&idFinalidade=${FINALIDADE}`,
      { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
    )
    if (!res.ok) return null
    const d = await res.json()
    const v = d?.resposta ?? d
    return {
      placa:         placa,
      marca:         v.marca         ?? v.fabricante ?? '',
      modelo:        v.modelo        ?? v.versao     ?? '',
      anoFabricacao: String(v.anoFabricacao ?? v.ano ?? ''),
      anoModelo:     String(v.anoModelo     ?? v.ano ?? ''),
      cor:           v.cor           ?? '',
      municipio:     v.municipio     ?? v.cidade     ?? '',
      uf:            v.uf            ?? '',
      combustivel:   v.combustivel   ?? '',
      chassi:        (v.chassi       ?? '').slice(0, 5) + '*****',
      motor:         (v.motor        ?? '').slice(0, 4) + '****',
      fipeValor:     v.fipe?.valor   ?? v.valorFipe  ?? '',
      fipeCodigo:    v.fipe?.codigo  ?? '',
      fipeMes:       v.fipe?.mesReferencia ?? '',
      fonte:         'assertiva' as const,
    }
  } catch {
    return null
  }
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ placa: string }> }
) {
  const { placa: placaParam } = await context.params
  const placa = placaParam.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 7)

  if (placa.length < 7) {
    return NextResponse.json({ error: 'Placa inválida' }, { status: 400 })
  }

  // Tenta PlacaFIPE primeiro (mais barato)
  const resultadoPlacaFipe = await consultarPlacaFipe(placa)
  if (resultadoPlacaFipe) {
    return NextResponse.json(resultadoPlacaFipe)
  }

  // Fallback: Assertiva básico
  const resultadoAssertiva = await previewAssertiva(placa)
  if (resultadoAssertiva) {
    return NextResponse.json(resultadoAssertiva)
  }

  return NextResponse.json({ error: 'Veículo não encontrado' }, { status: 404 })
}
