import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function GET() {
  const svc = createServiceRoleClient() as any

  // Buscar todos os perfis
  const { data: perfis, error } = await svc
    .from('perfis')
    .select('user_id, nome, email, saldo_consultas, ativo, pode_placa, pode_cpf, pode_cnpj, pode_lote, obs_admin, atualizado_em')
    .order('atualizado_em', { ascending: false, nullsFirst: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Buscar emails do auth.users para os user_ids sem email no perfil
  const semEmail = (perfis ?? []).filter((p: any) => !p.email).map((p: any) => p.user_id)
  let authEmails: Record<string, string> = {}
  if (semEmail.length > 0) {
    const { data: authUsers } = await svc.auth.admin.listUsers({ perPage: 1000 })
    authEmails = Object.fromEntries(
      (authUsers?.users ?? []).map((u: any) => [u.id, u.email])
    )
  }

  const result = (perfis ?? []).map((p: any) => ({
    ...p,
    email: p.email ?? authEmails[p.user_id] ?? '—',
  }))

  return NextResponse.json(result)
}
