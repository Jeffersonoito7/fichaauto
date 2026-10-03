import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { criarCobranca, obterQrCode } from '@/lib/providers/efi'
import { randomUUID } from 'crypto'

const VALOR_AVULSO = 34.00

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST(req: NextRequest) {
  try {
    const { placa: placaRaw } = await req.json()
    const placa = (placaRaw ?? '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
    if (placa.length < 7) {
      return NextResponse.json({ erro: 'Placa inválida' }, { status: 400 })
    }

    const cob = await criarCobranca({
      valor:     VALOR_AVULSO,
      descricao: `Consulta Completa ${placa} — Ficha Auto`,
      expiracao: 1800,
    })

    const qr = await obterQrCode(cob.loc.id)

    const pedidoId = randomUUID()

    // A transacao PRECISA estar gravada antes de a gente mostrar o QR code.
    // Sem a linha no banco o webhook da Efi nao tem o que encontrar pelo txid e
    // o cliente paga sem jeito de receber o relatorio. Por isso o erro aborta a
    // rota: e melhor o visitante ver "tente novamente" do que pagar no vazio.
    const { error: errInsert } = await svc().from('transacoes_pix').insert({
      txid:           cob.txid,
      user_id:        null,
      produto:        'avulsa',
      valor:          VALOR_AVULSO,
      saldo_creditado: 0,
      status:         'pendente',
      descricao:      placa,
      pedido_id:      pedidoId,
    })

    if (errInsert) {
      console.error(
        `[avulsa/gerar] FALHA AO GRAVAR TRANSACAO txid=${cob.txid} placa=${placa}:`,
        errInsert.message, errInsert.details ?? '',
      )
      return NextResponse.json(
        { erro: 'Não foi possível iniciar o pagamento. Tente novamente.' },
        { status: 500 },
      )
    }

    return NextResponse.json({
      txid:      cob.txid,
      pedidoId,
      placa,
      valor:     VALOR_AVULSO,
      qrcode:    qr.imagemQrcode,
      copiaCola: qr.qrcode,
    })
  } catch (err: any) {
    console.error('[avulsa/gerar]', err.message)
    return NextResponse.json({ erro: 'Erro ao gerar cobrança PIX' }, { status: 500 })
  }
}
