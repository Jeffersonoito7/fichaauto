import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { verificarJwt } from '@/lib/jwt'
import { cookies } from 'next/headers'

async function isSuperAdmin(): Promise<boolean> {
  const cookieStore = await cookies()
  const token = cookieStore.get('ficha-auth')?.value
  if (!token) return false
  const payload = await verificarJwt(token)
  return payload?.role === 'super_admin' || payload?.email === process.env.ADMIN_EMAIL
}

export async function GET() {
  if (!await isSuperAdmin()) return NextResponse.json({ erro: 'Sem acesso' }, { status: 403 })
  const svc = createServiceRoleClient() as any
  const { data } = await svc.from('config_financeiro').select('chave, valor').order('chave')
  const config: Record<string, string> = {}
  for (const row of data ?? []) config[row.chave] = row.valor ?? ''
  return NextResponse.json(config)
}

export async function PATCH(req: NextRequest) {
  if (!await isSuperAdmin()) return NextResponse.json({ erro: 'Sem acesso' }, { status: 403 })
  const body = await req.json()
  const svc = createServiceRoleClient() as any
  for (const [chave, valor] of Object.entries(body)) {
    await svc.from('config_financeiro').upsert({ chave, valor, atualizado_em: new Date().toISOString() }, { onConflict: 'chave' })
  }
  return NextResponse.json({ ok: true })
}
