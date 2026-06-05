import { NextRequest, NextResponse } from 'next/server'
import { criarCobranca, obterQrCode } from '@/lib/providers/efi'
import { createClient } from '@/lib/supabase-server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const { planoId } = await req.json()

    // Autenticação
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

    // Buscar plano no banco
    const svc = createServiceRoleClient() as any
    const { data: plano, error: ePlano } = await svc
      .from('planos_recarga')
      .select('id, nome, consultas, preco')
      .eq('id', planoId)
      .eq('ativo', true)
      .single()

    if (ePlano || !plano) {
      return NextResponse.json({ erro: 'Plano inválido ou inativo' }, { status: 400 })
    }

    // Criar cobrança PIX na EFÍ
    const cob = await criarCobranca({
      valor:     plano.preco,
      descricao: `${plano.consultas} consultas Ficha Auto`,
      expiracao: 3600,
    })

    // Buscar QR code
    const qr = await obterQrCode(cob.loc.id)

    // Salvar transação pendente
    await svc.from('transacoes_pix').insert({
      txid:      cob.txid,
      user_id:   user.id,
      plano_id:  plano.id,
      consultas: plano.consultas,
      valor:     plano.preco,
      status:    'pendente',
    })

    return NextResponse.json({
      txid:       cob.txid,
      valor:      plano.preco,
      consultas:  plano.consultas,
      qrCode:     qr.imagemQrcode,
      copiaECola: qr.qrcode,
      expira:     '60 minutos',
    })
  } catch (err: any) {
    console.error('[PIX gerar]', err?.response?.data ?? err.message)
    return NextResponse.json(
      { erro: 'Falha ao gerar PIX. Tente novamente.' },
      { status: 500 }
    )
  }
}
