import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { consultarVeiculo } from '@/lib/providers'
import { createHash } from 'crypto'

// Campos que monitoramos para detectar mudanças relevantes
const CAMPOS_MONITORADOS = [
  { chave: 'restricaoRouboFurto',  path: (d: any) => d?.binFederal?.resposta?.restricaoRouboFurto },
  { chave: 'restricaoRENAJUD',     path: (d: any) => d?.binFederal?.resposta?.restricaoRENAJUD },
  { chave: 'indicioSinistro',      path: (d: any) => d?.sinistro?.resposta?.indicioSinistro },
  { chave: 'restricaoFinanceira',  path: (d: any) => d?.gravame?.resposta?.restricaoFinanceira ?? d?.gravame?.resposta?.alienacao },
  { chave: 'leilao',               path: (d: any) => {
    const l = d?.leilao?.resposta ?? {}
    const total = Array.isArray(l.historicoLeilao) ? l.historicoLeilao.length
      : (l.baseA?.length ?? 0) + (l.baseB?.length ?? 0) + (l.remarketing?.length ?? 0)
    return String(total)
  }},
  { chave: 'situacaoVeiculo',      path: (d: any) => d?.placa?.resposta?.descricao?.situacao ?? d?.placa?.resposta?.situacao },
]

function calcHash(data: any): string {
  const relevante = CAMPOS_MONITORADOS.map(c => `${c.chave}=${c.path(data) ?? ''}`).join('|')
  return createHash('sha256').update(relevante).digest('hex').slice(0, 16)
}

function extrairValor(campo: string, data: any): string {
  const c = CAMPOS_MONITORADOS.find(x => x.chave === campo)
  return String(c?.path(data) ?? '')
}

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret') ?? req.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const svc = createServiceRoleClient() as any

  // Busca monitoramentos ativos que não foram checados nas últimas 12h
  const limite = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
  const { data: lista, error } = await svc
    .from('monitoramentos')
    .select('id, email, documento, descricao, ultimo_hash')
    .eq('ativo', true)
    .or(`ultimo_check.is.null,ultimo_check.lt.${limite}`)
    .limit(50)

  if (error) {
    console.error('[cron/monitorar] erro ao buscar lista:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const resultados = { verificados: 0, alertas: 0, erros: 0 }

  for (const mon of (lista ?? [])) {
    try {
      const resultado = await consultarVeiculo(mon.documento, undefined)
      const hashAtual = calcHash(resultado)

      await svc
        .from('monitoramentos')
        .update({ ultimo_check: new Date().toISOString(), ultimo_hash: hashAtual })
        .eq('id', mon.id)

      resultados.verificados++

      if (mon.ultimo_hash && mon.ultimo_hash !== hashAtual) {
        // Detecta quais campos mudaram
        const hashAnterior = mon.ultimo_hash
        for (const campo of CAMPOS_MONITORADOS) {
          const valorAtual = extrairValor(campo.chave, resultado)
          // Salva alerta (sem o valor anterior exato pois não reprocessamos o resultado antigo)
          await svc.from('alertas_monitoramento').insert({
            monitoramento_id: mon.id,
            email:            mon.email,
            documento:        mon.documento,
            campo_alterado:   campo.chave,
            valor_anterior:   `hash:${hashAnterior}`,
            valor_atual:      valorAtual,
          })
          resultados.alertas++
        }
      }
    } catch (e: any) {
      console.error(`[cron/monitorar] erro em ${mon.documento}:`, e?.message)
      resultados.erros++
    }
  }

  return NextResponse.json({ ...resultados, total: lista?.length ?? 0 })
}
