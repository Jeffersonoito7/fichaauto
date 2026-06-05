import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function PATCH(req: NextRequest, context: any) {
  const { id } = await context.params
  const body = await req.json()
  const svc = createServiceRoleClient() as any

  const campos: Record<string, any> = {}
  const permitidos = ['ativo', 'pode_placa', 'pode_cpf', 'pode_cnpj', 'pode_lote', 'saldo_consultas', 'obs_admin', 'nome']
  for (const k of permitidos) {
    if (k in body) campos[k] = body[k]
  }
  campos.atualizado_em = new Date().toISOString()

  const { error } = await svc.from('perfis').update(campos).eq('user_id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
