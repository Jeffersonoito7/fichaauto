import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// EFÍ envia POST com array de pagamentos confirmados
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const pagamentos: any[] = body?.pix ?? []

    if (!pagamentos.length) return NextResponse.json({ ok: true })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    for (const pag of pagamentos) {
      const txid = pag.txid
      if (!txid) continue

      // Buscar transação pendente
      const { data: transacao } = await supabase
        .from('transacoes_pix')
        .select('*')
        .eq('txid', txid)
        .eq('status', 'pendente')
        .single()

      if (!transacao) continue

      // Marcar como pago
      await supabase
        .from('transacoes_pix')
        .update({ status: 'pago', pago_em: new Date().toISOString() })
        .eq('txid', txid)

      // Adicionar saldo em R$ ao usuário
      const { data: perfil } = await supabase
        .from('perfis')
        .select('saldo')
        .eq('user_id', transacao.user_id)
        .single()

      const saldoAtual    = parseFloat(perfil?.saldo ?? '0')
      const saldoCreditado = parseFloat(transacao.saldo_creditado ?? transacao.valor ?? '0')
      await supabase
        .from('perfis')
        .upsert({
          user_id:      transacao.user_id,
          saldo:        parseFloat((saldoAtual + saldoCreditado).toFixed(2)),
          atualizado_em: new Date().toISOString(),
        }, { onConflict: 'user_id' })

      console.log(`[PIX webhook] txid=${txid} user=${transacao.user_id} +R$${saldoCreditado}`)
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[PIX webhook erro]', err.message)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
