import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthEmail } from '@/lib/consulta-helper'

function service() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

async function assertSuperAdmin() {
  const email = await getAuthEmail()
  if (!email) return null
  const { data } = await service()
    .from('perfis')
    .select('role')
    .eq('email', email)
    .maybeSingle()
  const isSuperAdmin = data?.role === 'super_admin' || email === process.env.ADMIN_EMAIL
  return isSuperAdmin ? email : null
}

/** PATCH /api/admin/tenants/[id] — atualizar tenant */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await assertSuperAdmin()) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }
  const { id } = await params
  const body = await req.json()

  const campos: Record<string, any> = { atualizado_em: new Date().toISOString() }
  const permitidos = [
    'nome', 'slug', 'dominio', 'logo_url', 'cor_primaria', 'cor_secundaria',
    'cor_texto', 'nome_fantasia', 'telefone', 'email_contato', 'ativo',
    'saldo_veiculo', 'saldo_cpf', 'preco_veiculo', 'preco_cpf',
  ]
  permitidos.forEach(k => { if (k in body) campos[k] = body[k] })

  const { data, error } = await service()
    .from('tenants')
    .update(campos)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
  return NextResponse.json(data)
}

/** POST /api/admin/tenants/[id]/creditar — adicionar saldo ao tenant */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await assertSuperAdmin()) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }
  const { id } = await params
  const { produto, valor } = await req.json()
  if (!produto || !valor) return NextResponse.json({ erro: 'produto e valor obrigatórios' }, { status: 400 })

  const campo = produto === 'cpf' ? 'saldo_cpf' : 'saldo_veiculo'

  const { data: tenant } = await service()
    .from('tenants')
    .select('saldo_veiculo, saldo_cpf')
    .eq('id', id)
    .single()

  const atual = parseFloat((tenant as any)?.[campo] ?? '0')
  const { data, error } = await service()
    .from('tenants')
    .update({ [campo]: parseFloat((atual + parseFloat(valor)).toFixed(2)), atualizado_em: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
  return NextResponse.json(data)
}

/** DELETE /api/admin/tenants/[id] — desativar tenant (soft delete) */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await assertSuperAdmin()) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }
  const { id } = await params
  const { error } = await service()
    .from('tenants')
    .update({ ativo: false, atualizado_em: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
