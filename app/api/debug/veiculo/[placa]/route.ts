import { NextRequest, NextResponse } from 'next/server'
import { consultarCompleto } from '@/lib/providers/assertiva'
import { getAuthEmail } from '@/lib/consulta-helper'
import { createServiceRoleClient } from '@/lib/supabase-server'

async function assertSuperAdmin(): Promise<boolean> {
  const email = await getAuthEmail()
  if (!email) return false
  const svc = createServiceRoleClient() as any
  const { data } = await svc.from('perfis').select('role').eq('email', email).maybeSingle()
  return data?.role === 'super_admin'
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ placa: string }> }) {
  if (!await assertSuperAdmin()) return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 })

  const { placa: placaParam } = await params
  const placa = placaParam.replace(/[^A-Z0-9]/gi, '').toUpperCase()
  try {
    const resultado = await consultarCompleto(placa)
    return NextResponse.json(resultado, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
