// Rota pública gratuita — preview de placa com FIPE
// Sem auth, sem débito de saldo
// Fonte 1: cache_placas (grátis, dados de consultas anteriores)
// Fonte 2: PlacaFIPE (token via PLACAFIPE_TOKEN)
// Fonte 3: Assertiva básico (fallback — cobrado, evitar ao máximo)
// Valor FIPE: BrasilAPI (pelo codigoFipe) ou busca por descrição no Parallelum

import { NextRequest, NextResponse } from 'next/server'
import { consultarPlacaFipe } from '@/lib/providers/placafipe'
import { getCachePlaca } from '@/lib/cache-placas'
import { getFipePorCodigo } from '@/lib/providers/brasilapi'

const PARALLELUM = 'https://parallelum.com.br/fipe/api/v1'

function tipoParallelum(tipo: string): 'carros' | 'motos' | 'caminhoes' {
  const t = tipo.toUpperCase()
  if (t.includes('MOTO') || t.includes('CICLO')) return 'motos'
  if (t.includes('CAMINHAO') || t.includes('CAMINHÃO') || t.includes('ONIBUS') || t.includes('ÔNIBUS')) return 'caminhoes'
  return 'carros'
}

function normalizar(s: string): string {
  return s.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z0-9]/g, '')
}

function similaridade(a: string, b: string): number {
  const na = normalizar(a)
  const nb = normalizar(b)
  if (na === nb) return 1
  if (na.includes(nb) || nb.includes(na)) return 0.8
  // conta tokens em comum
  const ta = na.split(/\s+/)
  const tb = nb.split(/\s+/)
  const comuns = ta.filter(t => tb.some(u => u.includes(t) || t.includes(u))).length
  return comuns / Math.max(ta.length, tb.length)
}

