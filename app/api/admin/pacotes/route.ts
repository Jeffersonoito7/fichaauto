import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { exigirAdmin } from '@/lib/admin-guard'

function svc() { return createServiceRoleClient() as any }

export async function GET() {
  const auth = await exigirAdmin()
  if (!auth.ok) return auth.resposta

  const { data, error } = await svc()
    .from('planos_recarga')
    .select('*')
    .order('ordem', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  // Esta rota cria plano de recarga COM PREÇO. Sem este guard qualquer pessoa
  // na internet criava um plano de R$ 1,00 com mil consultas.
  const auth = await exigirAdmin()
  if (!auth.ok) return auth.resposta

  const body = await req.json().catch(() => ({}))
  const { nome, consultas, preco, descricao, destaque, economia_texto, ativo, ordem } = body ?? {}

  if (!nome || !consultas || !preco) {
    return NextResponse.json({ error: 'nome, consultas e preco são obrigatórios' }, { status: 400 })
  }

  const nConsultas = Number(consultas)
  const nPreco     = Number(preco)
  if (!Number.isFinite(nConsultas) || nConsultas <= 0) {
    return NextResponse.json({ error: 'consultas deve ser um número positivo' }, { status: 400 })
  }
  if (!Number.isFinite(nPreco) || nPreco <= 0) {
    return NextResponse.json({ error: 'preco deve ser um número positivo' }, { status: 400 })
  }

  const { data, error } = await svc()
    .from('planos_recarga')
    .insert({
      nome: String(nome),
      consultas: nConsultas,
      preco: nPreco,
      descricao,
      destaque: !!destaque,
      economia_texto,
      ativo: ativo !== false,
      ordem: Number(ordem ?? 0),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
