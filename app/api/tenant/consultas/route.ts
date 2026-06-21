import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

function service() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

async function getTenantId(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('ficha-auth')?.value
    if (!token) return null
    const payload = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'))
    const email = payload.email
    const db = service()
    const { data } = await db
      .from('perfis')
      .select('tenant_id, tenant_role')
      .eq('email', email)
      .maybeSingle()
    if (!data?.tenant_id || data.tenant_role !== 'admin') return null
    return data.tenant_id
  } catch { return null }
}

export async function GET(req: NextRequest) {
  const tenantId = await getTenantId()
  if (!tenantId) return NextResponse.json({ erro: 'Sem acesso' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const pagina    = parseInt(searchParams.get('pagina') ?? '1')
  const por_pagina = 20
  const offset    = (pagina - 1) * por_pagina
  const tipo      = searchParams.get('tipo') ?? ''
  const busca     = searchParams.get('busca') ?? ''

  const db = service()
  let query = db
    .from('consultas')
    .select('id, email, tipo, documento, descricao, plano, status, custo, created_at', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .range(offset, offset + por_pagina - 1)

  if (tipo) query = query.eq('tipo', tipo)
  if (busca) query = query.ilike('documento', `%${busca}%`)

  const { data, count, error } = await query
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })

  return NextResponse.json({
    consultas: data ?? [],
    total: count ?? 0,
    pagina,
    paginas: Math.ceil((count ?? 0) / por_pagina),
  })
}
