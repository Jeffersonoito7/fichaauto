import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function GET(_req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('ficha-auth')?.value

    if (!token) {
      return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
    }

    const payload = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'))
    const { email, nome, role } = payload

    // Tenta buscar saldo e plano via service role
    let saldo = 0
    let plano: string | null = null
    let pode_placa = true
    let pode_cpf   = true
    let pode_cnpj  = true
    let pode_lote  = false
    try {
      const service = createServiceRoleClient()
      const { data } = await (service as any)
        .from('perfis')
        .select('saldo_consultas, plano, pode_placa, pode_cpf, pode_cnpj, pode_lote')
        .eq('email', email)
        .maybeSingle()
      saldo      = data?.saldo_consultas ?? 0
      plano      = data?.plano          ?? null
      pode_placa = data?.pode_placa     ?? true
      pode_cpf   = data?.pode_cpf       ?? true
      pode_cnpj  = data?.pode_cnpj      ?? true
      pode_lote  = data?.pode_lote      ?? false
    } catch {}

    return NextResponse.json({ nome, email, role, saldo, plano, pode_placa, pode_cpf, pode_cnpj, pode_lote })
  } catch {
    return NextResponse.json({ erro: 'Token inválido' }, { status: 401 })
  }
}
