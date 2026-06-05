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

      // Adicionar créditos ao usuário
      const { data: perfil } = await supabase
        .from('perfis')
        .select('saldo_consultas')
        .eq('user_id', transacao.user_id)
        .single()

      const saldoAtual = perfil?.saldo_consultas ?? 0
      await supabase
        .from('perfis')
        .upsert({
          user_id:           transacao.user_id,
          saldo_consultas:   saldoAtual + transacao.consultas,
          atualizado_em:     new Date().toISOString(),
        }, { onConflict: 'user_id' })

      console.log(`[PIX webhook] txid=${txid} user=${transacao.user_id} +${transacao.consultas} consultas`)
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[PIX webhook erro]', err.message)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
