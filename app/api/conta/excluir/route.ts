import { NextResponse } from 'next/server'
import { getAuthEmail } from '@/lib/consulta-helper'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function DELETE() {
  const email = await getAuthEmail()
  if (!email) return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 })

  const svc = createServiceRoleClient() as any

  const { data: perfil } = await svc
    .from('perfis')
    .select('user_id, role')
    .eq('email', email)
    .maybeSingle()

  if (!perfil) return NextResponse.json({ erro: 'Usuário não encontrado.' }, { status: 404 })
  if (perfil.role === 'super_admin') {
    return NextResponse.json({ erro: 'Conta de administrador não pode ser excluída por aqui.' }, { status: 403 })
  }

  // Anonimizar consultas (obrigação legal de retenção por 5 anos)
  await svc
    .from('consultas')
    .update({ email: `excluido_${perfil.user_id}@anonimo` })
    .eq('email', email)

  await svc
    .from('audit_logs')
    .update({ email: `excluido_${perfil.user_id}@anonimo` })
    .eq('email', email)

  // Remover dados pessoais da conta
  await svc.from('perfis').delete().eq('user_id', perfil.user_id)

  return NextResponse.json({ ok: true })
}
