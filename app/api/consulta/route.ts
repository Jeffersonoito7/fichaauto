import { NextRequest, NextResponse } from 'next/server'
import { consultarVeiculo } from '@/lib/providers'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { getAuthEmail, salvarConsulta } from '@/lib/consulta-helper'
import { PRECO } from '@/lib/products'

export async function POST(req: NextRequest) {
  try {
    const { placa, chassi } = await req.json()
    const input = (placa ?? chassi ?? '').trim()

    if (!input) {
      return NextResponse.json({ error: 'Placa ou chassi obrigatório' }, { status: 400 })
    }

    // Autenticação via cookie ficha-auth
    const email = await getAuthEmail()
    if (!email) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Verificar saldo com service role (ignora RLS)
    const service = createServiceRoleClient() as any
    const { data: perfil } = await service
      .from('perfis')
      .select('saldo, role')
      .eq('email', email)
      .maybeSingle()

    const isAdmin = perfil?.role === 'super_admin' || email === process.env.ADMIN_EMAIL
    const saldo = parseFloat(perfil?.saldo ?? '0')
    const custo = PRECO.placa

    if (!isAdmin && saldo < custo) {
      return NextResponse.json(
        { error: `Saldo insuficiente. Esta consulta custa R$ ${custo.toFixed(2).replace('.', ',')}. Recarregue sua carteira.` },
        { status: 402 }
      )
    }

    // Debitar R$ 36,90 antes de executar (admin não debita)
    if (!isAdmin) {
      await service
        .from('perfis')
        .update({ saldo: parseFloat((saldo - custo).toFixed(2)), atualizado_em: new Date().toISOString() })
        .eq('email', email)
    }

    const resultado = await consultarVeiculo(
      placa  ? input : '',
      chassi ? input : undefined,
    )

    // Extrair descrição do veículo para o histórico
    const pDesc = resultado.placa?.resposta?.descricao ?? resultado.placa?.resposta ?? {}
    const marca = pDesc.marcaModelo ?? pDesc.marca ?? ''
    const descricao = marca || input

    const saved = await salvarConsulta({
      email,
      tipo:      'veiculo',
      documento: input.toUpperCase(),
      descricao,
      resultado,
    })

    return NextResponse.json({ success: true, token: saved?.token ?? null, ...resultado })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
