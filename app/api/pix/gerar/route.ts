import { NextRequest, NextResponse } from 'next/server'
import { criarCobranca, obterQrCode } from '@/lib/providers/efi'
import { createClient, createServiceRoleClient } from '@/lib/supabase-server'
import { PRECO, PACK_QUANTIDADE, PACK_DESCONTO, calcularPack, CREDITO, type TipoConsulta, type TipoCreditoCompra } from '@/lib/products'

export async function POST(req: NextRequest) {
  try {
    const { tipo, quantidade } = await req.json()

    const tiposValidos = ['placa', 'cpf', 'cnpj', 'credito_pack', 'credito_cpf', 'credito_cnpj']
    if (!tipo || !tiposValidos.includes(tipo)) {
      return NextResponse.json({ erro: 'Tipo inválido.' }, { status: 400 })
    }

    let valorPago: number
    let saldoCreditado: number
    let creditosCreditados: number | null = null
    let descricaoPix: string

    // ── Produto 3: Análise de Crédito ────────────────────────────────────────
    if (['credito_pack', 'credito_cpf', 'credito_cnpj'].includes(tipo)) {
      const t = tipo as TipoCreditoCompra
      if (t === 'credito_pack') {
        valorPago          = CREDITO.packValor
        saldoCreditado     = 0
        creditosCreditados = CREDITO.packQtd
        descricaoPix       = `Pack ${CREDITO.packQtd} consultas Crédito — Ficha Auto`
      } else if (t === 'credito_cpf') {
        valorPago          = CREDITO.avulsoCpf
        saldoCreditado     = 0
        creditosCreditados = 1
        descricaoPix       = `1 consulta Crédito CPF avulso — Ficha Auto`
      } else {
        valorPago          = CREDITO.avulsoCnpj
        saldoCreditado     = 0
        creditosCreditados = 1
        descricaoPix       = `1 consulta Crédito CNPJ avulso — Ficha Auto`
      }
    } else {
      // ── Produtos 1 e 2: Placa / CPF / CNPJ ────────────────────────────────
      if (quantidade !== 1 && quantidade !== PACK_QUANTIDADE) {
        return NextResponse.json({ erro: `Quantidade inválida. Use 1 ou ${PACK_QUANTIDADE}.` }, { status: 400 })
      }
      const tipoConsulta = tipo as TipoConsulta
      const precoUnitario = PRECO[tipoConsulta]
      if (quantidade === 1) {
        valorPago      = precoUnitario
        saldoCreditado = precoUnitario
        descricaoPix   = `1 consulta ${tipoConsulta.toUpperCase()} — Ficha Auto`
      } else {
        const pack     = calcularPack(tipoConsulta)
        valorPago      = pack.comDesconto
        saldoCreditado = pack.total
        descricaoPix   = `${PACK_QUANTIDADE} consultas ${tipoConsulta.toUpperCase()} — Ficha Auto (10% off)`
      }
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
      txid:                cob.txid,
      user_id:             user.id,
      valor:               valorPago,
      saldo_creditado:     saldoCreditado || null,
      creditos_creditados: creditosCreditados,
      status:              'pendente',
    })

    return NextResponse.json({
      txid:               cob.txid,
      tipo,
      quantidade:         quantidade ?? null,
      valorPago,
      saldoCreditado:     saldoCreditado || null,
      creditosCreditados: creditosCreditados ?? null,
      qrCode:             qr.imagemQrcode,
      copiaECola:         qr.qrcode,
      expira:             '60 minutos',
    })
  } catch (err: any) {
    console.error('[PIX gerar]', err?.response?.data ?? err.message)
    return NextResponse.json({ erro: 'Falha ao gerar PIX. Tente novamente.' }, { status: 500 })
  }
}
