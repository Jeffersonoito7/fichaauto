import { NextRequest, NextResponse } from 'next/server'
import { getAuthEmail } from '@/lib/consulta-helper'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function GET() {
  const email = await getAuthEmail()
  if (!email) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const svc = createServiceRoleClient() as any
  const { data, error } = await svc
    .from('monitoramentos')
    .select('id, documento, descricao, ativo, ultimo_check, created_at')
    .eq('email', email)
    .eq('ativo', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[GET /api/monitoramento]', error.message)
    return NextResponse.json({ error: 'Erro ao buscar monitoramentos' }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const email = await getAuthEmail()
  if (!email) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { placa, descricao } = await req.json()
  const documento = (placa ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (!documento || documento.length < 7) {
    return NextResponse.json({ error: 'Placa inválida' }, { status: 400 })
  }

  const svc = createServiceRoleClient() as any

  const { data: existe } = await svc
    .from('monitoramentos')
    .select('id')
    .eq('email', email)
    .eq('documento', documento)
    .eq('ativo', true)
    .maybeSingle()

  if (existe) return NextResponse.json({ error: 'Esta placa já está sendo monitorada.' }, { status: 409 })

  const MAX_MONITOR = 10
  const { count } = await svc
    .from('monitoramentos')
    .select('id', { count: 'exact', head: true })
    .eq('email', email)
    .eq('ativo', true)

  if ((count ?? 0) >= MAX_MONITOR) {
    return NextResponse.json({ error: `Limite de ${MAX_MONITOR} placas monitoradas atingido.` }, { status: 402 })
  }

  const { data, error } = await svc
    .from('monitoramentos')
    .insert({ email, tipo: 'veiculo', documento, descricao: descricao ?? null, ativo: true })
    .select('id, documento, descricao, ativo, created_at')
    .single()

  if (error) {
    console.error('[POST /api/monitoramento]', error.message)
    return NextResponse.json({ error: 'Erro ao adicionar monitoramento' }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
