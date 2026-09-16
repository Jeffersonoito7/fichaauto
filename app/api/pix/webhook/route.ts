import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { consultarVeiculo } from '@/lib/providers'
import { randomUUID } from 'crypto'

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

      // 3. Consulta avulsa (sem conta) — executa Assertiva e gera token
      if (transacao.produto === 'avulsa') {
        const placa = (transacao.descricao ?? '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
        if (!placa) {
          console.error(`[PIX webhook] avulsa sem placa txid=${txid}`)
          continue
        }

        try {
          const resultado = await consultarVeiculo(placa)
          const token = randomUUID().replace(/-/g, '')
          const expires_at = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()

          const pDesc = resultado.placa?.resposta?.descricao ?? resultado.placa?.resposta ?? {}
          const marca = pDesc.marcaModelo ?? pDesc.marca ?? placa

          await supabase.from('consultas' as any).insert({
            email:      'avulsa@fichaauto.com.br',
            tipo:       'veiculo',
            documento:  placa,
            descricao:  marca,
            status:     'realizada',
            token,
            resultado:  JSON.stringify(resultado),
            expires_at,
          })

          await supabase
            .from('transacoes_pix')
            .update({ resultado_token: token } as any)
            .eq('txid', txid)

          console.log(`[PIX webhook] avulsa txid=${txid} placa=${placa} token=${token}`)
        } catch (e: any) {
          console.error(`[PIX webhook] avulsa falha ao consultar placa txid=${txid}`, e.message)
          // Nao reverte o pagamento — deixa como pago e log para revisao manual
        }
        continue
      }

      // 4. Recarga de tenant (B2B) — ativa assinatura por 30 dias
      if (transacao.tenant_id && transacao.produto === 'assinatura') {
        const vence = new Date()
        vence.setDate(vence.getDate() + 30)

        const { error: errTenant } = await supabase
          .from('tenants')
          .update({
            assinatura_ativa:    true,
            assinatura_vence_em: vence.toISOString(),
          })
          .eq('id', transacao.tenant_id)

        if (errTenant) {
          console.error(`[PIX webhook] falha ao ativar assinatura txid=${txid}`, errTenant)
          await supabase.from('transacoes_pix').update({ status: 'pendente', pago_em: null }).eq('txid', txid)
          continue
        }

        console.log(`[PIX webhook] txid=${txid} tenant=${transacao.tenant_id} assinatura ativa ate ${vence.toISOString()}`)
        continue
      }

      // 4. Creditar atomicamente via RPC (elimina race condition de read+write)
      if (transacao.creditos_creditados) {
        const { error: errCredito } = await supabase.rpc('creditar_saldo', {
          p_user_id: transacao.user_id,
          p_campo:   'creditos_credito',
          p_valor:   Number(transacao.creditos_creditados),
        })

        if (errCredito) {
          console.error(`[PIX webhook] falha ao creditar créditos txid=${txid}`, errCredito)
          await supabase.from('transacoes_pix').update({ status: 'pendente', pago_em: null }).eq('txid', txid)
          continue
        }

        console.log(`[PIX webhook] txid=${txid} user=${transacao.user_id} +${transacao.creditos_creditados} créditos`)

      } else {
        const saldoCreditado = parseFloat(transacao.saldo_creditado ?? transacao.valor ?? '0')
        const campo = transacao.produto === 'cpf' ? 'saldo_cpf' : 'saldo_veiculo'

        const { error: errSaldo } = await supabase.rpc('creditar_saldo', {
          p_user_id: transacao.user_id,
          p_campo:   campo,
          p_valor:   saldoCreditado,
        })

        if (errSaldo) {
          console.error(`[PIX webhook] falha ao creditar saldo txid=${txid}`, errSaldo)
          await supabase.from('transacoes_pix').update({ status: 'pendente', pago_em: null }).eq('txid', txid)
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
