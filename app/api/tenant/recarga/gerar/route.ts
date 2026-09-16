import { NextRequest, NextResponse } from 'next/server'
import { criarCobranca, obterQrCode } from '@/lib/providers/efi'
import { createClient, createServiceRoleClient } from '@/lib/supabase-server'
import { ASSINATURA_B2B } from '@/lib/products'

export async function POST(_req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

    const svc = createServiceRoleClient() as any

    const { data: perfil } = await svc
      .from('perfis')
      .select('tenant_id, tenant_role')
      .eq('user_id', user.id)
      .single()

    if (!perfil?.tenant_id || perfil.tenant_role !== 'admin') {
      return NextResponse.json({ erro: 'Acesso restrito ao administrador da revenda.' }, { status: 403 })
    }

    const cob = await criarCobranca({
      valor:     ASSINATURA_B2B.preco,
      descricao: `${ASSINATURA_B2B.label} — Ficha Auto`,
      expiracao: 3600,
    })

    const qr = await obterQrCode(cob.loc.id)

    await svc.from('transacoes_pix').insert({
      txid:            cob.txid,
      user_id:         user.id,
      tenant_id:       perfil.tenant_id,
      valor:           ASSINATURA_B2B.preco,
      saldo_creditado: ASSINATURA_B2B.preco,
      produto:         'assinatura',
      status:          'pendente',
    })

    return NextResponse.json({
      txid:       cob.txid,
      valorPago:  ASSINATURA_B2B.preco,
      descricao:  ASSINATURA_B2B.descricao,
      qrCode:     qr.imagemQrcode,
      copiaECola: qr.qrcode,
      expira:     '60 minutos',
    })
  } catch (err: any) {
    console.error('[PIX tenant/recarga]', err?.response?.data ?? err.message)
    return NextResponse.json({ erro: 'Falha ao gerar PIX. Tente novamente.' }, { status: 500 })
  }
}
