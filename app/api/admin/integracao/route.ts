import { NextRequest, NextResponse } from 'next/server'
import { getAuthEmail } from '@/lib/consulta-helper'
import { createServiceRoleClient } from '@/lib/supabase-server'

async function isAdmin(email: string) {
  const svc = createServiceRoleClient() as any
  const { data } = await svc.from('perfis').select('role').eq('email', email).maybeSingle()
  return data?.role === 'super_admin' || email === process.env.ADMIN_EMAIL
}

export async function GET() {
  const email = await getAuthEmail()
  if (!email || !(await isAdmin(email))) {
    return NextResponse.json({ error: 'Nao autorizado' }, { status: 403 })
  }
  const placafipeAtivo = !!process.env.PLACAFIPE_TOKEN
  return NextResponse.json({ placafipeAtivo })
}

export async function POST(req: NextRequest) {
  const email = await getAuthEmail()
  if (!email || !(await isAdmin(email))) {
    return NextResponse.json({ error: 'Nao autorizado' }, { status: 403 })
  }

  const { placafipeToken } = await req.json()
  if (!placafipeToken || typeof placafipeToken !== 'string') {
    return NextResponse.json({ error: 'Token invalido' }, { status: 400 })
  }

  // Em producao o token deve ser adicionado nas variaveis de ambiente do Vercel.
  // Esta rota retorna instrucoes claras para o admin.
  return NextResponse.json({
    ok: true,
    instrucao: 'Adicione PLACAFIPE_TOKEN nas variaveis de ambiente do Vercel (Settings > Environment Variables) e faca um redeploy.',
    token_preview: placafipeToken.slice(0, 6) + '...',
  })
}
