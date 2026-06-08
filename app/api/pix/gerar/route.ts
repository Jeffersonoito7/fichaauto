import { NextRequest, NextResponse } from 'next/server'
import { criarCobranca, obterQrCode } from '@/lib/providers/efi'
import { createClient, createServiceRoleClient } from '@/lib/supabase-server'
import { PRECO, PACK_QUANTIDADE, PACK_DESCONTO, calcularPack, type TipoConsulta } from '@/lib/products'

export async function POST(req: NextRequest) {
  try {
    const { tipo, quantidade } = await req.json()

    if (!tipo || !['placa', 'cpf', 'cnpj'].includes(tipo)) {
      return NextResponse.json({ erro: 'Tipo inválido. Use: placa, cpf ou cnpj' }, { status: 400 })
    }
    if (quantidade !== 1 && quantidade !== PACK_QUANTIDADE) {
      return NextResponse.json({ erro: `Quantidade inválida. Use 1 (avulso) ou ${PACK_QUANTIDADE} (pack)` }, { status: 400 })
    }

    const tipoConsulta = tipo as TipoConsulta
    const precoUnitario = PRECO[tipoConsulta]

    let valorPago: number
    let saldoCreditado: number
    let descricaoPix: string

    if (quantidade === 1) {
      valorPago       = precoUnitario
      saldoCreditado  = precoUnitario
      descricaoPix    = `1 consulta ${tipoConsulta.toUpperCase()} — Ficha Auto`
    } else {
      const pack      = calcularPack(tipoConsulta)
      valorPago       = pack.comDesconto
      saldoCreditado  = pack.total          // cliente paga menos mas recebe valor cheio em saldo
      descricaoPix    = `${PACK_QUANTIDADE} consultas ${tipoConsulta.toUpperCase()} — Ficha Auto (10% off)`
    }

    // Autenticação
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

    // Criar cobrança PIX na EFÍ
    const cob = await criarCobranca({
      valor:     valorPago,
      descricao: descricaoPix,
      expiracao: 3600,
    })

    // Buscar QR code
    const qr = await obterQrCode(cob.loc.id)

    // Salvar transação pendente
    const svc = createServiceRoleClient() as any
    await svc.from('transacoes_pix').insert({
      txid:             cob.txid,
      user_id:          user.id,
      valor:            valorPago,
      saldo_creditado:  saldoCreditado,
      status:           'pendente',
    })

    return NextResponse.json({
      txid:            cob.txid,
      tipo:            tipoConsulta,
      quantidade,
      valorPago,
      saldoCreditado,
      qrCode:          qr.imagemQrcode,
      copiaECola:      qr.qrcode,
      expira:          '60 minutos',
    })
  } catch (err: any) {
    console.error('[PIX gerar]', err?.response?.data ?? err.message)
    return NextResponse.json({ erro: 'Falha ao gerar PIX. Tente novamente.' }, { status: 500 })
  }
}
