import { NextRequest, NextResponse } from 'next/server'
import { getAuthEmail } from '@/lib/consulta-helper'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function GET() {
  const email = await getAuthEmail()
  if (!email) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const svc = createServiceRoleClient() as any
  const { data } = await svc
    .from('alertas_monitoramento')
    .select('id, documento, campo_alterado, valor_atual, lido, created_at')
    .eq('email', email)
    .order('created_at', { ascending: false })
    .limit(50)

  return NextResponse.json(data ?? [])
}

// Marca alertas como lidos
export async function PATCH(req: NextRequest) {
  const email = await getAuthEmail()
  if (!email) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { ids } = await req.json()
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids obrigatório' }, { status: 400 })
  }

  const svc = createServiceRoleClient() as any
  await svc
    .from('alertas_monitoramento')
    .update({ lido: true })
    .eq('email', email)
    .in('id', ids)

  return NextResponse.json({ ok: true })
}
