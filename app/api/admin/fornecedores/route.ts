import { NextRequest, NextResponse } from 'next/server'
import { getAuthEmail } from '@/lib/consulta-helper'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { MODULOS_PADRAO, CUSTO_MODULO, type ModuloVeiculo } from '@/lib/modulos-veiculo'
import {
  FORNECEDORES, OPCOES_POR_MODULO, chaveConfig, PREFIXO_CONFIG,
  fornecedorConfigurado, motivoIndisponivel, resolverFornecedor,
  type FornecedorId,
} from '@/lib/fornecedores'

/** Mesma checagem usada em /api/admin/integracao, para não haver dois critérios de admin. */
async function isAdmin(email: string) {
  const svc = createServiceRoleClient() as any
  const { data } = await svc.from('perfis').select('role').eq('email', email).maybeSingle()
  return data?.role === 'super_admin' || email === process.env.ADMIN_EMAIL
}

/** Escolhas gravadas hoje, como mapa módulo para fornecedor. */
async function lerEscolhas(): Promise<Record<string, string>> {
  const svc = createServiceRoleClient() as any
  const { data } = await svc
    .from('config_financeiro')
    .select('chave, valor')
    .like('chave', `${PREFIXO_CONFIG}%`)

  const mapa: Record<string, string> = {}
  for (const linha of data ?? []) {
    mapa[String(linha.chave).slice(PREFIXO_CONFIG.length)] = linha.valor
  }
  return mapa
}

export async function GET() {
  const email = await getAuthEmail()
  if (!email || !(await isAdmin(email))) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 403 })
  }

  const escolhas = await lerEscolhas()

  const modulos = MODULOS_PADRAO.map(modulo => {
    const emUso = resolverFornecedor(modulo, escolhas[modulo])
    return {
      modulo,
      rotulo: rotuloDoModulo(modulo),
      escolhido: escolhas[modulo] ?? null,
      emUso,
      opcoes: (OPCOES_POR_MODULO[modulo] ?? []).map(o => ({
        fornecedor: o.fornecedor,
        nome: FORNECEDORES[o.fornecedor].nome,
        custo: o.custo,
        disponivel: fornecedorConfigurado(o.fornecedor),
        motivo: motivoIndisponivel(o.fornecedor),
      })),
    }
  })

  // Custo total do pacote com a configuração atual, para o dono ver o impacto.
  const custoAtual = modulos.reduce((soma, m) => {
    if (!m.emUso) return soma
    const op = m.opcoes.find(o => o.fornecedor === m.emUso)
    return soma + (op?.custo ?? 0)
  }, 0)

  return NextResponse.json({
    modulos,
    custoAtual: Number(custoAtual.toFixed(2)),
  })
}

export async function POST(req: NextRequest) {
  const email = await getAuthEmail()
  if (!email || !(await isAdmin(email))) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const modulo = String(body?.modulo ?? '') as ModuloVeiculo
  const fornecedor = String(body?.fornecedor ?? '') as FornecedorId

  const opcoes = OPCOES_POR_MODULO[modulo]
  if (!opcoes) {
    return NextResponse.json({ erro: 'Módulo desconhecido.' }, { status: 400 })
  }
  if (!opcoes.some(o => o.fornecedor === fornecedor)) {
    return NextResponse.json(
      { erro: 'Este fornecedor não entrega este módulo.' },
      { status: 400 },
    )
  }

  // Recusar escolha que quebraria a consulta na hora do uso é melhor do que
  // aceitar e falhar com o cliente esperando.
  const motivo = motivoIndisponivel(fornecedor)
  if (motivo) {
    return NextResponse.json({ erro: motivo }, { status: 400 })
  }

  const svc = createServiceRoleClient() as any
  const { error } = await svc
    .from('config_financeiro')
    .upsert(
      { chave: chaveConfig(modulo), valor: fornecedor, atualizado_em: new Date().toISOString() },
      { onConflict: 'chave' },
    )

  if (error) {
    console.error('[admin/fornecedores]', error.message)
    return NextResponse.json({ erro: 'Não foi possível salvar.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, modulo, fornecedor })
}

function rotuloDoModulo(modulo: ModuloVeiculo): string {
  const rotulos: Record<ModuloVeiculo, string> = {
    placa_identificacao: 'Identificação do veículo',
    placa_bin_federal:   'BIN federal',
    placa_bin_estadual:  'BIN estadual',
    placa_gravame:       'Gravame e financiamento',
    placa_sinistro:      'Indício de sinistro',
    placa_leilao:        'Histórico de leilão',
    placa_fipe:          'Tabela FIPE',
    placa_processos_cnj: 'Processos judiciais',
  }
  return rotulos[modulo] ?? CUSTO_MODULO[modulo]?.chave ?? modulo
}
