import { NextRequest, NextResponse } from 'next/server'
import { consultarVeiculo } from '@/lib/providers'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { getAuthEmail, salvarConsulta, registrarAuditoria } from '@/lib/consulta-helper'
import { PRECO } from '@/lib/products'
import { salvarCacheDeResultado } from '@/lib/cache-placas'

export async function POST(req: NextRequest) {
  try {
    const { placa, chassi } = await req.json()
    const input = (placa ?? chassi ?? '').trim()

    if (!input) {
      return NextResponse.json({ error: 'Placa ou chassi obrigatório' }, { status: 400 })
    }

    // Autenticação via cookie ficha-auth
    const email = await getAuthEmail()
    if (!email) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Verificar saldo com service role (ignora RLS)
    // as any: Supabase precisa de tipos gerados (supabase gen types) para inferência de select()
    const service = createServiceRoleClient() as any
    const { data: perfil } = await service
      .from('perfis')
      .select('saldo_veiculo, role, pode_placa, ativo')
      .eq('email', email)
      .maybeSingle()

    const isAdmin = perfil?.role === 'super_admin' || email === process.env.ADMIN_EMAIL
    const saldo = parseFloat(perfil?.saldo_veiculo ?? '0')
    const custo = PRECO.placa

    if (!isAdmin && !perfil?.pode_placa) {
      return NextResponse.json({ error: 'Sem permissão para consulta veicular.' }, { status: 403 })
    }

    if (!isAdmin && saldo < custo) {
      return NextResponse.json(
        { error: `Saldo insuficiente. Esta consulta custa R$ ${custo.toFixed(2).replace('.', ',')}. Recarregue sua carteira.` },
        { status: 402 }
      )
    }

    const resultado = await consultarVeiculo(
      placa  ? input : '',
      chassi ? input : undefined,
    )

    // Debitar somente após retorno da API (evita perda de saldo em falha externa)
    if (!isAdmin) {
      await service
        .from('perfis')
        .update({ saldo_veiculo: parseFloat((saldo - custo).toFixed(2)), atualizado_em: new Date().toISOString() })
        .eq('email', email)
    }

    // Extrair descrição do veículo para o histórico
    const pDesc = resultado.placa?.resposta?.descricao ?? resultado.placa?.resposta ?? {}
    const marca = pDesc.marcaModelo ?? pDesc.marca ?? ''
    const descricao = marca || input

    const saved = await salvarConsulta({
      email,
      tipo:      'veiculo',
      documento: input.toUpperCase(),
      descricao,
      resultado,
    })

    // Fire-and-forget: cache e audit log não bloqueiam a resposta
    if (placa) salvarCacheDeResultado(input.toUpperCase(), resultado)
    registrarAuditoria({ email, acao: 'consulta_placa', documento: input.toUpperCase(), custo: isAdmin ? 0 : custo })

    return NextResponse.json({ success: true, token: saved?.token ?? null, ...resultado })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
