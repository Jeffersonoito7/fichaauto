import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { verificarJwt } from '@/lib/jwt'

export async function GET(_req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('ficha-auth')?.value

    if (!token) {
      return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
    }

    const payload = await verificarJwt(token)
    if (!payload) return NextResponse.json({ erro: 'Token inválido' }, { status: 401 })
    const { email } = payload

    // Tenta buscar histórico de consultas via service role
    try {
      const service = createServiceRoleClient()
      const { data } = await (service as any)
        .from('consultas')
        .select('id, tipo, documento, descricao, created_at, status, plano')
        .eq('email', email)
        .order('created_at', { ascending: false })
        .limit(50)

      if (data && data.length > 0) {
        const lista = data.map((c: any) => ({
          id:        String(c.id),
          tipo:      c.tipo      ?? 'veiculo',
          documento: c.documento ?? '',
          descricao: c.descricao ?? '',
          data:      c.created_at,
          status:    c.status    ?? 'Realizada',
          plano:     c.plano     ?? 'completa',
        }))
        return NextResponse.json(lista)
      }
    } catch {}

    // Retorna lista vazia se tabela não existe ou usuário sem histórico
    return NextResponse.json([])
  } catch {
    return NextResponse.json([])
  }
}
