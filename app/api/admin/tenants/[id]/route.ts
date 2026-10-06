import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthEmail } from '@/lib/consulta-helper'
import { ehModuloVeiculo } from '@/lib/modulos-veiculo'
import { OPCOES_POR_MODULO, motivoIndisponivel, type FornecedorId } from '@/lib/fornecedores'
import type { ModuloVeiculo } from '@/lib/modulos-veiculo'

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

  // Módulos contratados: só aceita id que o motor sabe executar, senão o
  // cliente ficaria com módulo que nunca roda e ninguém perceberia.
  if ('modulos_liberados' in body) {
    if (!Array.isArray(body.modulos_liberados)) {
      return NextResponse.json({ erro: 'modulos_liberados deve ser uma lista' }, { status: 400 })
    }
    const invalidos = body.modulos_liberados.filter((m: unknown) => typeof m !== 'string' || !ehModuloVeiculo(m))
    if (invalidos.length > 0) {
      return NextResponse.json({ erro: `Módulo desconhecido: ${invalidos.join(', ')}` }, { status: 400 })
    }
    campos.modulos_liberados = body.modulos_liberados
  }

  // Fornecedor por modulo DESTA empresa. Valida da mesma forma que os modulos:
  // aceitar fornecedor que nao entrega aquele dado deixaria a consulta do
  // cliente quebrada sem ninguem perceber ate ele clicar.
  if ('fornecedores_modulo' in body) {
    const mapa = body.fornecedores_modulo
    if (mapa === null || typeof mapa !== 'object' || Array.isArray(mapa)) {
      return NextResponse.json({ erro: 'fornecedores_modulo deve ser um objeto' }, { status: 400 })
    }
    for (const [modulo, fornecedor] of Object.entries(mapa)) {
      const opcoes = OPCOES_POR_MODULO[modulo as ModuloVeiculo]
      if (!opcoes) {
        return NextResponse.json({ erro: `Módulo desconhecido: ${modulo}` }, { status: 400 })
      }
      if (!opcoes.some(o => o.fornecedor === fornecedor)) {
        return NextResponse.json(
          { erro: `${fornecedor} não entrega o módulo ${modulo}.` },
          { status: 400 },
        )
      }
      const motivo = motivoIndisponivel(fornecedor as FornecedorId)
      if (motivo) return NextResponse.json({ erro: motivo }, { status: 400 })
    }
    campos.fornecedores_modulo = mapa
  }

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
