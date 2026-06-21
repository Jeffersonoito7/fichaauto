import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// EFÍ envia POST para: /api/pix/webhook?token=PIX_WEBHOOK_SECRET
// Cadastrar essa URL exata no painel EFÍ (Configurações > PIX > Webhook)
export async function POST(req: NextRequest) {
  // 1. Autenticação: token obrigatório na query string
  const token = req.nextUrl.searchParams.get('token')
  if (!token || token !== process.env.PIX_WEBHOOK_SECRET) {
    console.warn('[PIX webhook] token inválido ou ausente')
    return NextResponse.json({ ok: false }, { status: 401 })
  }

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

      // 2. Update atômico: só altera se ainda estiver 'pendente'
      // Isso previne duplo crédito em caso de webhook duplicado
      const { data: transacao, error } = await supabase
        .from('transacoes_pix')
        .update({ status: 'pago', pago_em: new Date().toISOString() })
        .eq('txid', txid)
        .eq('status', 'pendente')
        .select('*')
        .maybeSingle()

      // Se não retornou nada, transação não existia ou já estava paga — ignora
      if (error || !transacao) {
        console.log(`[PIX webhook] txid=${txid} ignorado (já processado ou não encontrado)`)
        continue
      }

      // 3. Buscar saldo atual do usuário
      const { data: perfil } = await supabase
        .from('perfis')
        .select('saldo_veiculo, saldo_cpf, creditos_credito')
        .eq('user_id', transacao.user_id)
        .single()

      if (!perfil) {
        console.error(`[PIX webhook] txid=${txid} usuário ${transacao.user_id} não encontrado`)
        continue
      }

      // 4. Creditar na carteira correta
      if (transacao.creditos_creditados) {
        // Produto 3: contagem de consultas de crédito
        const { error: errCredito } = await supabase
          .from('perfis')
          .update({
            creditos_credito: Number(perfil.creditos_credito ?? 0) + Number(transacao.creditos_creditados),
            atualizado_em: new Date().toISOString(),
          })
          .eq('user_id', transacao.user_id)

        if (errCredito) {
          console.error(`[PIX webhook] falha ao creditar créditos txid=${txid}`, errCredito)
          // Reverter status para permitir nova tentativa
          await supabase
            .from('transacoes_pix')
            .update({ status: 'pendente', pago_em: null })
            .eq('txid', txid)
          continue
        }

        console.log(`[PIX webhook] txid=${txid} user=${transacao.user_id} +${transacao.creditos_creditados} créditos`)

      } else {
        // Produto 1 ou 2: valor em reais
        const saldoCreditado = parseFloat(transacao.saldo_creditado ?? transacao.valor ?? '0')
        const campo = transacao.produto === 'cpf' ? 'saldo_cpf' : 'saldo_veiculo'
        const saldoAtual = parseFloat(perfil[campo as keyof typeof perfil] as string ?? '0')

        const { error: errSaldo } = await supabase
          .from('perfis')
          .update({
            [campo]: parseFloat((saldoAtual + saldoCreditado).toFixed(2)),
            atualizado_em: new Date().toISOString(),
          })
          .eq('user_id', transacao.user_id)

        if (errSaldo) {
          console.error(`[PIX webhook] falha ao creditar saldo txid=${txid}`, errSaldo)
          // Reverter status para permitir nova tentativa
          await supabase
            .from('transacoes_pix')
            .update({ status: 'pendente', pago_em: null })
            .eq('txid', txid)
          continue
        }

        console.log(`[PIX webhook] txid=${txid} user=${transacao.user_id} +R$${saldoCreditado} ${campo}`)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[PIX webhook erro]', err.message)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
