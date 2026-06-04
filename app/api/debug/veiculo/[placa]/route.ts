import { NextRequest, NextResponse } from 'next/server'
import { consultarCompleto } from '@/lib/providers/assertiva'

export async function GET(req: NextRequest, { params }: { params: Promise<{ placa: string }> }) {
  const { placa: placaParam } = await params
  const placa = placaParam.replace(/[^A-Z0-9]/gi, '').toUpperCase()
  try {
    const resultado = await consultarCompleto(placa)
    return NextResponse.json(resultado, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
