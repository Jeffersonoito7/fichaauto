import { NextRequest, NextResponse } from 'next/server'
import { getAuthEmail } from '@/lib/consulta-helper'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const email = await getAuthEmail()
  if (!email) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { id } = await context.params
  const svc = createServiceRoleClient() as any

  const { data: registro } = await svc
    .from('monitoramentos')
    .select('email')
    .eq('id', id)
    .maybeSingle()

  if (!registro) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  if (registro.email !== email) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const { error } = await svc
    .from('monitoramentos')
    .update({ ativo: false })
    .eq('id', id)

  if (error) {
    console.error('[DELETE /api/monitoramento/id]', error.message)
    return NextResponse.json({ error: 'Erro ao remover' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
