import { NextRequest, NextResponse } from 'next/server'
import { criarCobranca, obterQrCode } from '@/lib/providers/efi'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { getAuthEmail } from '@/lib/consulta-helper'
import { RECARGA_MINIMA } from '@/lib/saldo'

/**
 * Recarga de saldo da EMPRESA, com valor escolhido pelo cliente.
 *
 * Antes esta rota só gerava o valor fixo da assinatura de R$ 1.500 e
 * autenticava por Supabase Auth, que o sistema abandonou em favor do JWT
 * próprio: ela não funcionava para quem entra pelo login atual.
 */
export async function POST(req: NextRequest) {
  try {
    const email = await getAuthEmail()
    if (!email) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const valor = Number(body?.valor)

    if (!Number.isFinite(valor) || valor < RECARGA_MINIMA) {
      return NextResponse.json({
        erro: `A recarga mínima é de R$ ${RECARGA_MINIMA.toLocaleString('pt-BR')},00.`,
        minimo: RECARGA_MINIMA,
      }, { status: 400 })
    }

    const svc = createServiceRoleClient() as any
    const { data: perfil } = await svc
      .from('perfis')
      .select('tenant_id, tenant_role')
      .eq('email', email)
      .maybeSingle()

    if (!perfil?.tenant_id || perfil.tenant_role !== 'admin') {
      return NextResponse.json({ erro: 'Apenas o administrador da empresa pode recarregar.' }, { status: 403 })
    }

    const { data: tenant } = await svc
      .from('tenants').select('nome').eq('id', perfil.tenant_id).maybeSingle()

    const valorFinal = parseFloat(valor.toFixed(2))

    const cob = await criarCobranca({
      valor:     valorFinal,
      descricao: `Recarga de saldo — ${tenant?.nome ?? 'Ficha Auto'}`,
      expiracao: 3600,
    })
    const qr = await obterQrCode(cob.loc.id)

    await svc.from('transacoes_pix').insert({
      txid:            cob.txid,
      tenant_id:       perfil.tenant_id,
      valor:           valorFinal,
      saldo_creditado: valorFinal,
      produto:         'recarga_tenant',
      status:          'pendente',
      descricao:       `Recarga de saldo — ${tenant?.nome ?? ''}`,
    })

    return NextResponse.json({
      txid:       cob.txid,
      valorPago:  valorFinal,
      qrCode:     qr.imagemQrcode,
      copiaECola: qr.qrcode,
      expira:     '60 minutos',
    })
  } catch (err: any) {
    console.error('[recarga/gerar]', err?.message ?? err)
    return NextResponse.json({ erro: 'Erro ao gerar a cobrança.' }, { status: 500 })
  }
}
