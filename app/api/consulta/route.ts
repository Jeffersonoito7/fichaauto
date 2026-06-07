import { NextRequest, NextResponse } from 'next/server'
import { consultarVeiculo } from '@/lib/providers'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { getAuthEmail, salvarConsulta } from '@/lib/consulta-helper'

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
    const service = createServiceRoleClient() as any
    const { data: perfil } = await service
      .from('perfis')
      .select('saldo_consultas')
      .eq('email', email)
      .maybeSingle()

    const saldo = perfil?.saldo_consultas ?? 0

    if (saldo <= 0) {
      return NextResponse.json(
        { error: 'Saldo insuficiente. Recarregue sua carteira para continuar.' },
        { status: 402 }
      )
    }

    // Debitar 1 consulta antes de executar
    await service
      .from('perfis')
      .update({ saldo_consultas: saldo - 1, atualizado_em: new Date().toISOString() })
      .eq('email', email)

    const resultado = await consultarVeiculo(
      placa  ? input : '',
      chassi ? input : undefined,
    )

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

    return NextResponse.json({ success: true, token: saved?.token ?? null, ...resultado })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
