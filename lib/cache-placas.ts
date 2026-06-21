/**
 * Cache de placas no Supabase.
 *
 * Marca/modelo/ano/cor/codigoFipe de um veiculo nao mudam.
 * Toda consulta paga salva esses dados aqui.
 * A consulta gratuita le daqui antes de chamar qualquer API externa.
 * TTL: 365 dias (dados estruturais do veiculo sao estaveis).
 */

import { createClient } from '@supabase/supabase-js'

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export interface DadosBasicosPlaca {
  placa:       string
  marca:       string | null
  modelo:      string | null
  ano_fab:     string | null
  ano_mod:     string | null
  cor:         string | null
  combustivel: string | null
  renavam:     string | null
  chassi:      string | null
  codigo_fipe: string | null
}

const TTL_DIAS = 365

/** Busca no cache. Retorna null se nao existir ou estiver expirado. */
export async function getCachePlaca(placa: string): Promise<DadosBasicosPlaca | null> {
  try {
    const client = getClient()
    const expirado = new Date(Date.now() - TTL_DIAS * 86400 * 1000).toISOString()

    const { data } = await client
      .from('cache_placas')
      .select('*')
      .eq('placa', placa.toUpperCase())
      .gt('atualizado_em', expirado)
      .maybeSingle()

    return data ?? null
  } catch {
    return null
  }
}

/** Salva ou atualiza no cache (upsert por placa). */
export async function setCachePlaca(dados: DadosBasicosPlaca): Promise<void> {
  try {
    const client = getClient()
    await client
      .from('cache_placas')
      .upsert(
        { ...dados, placa: dados.placa.toUpperCase(), atualizado_em: new Date().toISOString() },
        { onConflict: 'placa' },
      )
  } catch {
    // cache nao pode travar o fluxo principal
  }
}

/**
 * Extrai e salva dados basicos de um resultado de consulta paga Assertiva.
 * Chamado automaticamente apos cada consulta paga de placa.
 */
export async function salvarCacheDeResultado(placa: string, resultado: any): Promise<void> {
  try {
    const raw   = resultado?.placa ?? {}
    const pDesc = raw?.resposta?.descricao ?? raw?.resposta ?? {}
    const pIdent = raw?.resposta?.identificadores ?? {}
    const pFicha = raw?.resposta?.fichaTecnica ?? {}
    const cab    = raw?.cabecalho ?? {}

    const marca      = cab?.marca      ?? pDesc?.marcaModelo ?? pDesc?.marca      ?? null
    const modelo     = cab?.modelo     ?? pDesc?.modelo      ?? null
    const ano_fab    = cab?.anoFabricacao ?? pDesc?.anoFabricacao ?? pDesc?.ano   ?? null
    const ano_mod    = cab?.anoModelo  ?? pDesc?.anoModelo   ?? null
    const cor        = cab?.cor        ?? pDesc?.cor         ?? null
    const combustivel = cab?.combustivel ?? pFicha?.combustivel ?? pFicha?.tipoCombustivel ?? null
    const renavam    = pIdent?.renavam ?? pDesc?.renavam     ?? null
    const chassi     = pIdent?.chassi  ?? pDesc?.chassi      ?? null
    const codigo_fipe = pDesc?.codigoFipe ?? cab?.codigoFipe ?? pDesc?.codigo     ?? null

    if (!marca && !modelo) return // dados insuficientes, nao salva

    await setCachePlaca({ placa, marca, modelo, ano_fab, ano_mod, cor, combustivel, renavam, chassi, codigo_fipe })
  } catch {
    // nao bloqueia
  }
}
