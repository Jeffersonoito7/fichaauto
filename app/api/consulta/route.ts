import { NextRequest, NextResponse } from 'next/server'
import { consultarVeiculo } from '@/lib/providers'

export async function POST(req: NextRequest) {
  try {
    const { placa, chassi } = await req.json()
    const input = (placa ?? chassi ?? '').trim()

    if (!input) {
      return NextResponse.json({ error: 'Placa ou chassi obrigatório' }, { status: 400 })
    }

    // TODO: verificar autenticação (Supabase session)
    // TODO: verificar e debitar saldo de consultas

    const resultado = await consultarVeiculo(
      placa  ? input : '',
      chassi ? input : undefined,
    )

    // TODO: salvar resultado no Supabase (consultations table)

    return NextResponse.json({ success: true, ...resultado })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
