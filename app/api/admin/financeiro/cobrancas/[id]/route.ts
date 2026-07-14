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

// PATCH — atualizar status, marcar como pago, cancelar, ou colar link do boleto manualmente
export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!await isSuperAdmin()) return NextResponse.json({ erro: 'Sem acesso' }, { status: 403 })
  const { id } = await context.params
  const body = await req.json()
  const svc = createServiceRoleClient() as any

  const campos: Record<string, any> = { atualizado_em: new Date().toISOString() }
  const permitidos = [
    'status', 'obs', 'boleto_link', 'boleto_linha_dig', 'boleto_pdf_url',
    'boleto_charge_id', 'nfse_numero', 'nfse_xml_url', 'nfse_pdf_url',
    'enviado_email', 'pago_em',
  ]
  for (const k of permitidos) {
    if (k in body) campos[k] = body[k]
  }
  if (body.status === 'pago' && !campos.pago_em) campos.pago_em = new Date().toISOString()

  const { data, error } = await svc.from('cobrancas').update(campos).eq('id', id).select().single()
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!await isSuperAdmin()) return NextResponse.json({ erro: 'Sem acesso' }, { status: 403 })
  const { id } = await context.params
  const svc = createServiceRoleClient() as any
  const { error } = await svc.from('cobrancas').update({ status: 'cancelado', atualizado_em: new Date().toISOString() }).eq('id', id)
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
