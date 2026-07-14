import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { verificarJwt } from '@/lib/jwt'
import { cookies } from 'next/headers'

async function isSuperAdmin(): Promise<boolean> {
  const cookieStore = await cookies()
  const token = cookieStore.get('ficha-auth')?.value
  if (!token) return false
  const payload = await verificarJwt(token)
  return payload?.role === 'super_admin' || payload?.email === process.env.ADMIN_EMAIL
}

export async function GET(req: NextRequest) {
  if (!await isSuperAdmin()) return NextResponse.json({ erro: 'Sem acesso' }, { status: 403 })
  const svc = createServiceRoleClient() as any
  const tenantId = req.nextUrl.searchParams.get('tenant_id')
  let query = svc
    .from('cobrancas')
    .select('*, tenants(nome, nome_fantasia, email_contato)')
    .order('criado_em', { ascending: false })
  if (tenantId) query = query.eq('tenant_id', tenantId)
  const { data, error } = await query
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  if (!await isSuperAdmin()) return NextResponse.json({ erro: 'Sem acesso' }, { status: 403 })
  const body = await req.json()
  const { tenant_id, descricao, valor, vencimento, obs } = body
  if (!tenant_id || !descricao || !valor || !vencimento) {
    return NextResponse.json({ erro: 'tenant_id, descricao, valor e vencimento sao obrigatorios' }, { status: 400 })
  }
  const svc = createServiceRoleClient() as any
  const { data, error } = await svc
    .from('cobrancas')
    .insert({ tenant_id, descricao, valor: parseFloat(valor), vencimento, obs: obs ?? null, status: 'pendente' })
    .select()
    .single()
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
  return NextResponse.json(data)
}