async function buscarFipeParallelum(
  marcaModelo: string,
  anoFab: string,
  tipoVeiculo: string
): Promise<{ fipeCodigo: string; fipeValor: string; fipeMes: string } | null> {
  try {
    const tipo = tipoParallelum(tipoVeiculo)
    // Extrai a marca: primeiro token antes do espaco/barra
    const partes = marcaModelo.replace(/^I\//, '').trim().split(/[\s\/]/)
    const nomeMarca = partes[0] ?? ''
    const nomeModelo = partes.slice(1).join(' ')

    // 1. Busca marcas
    const resMarcas = await fetch(`${PARALLELUM}/${tipo}/marcas`, {
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(6000),
    })
    if (!resMarcas.ok) return null
    const marcas: { codigo: string; nome: string }[] = await resMarcas.json()

    const marcaEncontrada = marcas
      .map(m => ({ ...m, score: similaridade(m.nome, nomeMarca) }))
      .filter(m => m.score > 0.5)
      .sort((a, b) => b.score - a.score)[0]
    if (!marcaEncontrada) return null

    // 2. Busca modelos
    const resModelos = await fetch(
      `${PARALLELUM}/${tipo}/marcas/${marcaEncontrada.codigo}/modelos`,
      { next: { revalidate: 86400 }, signal: AbortSignal.timeout(6000) }
    )
    if (!resModelos.ok) return null
    const { modelos }: { modelos: { codigo: number; nome: string }[] } = await resModelos.json()

    const modeloEncontrado = modelos
      .map(m => ({ ...m, score: similaridade(m.nome, nomeModelo) }))
      .filter(m => m.score > 0.3)
      .sort((a, b) => b.score - a.score)[0]
    if (!modeloEncontrado) return null

    // 3. Busca anos
    const resAnos = await fetch(
      `${PARALLELUM}/${tipo}/marcas/${marcaEncontrada.codigo}/modelos/${modeloEncontrado.codigo}/anos`,
      { next: { revalidate: 86400 }, signal: AbortSignal.timeout(6000) }
    )
    if (!resAnos.ok) return null
    const anos: { codigo: string; nome: string }[] = await resAnos.json()

    // Prefere o ano exato, senão pega o mais proximo
    const anoAlvo = parseInt(anoFab)
    const anoEncontrado = anos
      .map(a => ({ ...a, ano: parseInt(a.nome) }))
      .filter(a => !isNaN(a.ano))
      .sort((a, b) => Math.abs(a.ano - anoAlvo) - Math.abs(b.ano - anoAlvo))[0]
    if (!anoEncontrado) return null

    // 4. Busca preco
    const resPreco = await fetch(
      `${PARALLELUM}/${tipo}/marcas/${marcaEncontrada.codigo}/modelos/${modeloEncontrado.codigo}/anos/${anoEncontrado.codigo}`,
      { next: { revalidate: 86400 }, signal: AbortSignal.timeout(6000) }
    )
    if (!resPreco.ok) return null
    const preco: any = await resPreco.json()

    const valorRaw = preco.Valor ?? preco.valor ?? ''
    const codigo   = preco.CodigoFipe ?? preco.codigoFipe ?? ''
    const mesRef   = preco.MesReferencia ?? preco.mesReferencia ?? ''
    if (!valorRaw) return null

    // Valor ja vem formatado "R$ 12.000,00"
    return { fipeCodigo: codigo, fipeValor: valorRaw, fipeMes: mesRef }
  } catch {
    return null
  }
}

async function enriquecerFipe(dados: any): Promise<any> {
  // Caso 1: ja tem valor — nada a fazer
  if (dados.fipeValor) return dados

  // Caso 2: tem codigo — busca direto na BrasilAPI
  if (dados.fipeCodigo) {
    try {
      const fipe = await getFipePorCodigo(dados.fipeCodigo)
      if (fipe) {
        const valor = fipe.valor ?? fipe.price ?? fipe.preco ?? null
        const ref   = fipe.referenceMonth ?? fipe.mesReferencia ?? null
        if (valor) {
          const valorFmt = `R$ ${Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
          return { ...dados, fipeValor: valorFmt, fipeMes: ref ?? dados.fipeMes }
        }
      }
    } catch { /* continua */ }
  }

  // Caso 3: sem codigo mas tem marca+ano — busca por descricao no Parallelum
  if (dados.marca && dados.anoFabricacao) {
    const fipe = await buscarFipeParallelum(dados.marca, dados.anoFabricacao, dados.tipoVeiculo ?? '')
    if (fipe) {
      return { ...dados, fipeCodigo: fipe.fipeCodigo, fipeValor: fipe.fipeValor, fipeMes: fipe.fipeMes }
    }
  }

  return dados
}

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
      `${BASE_URL}/veiculos/v3/consulta-base?tipo=placa&documento=${placa}&idFinalidade=${FINALIDADE}`,
      { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
    )
    if (!res.ok) return null
    const d = await res.json()
    const ids  = d?.resposta?.identificadores ?? {}
    const desc = d?.resposta?.descricao       ?? {}
    const mov  = d?.resposta?.movimentacao    ?? {}
    const tech = d?.resposta?.fichaTecnica    ?? {}
    if (!desc?.marcaModelo) return null
    const chassiRaw = ids.chassi ?? ''
    const motorRaw  = ids.numeroMotor ?? ''
    return {
      placa:         placa,
      marca:         desc.marcaModelo ?? '',
      modelo:        '',
      anoFabricacao: String(desc.anoFabricacao ?? ''),
      anoModelo:     String(desc.anoModelo     ?? ''),
      cor:           desc.cor         ?? '',
      municipio:     mov.municipio    ?? mov.cidade  ?? '',
      uf:            mov.uf           ?? mov.estado  ?? '',
      combustivel:   desc.combustivel ?? '',
      chassi:        chassiRaw ? chassiRaw.slice(0, 5) + '*'.repeat(chassiRaw.length - 5) : '',
      motor:         motorRaw  ? motorRaw.slice(0, 4)  + '****' : '',
      fipeValor:     '',
      fipeCodigo:    '',
      fipeMes:       '',
      tipoVeiculo:   tech.tipo ?? '',
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

  // 1. Cache local (gratuito)
  const cache = await getCachePlaca(placa)
  if (cache?.marca) {
    const dadosCache = {
      placa,
      marca:         cache.marca        ?? '',
      modelo:        cache.modelo       ?? '',
      anoFabricacao: cache.ano_fab      ?? '',
      anoModelo:     cache.ano_mod      ?? '',
      cor:           cache.cor          ?? '',
      municipio:     '',
      uf:            '',
      combustivel:   cache.combustivel  ?? '',
      chassi:        cache.chassi ? cache.chassi.slice(0, 5) + '*****' : '',
      motor:         '',
      fipeValor:     '',
      fipeCodigo:    cache.codigo_fipe  ?? '',
      fipeMes:       '',
      tipoVeiculo:   '',
      fonte:         'cache' as const,
    }
    return NextResponse.json(await enriquecerFipe(dadosCache))
  }

  // 2. PlacaFIPE (barato — R$0,03)
  const resultadoPlacaFipe = await consultarPlacaFipe(placa)
  if (resultadoPlacaFipe) {
    return NextResponse.json(await enriquecerFipe({ ...resultadoPlacaFipe, tipoVeiculo: '' }))
  }

  // 3. Assertiva básico (fallback pago)
  const resultadoAssertiva = await previewAssertiva(placa)
  if (resultadoAssertiva) {
    return NextResponse.json(await enriquecerFipe(resultadoAssertiva))
  }

  return NextResponse.json({ error: 'Veículo não encontrado' }, { status: 404 })
}
