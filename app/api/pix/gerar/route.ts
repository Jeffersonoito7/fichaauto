import { NextRequest, NextResponse } from 'next/server'
import { criarCobranca, obterQrCode } from '@/lib/providers/efi'
import { createClient } from '@supabase/supabase-js'

const PLANOS: Record<string, { consultas: number; valor: number; descricao: string }> = {
  r5:  { consultas: 5,  valor: 129.90, descricao: '5 consultas Ficha Auto' },
  r10: { consultas: 10, valor: 197.00, descricao: '10 consultas Ficha Auto' },
  r20: { consultas: 20, valor: 347.00, descricao: '20 consultas Ficha Auto' },
}

export async function POST(req: NextRequest) {
  try {
    const { planoId, userId } = await req.json()

    const plano = PLANOS[planoId]
    if (!plano) return NextResponse.json({ erro: 'Plano inválido' }, { status: 400 })

    // Criar cobrança PIX na EFÍ
    const cob = await criarCobranca({
      valor:     plano.valor,
      descricao: plano.descricao,
      expiracao: 3600,
    })

    // Buscar QR code
    const qr = await obterQrCode(cob.loc.id)

    // Salvar transação pendente no Supabase
    if (userId && process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      await supabase.from('transacoes_pix').insert({
        txid:         cob.txid,
        user_id:      userId,
        plano_id:     planoId,
        consultas:    plano.consultas,
        valor:        plano.valor,
        status:       'pendente',
      })
    }

    return NextResponse.json({
      txid:       cob.txid,
      valor:      plano.valor,
      consultas:  plano.consultas,
      qrCode:     qr.imagemQrcode,
      copiaECola: qr.qrcode,
      expira:     '60 minutos',
    })
  } catch (err: any) {
    console.error('[PIX gerar]', err?.response?.data ?? err.message)
    return NextResponse.json(
      { erro: 'Falha ao gerar PIX. Verifique as credenciais EFÍ.' },
      { status: 500 }
    )
  }
}
