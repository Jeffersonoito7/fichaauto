import { NextRequest, NextResponse } from 'next/server'
import { getAuthEmail } from '@/lib/consulta-helper'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { buscarConsultaAnterior, textoIdade } from '@/lib/reaproveitar-consulta'

/**
 * Responde se a empresa do usuário já consultou este documento.
 * Serve para a tela avisar ANTES de gastar API, deixando a pessoa escolher
 * entre abrir o relatório que já existe ou pagar por dado atualizado.
 * Não devolve o resultado em si, só o suficiente para decidir.
 */
export async function GET(req: NextRequest) {
  const email = await getAuthEmail()
  if (!email) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const documento = req.nextUrl.searchParams.get('documento') ?? ''
  const tipo      = req.nextUrl.searchParams.get('tipo') ?? 'veiculo'
  if (!documento) return NextResponse.json({ erro: 'documento obrigatório' }, { status: 400 })

  const svc = createServiceRoleClient() as any
  const { data: perfil } = await svc
    .from('perfis')
    .select('tenant_id')
    .eq('email', email)
    .maybeSingle()

  if (!perfil?.tenant_id) return NextResponse.json({ existe: false })

  const anterior = await buscarConsultaAnterior(perfil.tenant_id, documento, tipo)
  if (!anterior) return NextResponse.json({ existe: false })

  return NextResponse.json({
    existe:        true,
    consultadaEm:  anterior.consultadaEm,
    diasAtras:     anterior.diasAtras,
    envelhecida:   anterior.envelhecida,
    idadeTexto:    textoIdade(anterior),
    consultadaPor: anterior.consultadaPor,
  })
}
