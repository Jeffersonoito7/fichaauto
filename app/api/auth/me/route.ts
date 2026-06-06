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

    // Tenta buscar saldo via service role
    let saldo = 0
    try {
      const service = createServiceRoleClient()
      const { data } = await (service as any)
        .from('perfis')
        .select('saldo_consultas')
        .eq('email', email)
        .maybeSingle()
      saldo = data?.saldo_consultas ?? 0
    } catch {}

    return NextResponse.json({ nome, email, role, saldo })
  } catch {
    return NextResponse.json({ erro: 'Token inválido' }, { status: 401 })
  }
}
