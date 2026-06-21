import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

function service() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

async function getAdminTenantId(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('ficha-auth')?.value
    if (!token) return null
    const payload = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'))
    const db = service()
    const { data } = await db
      .from('perfis')
      .select('tenant_id, tenant_role')
      .eq('email', payload.email)
      .maybeSingle()
    if (!data?.tenant_id || data.tenant_role !== 'admin') return null
    return data.tenant_id
  } catch { return null }
}

export async function GET(_req: NextRequest) {
  const tenantId = await getAdminTenantId()
  if (!tenantId) return NextResponse.json({ erro: 'Sem acesso' }, { status: 403 })

  const db = service()
  const { data, error } = await db
    .from('perfis')
    .select('id, nome, email, saldo_veiculo, saldo_cpf, tenant_role, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function PATCH(req: NextRequest) {
  const tenantId = await getAdminTenantId()
  if (!tenantId) return NextResponse.json({ erro: 'Sem acesso' }, { status: 403 })

  const { usuario_id, tenant_role } = await req.json()
  if (!usuario_id) return NextResponse.json({ erro: 'usuario_id obrigatório' }, { status: 400 })

  const db = service()

  // Garantir que o usuario pertence ao tenant
  const { data: usuario } = await db
    .from('perfis')
    .select('tenant_id')
    .eq('id', usuario_id)
    .maybeSingle()

  if (usuario?.tenant_id !== tenantId) {
    return NextResponse.json({ erro: 'Usuário não pertence a este tenant' }, { status: 403 })
  }

  const { data, error } = await db
    .from('perfis')
    .update({ tenant_role: tenant_role ?? 'user' })
    .eq('id', usuario_id)
    .select()
    .single()

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
  return NextResponse.json(data)
}
