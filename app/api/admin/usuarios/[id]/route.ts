import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { getAuthEmail } from '@/lib/consulta-helper'

function hashSenha(senha: string): string {
  const salt = process.env.JWT_SECRET ?? 'fallback-secret'
  return createHmac('sha256', salt).update(senha).digest('hex')
}

export async function PATCH(req: NextRequest, context: any) {
  const { id } = await context.params
  const body = await req.json()
  const svc = createServiceRoleClient() as any

  const email = await getAuthEmail()
  if (!email) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  const { data: caller } = await svc.from('perfis').select('role').eq('email', email).maybeSingle()
  if (caller?.role !== 'super_admin') return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const campos: Record<string, any> = {}
  const permitidos = [
    'ativo', 'pode_placa', 'pode_cpf', 'pode_cnpj', 'pode_lote', 'pode_credito',
    'saldo_veiculo', 'saldo_cpf', 'creditos_credito', 'obs_admin', 'nome',
    'modulos_liberados', 'tenant_id', 'tenant_role',
  ]
  for (const k of permitidos) {
    if (k in body) campos[k] = body[k]
  }

  // Senha: recebe em texto, salva como hash
  if (body.senha && typeof body.senha === 'string' && body.senha.length >= 6) {
    campos.senha_hash = hashSenha(body.senha)
  }

  campos.atualizado_em = new Date().toISOString()

  const { error } = await svc.from('perfis').update(campos).eq('user_id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
