import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

function svc() { return createServiceRoleClient() as any }

export async function GET() {
  const { data, error } = await svc()
    .from('planos_recarga')
    .select('*')
    .order('ordem', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { nome, consultas, preco, descricao, destaque, economia_texto, ativo, ordem } = body

  if (!nome || !consultas || !preco) {
    return NextResponse.json({ error: 'nome, consultas e preco são obrigatórios' }, { status: 400 })
  }

  const { data, error } = await svc()
    .from('planos_recarga')
    .insert({ nome, consultas: Number(consultas), preco: Number(preco), descricao, destaque: !!destaque, economia_texto, ativo: ativo !== false, ordem: Number(ordem ?? 0) })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
