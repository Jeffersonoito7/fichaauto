import { NextRequest, NextResponse } from 'next/server'
import { consultarVeiculo } from '@/lib/providers'
import { createClient, createServiceRoleClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const { placa, chassi } = await req.json()
    const input = (placa ?? chassi ?? '').trim()

    if (!input) {
      return NextResponse.json({ error: 'Placa ou chassi obrigatório' }, { status: 400 })
    }

    // Autenticação via sessão Supabase
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Verificar saldo com service role (ignora RLS)
    const service = createServiceRoleClient()
    const { data: perfil } = await (service as any)
      .from('perfis')
      .select('saldo_consultas')
      .eq('user_id', user.id)
      .single()

    const saldo = perfil?.saldo_consultas ?? 0

    if (saldo <= 0) {
      return NextResponse.json(
        { error: 'Saldo insuficiente. Recarregue sua carteira para continuar.' },
        { status: 402 }
      )
    }

    // Debitar 1 consulta antes de executar
    await (service as any)
      .from('perfis')
      .update({ saldo_consultas: saldo - 1, atualizado_em: new Date().toISOString() })
      .eq('user_id', user.id)

    const resultado = await consultarVeiculo(
      placa  ? input : '',
      chassi ? input : undefined,
    )

    return NextResponse.json({ success: true, ...resultado })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
