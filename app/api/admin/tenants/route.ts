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

/** GET /api/admin/tenants — lista todos os tenants */
export async function GET() {
  if (!await assertSuperAdmin()) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }
  const { data, error } = await service()
    .from('tenants')
    .select('*')
    .order('criado_em', { ascending: false })
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
  return NextResponse.json(data)
}

/** POST /api/admin/tenants — criar tenant */
export async function POST(req: NextRequest) {
  if (!await assertSuperAdmin()) {
    return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  }
  const body = await req.json()
  const { nome, slug, dominio, logo_url, cor_primaria, cor_secundaria, cor_texto,
          nome_fantasia, telefone, email_contato, saldo_veiculo, saldo_cpf,
          preco_veiculo, preco_cpf } = body

  if (!nome || !slug) {
    return NextResponse.json({ erro: 'Nome e slug são obrigatórios' }, { status: 400 })
  }

  const { data, error } = await service()
    .from('tenants')
    .insert({
      nome, slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, ''),
      dominio: dominio || null,
      logo_url: logo_url || null,
      cor_primaria:   cor_primaria   || '#00A651',
      cor_secundaria: cor_secundaria || '#0055A4',
      cor_texto:      cor_texto      || '#FFFFFF',
      nome_fantasia:  nome_fantasia  || null,
      telefone:       telefone       || null,
      email_contato:  email_contato  || null,
      saldo_veiculo:  parseFloat(saldo_veiculo  || '0'),
      saldo_cpf:      parseFloat(saldo_cpf      || '0'),
      preco_veiculo:  preco_veiculo  ? parseFloat(preco_veiculo)  : null,
      preco_cpf:      preco_cpf      ? parseFloat(preco_cpf)      : null,
      ativo: true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
