import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createHmac } from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { verificarJwt } from '@/lib/jwt'

function service() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function hashSenha(senha: string): string {
  const salt = process.env.JWT_SECRET ?? 'fallback-secret'
  return createHmac('sha256', salt).update(senha).digest('hex')
}

async function getAdminContext(): Promise<{ tenantId: string; email: string } | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('ficha-auth')?.value
    if (!token) return null
    const payload = await verificarJwt(token)
    if (!payload) return null

    // super_admin pode gerenciar qualquer tenant via query param
    if (payload.role === 'super_admin') {
      return { tenantId: '__super__', email: payload.email }
    }

    const db = service()
    const { data } = await db
      .from('perfis')
      .select('tenant_id, tenant_role')
      .eq('email', payload.email)
      .maybeSingle()
    if (!data?.tenant_id || data.tenant_role !== 'admin') return null
    return { tenantId: data.tenant_id, email: payload.email }
  } catch { return null }
}

export async function GET(req: NextRequest) {
  const ctx = await getAdminContext()
  if (!ctx) return NextResponse.json({ erro: 'Sem acesso' }, { status: 403 })

  const tenantId = ctx.tenantId === '__super__'
    ? (req.nextUrl.searchParams.get('tenant_id') ?? '')
    : ctx.tenantId

  if (!tenantId) return NextResponse.json({ erro: 'tenant_id obrigatorio' }, { status: 400 })

  const db = service()
  const { data, error } = await db
    .from('perfis')
    .select('id, user_id, nome, email, saldo_veiculo, saldo_cpf, tenant_role, pode_placa, pode_cpf, pode_cnpj, pode_lote, pode_credito, modulos_liberados, ativo, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const ctx = await getAdminContext()
  if (!ctx) return NextResponse.json({ erro: 'Sem acesso' }, { status: 403 })

  const body = await req.json()
  const { nome, email, senha, tenant_id: bodyTenantId, pode_placa, pode_cpf, pode_cnpj, pode_lote, pode_credito, modulos_liberados, tenant_role } = body

  if (!nome || !email || !senha) {
    return NextResponse.json({ erro: 'Nome, e-mail e senha sao obrigatorios.' }, { status: 400 })
  }
  if (senha.length < 6) {
    return NextResponse.json({ erro: 'Senha deve ter no minimo 6 caracteres.' }, { status: 400 })
  }

  const tenantId = ctx.tenantId === '__super__' ? (bodyTenantId ?? '') : ctx.tenantId
  if (!tenantId) return NextResponse.json({ erro: 'tenant_id obrigatorio' }, { status: 400 })

  const db = service()

  // Verifica se email ja existe
  const { data: existente } = await db.from('perfis').select('email').eq('email', email.toLowerCase().trim()).maybeSingle()
  if (existente) return NextResponse.json({ erro: 'E-mail ja cadastrado.' }, { status: 409 })

  // Busca permissoes do tenant para nao ultrapassar o que foi contratado
  const { data: tenant } = await db.from('tenants').select('nome').eq('id', tenantId).maybeSingle()
  if (!tenant) return NextResponse.json({ erro: 'Tenant nao encontrado.' }, { status: 404 })

  const { error } = await db.from('perfis').insert({
    nome:              nome.trim(),
    email:             email.toLowerCase().trim(),
    senha_hash:        hashSenha(senha),
    tenant_id:         tenantId,
    tenant_role:       tenant_role ?? 'user',
    ativo:             true,
    pode_placa:        pode_placa  ?? false,
    pode_cpf:          pode_cpf   ?? false,
    pode_cnpj:         pode_cnpj  ?? false,
    pode_lote:         pode_lote  ?? false,
    pode_credito:      pode_credito ?? false,
    modulos_liberados: Array.isArray(modulos_liberados) ? modulos_liberados : [],
    saldo_veiculo:     0,
    saldo_cpf:         0,
    obs_admin:         `Criado pelo admin do tenant ${tenant.nome}`,
  })

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest) {
  const ctx = await getAdminContext()
  if (!ctx) return NextResponse.json({ erro: 'Sem acesso' }, { status: 403 })

  const body = await req.json()
  const { usuario_id, tenant_role, pode_placa, pode_cpf, pode_cnpj, pode_lote, pode_credito, modulos_liberados, ativo, senha } = body
  if (!usuario_id) return NextResponse.json({ erro: 'usuario_id obrigatorio' }, { status: 400 })

  const db = service()

  // Garante que o usuario pertence ao tenant
  const { data: usuario } = await db.from('perfis').select('tenant_id').eq('id', usuario_id).maybeSingle()
  if (ctx.tenantId !== '__super__' && usuario?.tenant_id !== ctx.tenantId) {
    return NextResponse.json({ erro: 'Usuario nao pertence a este tenant' }, { status: 403 })
  }

  const campos: Record<string, any> = { atualizado_em: new Date().toISOString() }
  if (tenant_role       !== undefined) campos.tenant_role       = tenant_role
  if (pode_placa        !== undefined) campos.pode_placa        = pode_placa
  if (pode_cpf          !== undefined) campos.pode_cpf          = pode_cpf
  if (pode_cnpj         !== undefined) campos.pode_cnpj         = pode_cnpj
  if (pode_lote         !== undefined) campos.pode_lote         = pode_lote
  if (pode_credito      !== undefined) campos.pode_credito      = pode_credito
  if (modulos_liberados !== undefined) campos.modulos_liberados = modulos_liberados
  if (ativo             !== undefined) campos.ativo             = ativo
  if (senha && senha.length >= 6)      campos.senha_hash        = hashSenha(senha)

  const { data, error } = await db.from('perfis').update(campos).eq('id', usuario_id).select().single()
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
  return NextResponse.json(data)
}
