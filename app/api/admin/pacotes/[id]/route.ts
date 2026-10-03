import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { exigirAdmin } from '@/lib/admin-guard'

function svc() { return createServiceRoleClient() as any }

// Campos que o admin pode alterar. Aceitar o body cru deixava qualquer coluna
// de planos_recarga ser sobrescrita por quem chamasse a rota.
const CAMPOS_PERMITIDOS = [
  'nome', 'consultas', 'preco', 'descricao', 'destaque',
  'economia_texto', 'ativo', 'ordem',
] as const

export async function PATCH(req: NextRequest, context: any) {
  const auth = await exigirAdmin()
  if (!auth.ok) return auth.resposta

  const { id } = await context.params
  const body = await req.json().catch(() => ({}))

  const update: Record<string, any> = {}
  for (const campo of CAMPOS_PERMITIDOS) {
    if (body?.[campo] !== undefined) update[campo] = body[campo]
  }
  if (update.consultas !== undefined) update.consultas = Number(update.consultas)
  if (update.preco !== undefined)     update.preco     = Number(update.preco)
  if (update.ordem !== undefined)     update.ordem     = Number(update.ordem)

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo válido para atualizar' }, { status: 400 })
  }
  if (update.preco !== undefined && (!Number.isFinite(update.preco) || update.preco <= 0)) {
    return NextResponse.json({ error: 'preco deve ser um número positivo' }, { status: 400 })
  }
  if (update.consultas !== undefined && (!Number.isFinite(update.consultas) || update.consultas <= 0)) {
    return NextResponse.json({ error: 'consultas deve ser um número positivo' }, { status: 400 })
  }

  const { error } = await svc().from('planos_recarga').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, context: any) {
  const auth = await exigirAdmin()
  if (!auth.ok) return auth.resposta

  const { id } = await context.params
  const { error } = await svc().from('planos_recarga').update({ ativo: false }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
