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

      // O caixa e DA EMPRESA, entao o historico tambem e: todo operador da
      // mesma associacao precisa ver o que a empresa ja consultou, senao dois
      // deles pagam a mesma placa sem saber. Quem nao pertence a empresa
      // nenhuma continua vendo apenas as proprias consultas.
      const { data: perfil } = await service
        .from('perfis')
        .select('tenant_id')
        .eq('email', email)
        .maybeSingle()

      let q = service
        .from('consultas')
        // A coluna `plano` NAO EXISTE nesta tabela. Pedir por ela fazia o
        // select falhar, o catch engolia o erro e a tela mostrava "nenhuma
        // consulta realizada" mesmo com consulta gravada no banco.
        .select('id, tipo, documento, descricao, created_at, status, custo, email, reaproveitada', { count: 'exact' })

      q = perfil?.tenant_id
        ? q.eq('tenant_id', perfil.tenant_id)
        : q.eq('email', email)

      const { data, count, error } = await q
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
        plano:     'completa',
        custo:     c.custo != null ? Number(c.custo) : null,
        // Quem consultou, para a empresa saber de quem foi o gasto.
        por:       c.email ?? null,
        reaproveitada: !!c.reaproveitada,
      }))

      return NextResponse.json({
        lista,
        total:    count ?? 0,
        page,
        pageSize: PAGE_SIZE,
        totalPages: Math.ceil((count ?? 0) / PAGE_SIZE),
      })
    } catch (e: any) {
      // Devolver lista vazia em caso de falha fazia a tela dizer "nenhuma
      // consulta realizada" com o banco cheio. Agora o erro aparece.
      console.error('[/api/historico] falha ao buscar consultas:', e?.message ?? e)
      return NextResponse.json(
        { erro: 'Não foi possível carregar o histórico.', lista: [], total: 0, page, pageSize: PAGE_SIZE, totalPages: 0 },
        { status: 500 },
      )
    }
  } catch (e: any) {
    console.error('[/api/historico] erro inesperado:', e?.message ?? e)
    return NextResponse.json({ lista: [], total: 0, page: 1, pageSize: PAGE_SIZE, totalPages: 0 })
  }
}
