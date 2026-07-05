import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { verificarJwt } from '@/lib/jwt'

const PAGE_SIZE = 20

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('ficha-auth')?.value

    if (!token) {
      return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
    }

    const payload = await verificarJwt(token)
    if (!payload) return NextResponse.json({ erro: 'Token inválido' }, { status: 401 })
    const { email } = payload

    const page    = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') ?? '1'))
    const offset  = (page - 1) * PAGE_SIZE

    try {
      // as any: Supabase precisa de tipos gerados (supabase gen types) para inferência de select()
      const service = createServiceRoleClient() as any
      const { data, count, error } = await service
        .from('consultas')
        .select('id, tipo, documento, descricao, created_at, status, plano', { count: 'exact' })
        .eq('email', email)
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1)

      if (error) throw error

      const lista = (data ?? []).map((c: any) => ({
        id:        String(c.id),
        tipo:      c.tipo      ?? 'veiculo',
        documento: c.documento ?? '',
        descricao: c.descricao ?? '',
        data:      c.created_at,
        status:    c.status    ?? 'Realizada',
        plano:     c.plano     ?? 'completa',
      }))

      return NextResponse.json({
        lista,
        total:    count ?? 0,
        page,
        pageSize: PAGE_SIZE,
        totalPages: Math.ceil((count ?? 0) / PAGE_SIZE),
      })
    } catch (e: any) {
      console.error('[/api/historico] falha ao buscar consultas:', e?.message ?? e)
    }

    return NextResponse.json({ lista: [], total: 0, page: 1, pageSize: PAGE_SIZE, totalPages: 0 })
  } catch (e: any) {
    console.error('[/api/historico] erro inesperado:', e?.message ?? e)
    return NextResponse.json({ lista: [], total: 0, page: 1, pageSize: PAGE_SIZE, totalPages: 0 })
  }
}
