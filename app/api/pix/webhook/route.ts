import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { consultarVeiculo } from '@/lib/providers'
import { randomUUID, timingSafeEqual } from 'crypto'
import { reverterParaPendente } from '../_transacao'

// Webhook de aviso de pagamento da Efí.
//
// INCIDENTE 02/10/2026: a URL registrada na Efí era
// https://webhook.fichaauto.com.br/api/pix/webhook, SEM `?token=`, e esta rota
// exigia o token na query. Resultado: todo aviso de pagamento voltava 401 e era
// descartado. Agora o segredo e aceito por cabecalho TAMBEM, porque e assim que
// a Efí manda segredo quando configurada com header customizado, e a query
// continua valendo para nao quebrar quem ja usa a URL com token.
//
// A Efí tambem costuma chamar a URL cadastrada acrescentando `/pix` no final.
// Essa variante e atendida por app/api/pix/webhook/pix/route.ts, que reaproveita
// este mesmo handler.
const CABECALHOS_SEGREDO = [
  'x-webhook-token',    // nome que usamos ao cadastrar header customizado na Efí
  'x-pix-token',
  'authorization',      // aceita "Bearer <segredo>" ou o segredo cru
] as const

/** Compara em tempo constante, para o segredo nao vazar por timing. */
function segredoConfere(recebido: string, esperado: string): boolean {
  const a = Buffer.from(recebido)
  const b = Buffer.from(esperado)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

function autorizado(req: NextRequest): boolean {
  const esperado = process.env.PIX_WEBHOOK_SECRET
  if (!esperado) {
    // Sem segredo configurado nao ha como autenticar: recusa em vez de abrir.
    console.error('[PIX webhook] PIX_WEBHOOK_SECRET não configurado')
    return false
  }

  const daQuery = req.nextUrl.searchParams.get('token')
  if (daQuery && segredoConfere(daQuery, esperado)) return true

  for (const nome of CABECALHOS_SEGREDO) {
    const bruto = req.headers.get(nome)
    if (!bruto) continue
    const valor = bruto.replace(/^Bearer\s+/i, '').trim()
    if (valor && segredoConfere(valor, esperado)) return true
  }

  return false
}

export async function POST(req: NextRequest) {
  // 1. Autenticação: segredo por query (compatibilidade) ou por cabeçalho
  if (!autorizado(req)) {
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

          // Sem esse token gravado o visitante nao tem como abrir o relatorio
          // que acabou de pagar: se falhar, grita para revisao manual.
          const { error: errToken } = await supabase
            .from('transacoes_pix')
            .update({ resultado_token: token } as any)
            .eq('txid', txid)

          if (errToken) {
            console.error(
              `[PIX webhook] PAGO SEM ENTREGAR: falha ao gravar resultado_token txid=${txid} placa=${placa} token=${token}:`,
              errToken.message,
            )
            continue
          }

          console.log(`[PIX webhook] avulsa txid=${txid} placa=${placa} token=${token}`)
        } catch (e: any) {
          console.error(`[PIX webhook] avulsa falha ao consultar placa txid=${txid}`, e.message)
          // Nao reverte o pagamento — deixa como pago e log para revisao manual
        }
        continue
      }

      // 4a. Recarga de saldo da empresa (modelo pré-pago por consumo).
      // Soma no caixa da empresa, de onde todos os operadores consomem.
      if (transacao.tenant_id && transacao.produto === 'recarga_tenant') {
        const { error: errRec } = await supabase.rpc('creditar_saldo_tenant', {
          p_tenant_id: transacao.tenant_id,
          p_valor:     Number(transacao.saldo_creditado ?? transacao.valor),
        })
        if (errRec) {
          console.error(`[PIX webhook] falha ao creditar empresa txid=${txid}`, errRec)
          await reverterParaPendente(supabase, txid, 'credito de saldo da empresa')
          continue
        }
        console.log(`[PIX webhook] txid=${txid} empresa=${transacao.tenant_id} recarregada`)
        continue
      }

      // 4b. Recarga de tenant (B2B) — ativa assinatura por 30 dias
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
          await reverterParaPendente(supabase, txid, 'ativacao de assinatura do tenant')
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
          await reverterParaPendente(supabase, txid, 'credito de creditos de consulta')
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
          await reverterParaPendente(supabase, txid, 'credito de saldo do usuario')
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
