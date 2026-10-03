import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthEmail } from '@/lib/consulta-helper'
import { reverterParaPendente } from '../../_transacao'

// Busca status de pagamento PIX na EFÍ e credita saldo se confirmado.
// Chamado pelo frontend em polling a cada 5s — dispensa webhook com mTLS.

async function getEfiToken(): Promise<string | null> {
  try {
    const certBase64 = process.env.EFI_CERT_BASE64
    if (!certBase64) return null

    // Importa https dinamicamente (Node.js — não disponível no edge runtime)
    const https = await import('https')
    const certBuffer = Buffer.from(certBase64, 'base64')
    const creds = Buffer.from(
      `${process.env.EFI_CLIENT_ID}:${process.env.EFI_CLIENT_SECRET}`
    ).toString('base64')

    const body = JSON.stringify({ grant_type: 'client_credentials' })

    return new Promise((resolve) => {
      const agent = new https.Agent({ pfx: certBuffer, passphrase: '', rejectUnauthorized: true })
      const req = https.request({
        hostname: 'pix.api.efipay.com.br',
        path: '/oauth/token',
        method: 'POST',
        headers: {
          'Authorization': `Basic ${creds}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
        agent,
      }, res => {
        let d = ''
        res.on('data', c => d += c)
        res.on('end', () => {
          try { resolve(JSON.parse(d).access_token ?? null) } catch { resolve(null) }
        })
      })
      req.on('error', () => resolve(null))
      req.write(body)
      req.end()
    })
  } catch {
    return null
  }
}

async function consultarPagamentoEfi(txid: string, token: string): Promise<boolean> {
  try {
    const https = await import('https')
    const certBuffer = Buffer.from(process.env.EFI_CERT_BASE64!, 'base64')
    const agent = new https.Agent({ pfx: certBuffer, passphrase: '', rejectUnauthorized: true })

    return new Promise((resolve) => {
      const req = https.request({
        hostname: 'pix.api.efipay.com.br',
        path: `/v2/cob/${txid}`,
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
        agent,
      }, res => {
        let d = ''
        res.on('data', c => d += c)
        res.on('end', () => {
          try {
            const data = JSON.parse(d)
            // EFÍ retorna status "CONCLUIDA" quando pago
            resolve(data?.status === 'CONCLUIDA')
          } catch { resolve(false) }
        })
      })
      req.on('error', () => resolve(false))
      req.end()
    })
  } catch {
    return false
  }
}

async function creditarSaldo(supabase: any, transacao: any): Promise<boolean> {
  // Update atômico: só processa se ainda estiver 'pendente'
  const { data: atualizado, error } = await supabase
    .from('transacoes_pix')
    .update({ status: 'pago', pago_em: new Date().toISOString() })
    .eq('txid', transacao.txid)
    .eq('status', 'pendente')
    .select('*')
    .maybeSingle()

  if (error || !atualizado) return false // já foi processado

  // Recarga de empresa (caminho da AutoVale): o dono e o tenant, nao a pessoa.
  // Antes esta funcao ia direto buscar o perfil por user_id, que nesse produto e
  // nulo; nao achava nada e devolvia false SEM reverter, deixando a transacao
  // 'pago' sem credito. Como o webhook so processa o que esta 'pendente', o
  // saldo nunca mais era creditado: dinheiro recebido e nao entregue.
  if (transacao.tenant_id && transacao.produto === 'recarga_tenant') {
    const { error: errRec } = await supabase.rpc('creditar_saldo_tenant', {
      p_tenant_id: transacao.tenant_id,
      p_valor:     Number(transacao.saldo_creditado ?? transacao.valor),
    })
    if (errRec) {
      await reverterParaPendente(supabase, transacao.txid, 'recarga de empresa (polling)')
      return false
    }
    console.log(`[PIX status] txid=${transacao.txid} empresa=${transacao.tenant_id} recarregada via polling`)
    return true
  }

  // Assinatura de tenant e consulta avulsa de visitante têm tratamento próprio
  // no webhook (ativar assinatura / consultar a placa e gerar o token). Reverter
  // devolve a transacao para 'pendente' para o webhook concluir a entrega, em
  // vez de travar o pedido como 'pago' e sem nada entregue.
  if (transacao.produto === 'avulsa' || transacao.produto === 'assinatura' || !transacao.user_id) {
    await reverterParaPendente(supabase, transacao.txid, `produto '${transacao.produto}' é entregue pelo webhook`)
    return false
  }

  // Crédito atômico via RPC, igual ao webhook: ler o saldo e somar em JS
  // permitia duas requisicoes concorrentes gravarem o mesmo valor base.
  if (transacao.creditos_creditados) {
    const { error: err } = await supabase.rpc('creditar_saldo', {
      p_user_id: transacao.user_id,
      p_campo:   'creditos_credito',
      p_valor:   Number(transacao.creditos_creditados),
    })

    if (err) {
      await reverterParaPendente(supabase, transacao.txid, 'credito de creditos de consulta (polling)')
      return false
    }
  } else {
    const saldoCreditado = parseFloat(transacao.saldo_creditado ?? transacao.valor ?? '0')
    const campo = transacao.produto === 'cpf' ? 'saldo_cpf' : 'saldo_veiculo'

    const { error: err } = await supabase.rpc('creditar_saldo', {
      p_user_id: transacao.user_id,
      p_campo:   campo,
      p_valor:   saldoCreditado,
    })

    if (err) {
      await reverterParaPendente(supabase, transacao.txid, 'credito de saldo do usuario (polling)')
      return false
    }
  }

  console.log(`[PIX status] txid=${transacao.txid} creditado via polling`)
  return true
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ txid: string }> }
) {
  const email = await getAuthEmail()
  if (!email) return NextResponse.json({ status: 'nao_autorizado' }, { status: 401 })

  const { txid } = await params

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Verifica se a transacao pertence ao usuario autenticado
  const { data: transacao } = await supabase
    .from('transacoes_pix')
    .select('txid, status, saldo_creditado, valor, user_id, tenant_id, produto, creditos_creditados')
    .eq('txid', txid)
    .single()

  if (!transacao) return NextResponse.json({ status: 'nao_encontrado' })

  // Busca user_id do email autenticado para comparar
  const { data: perfil } = await supabase
    .from('perfis')
    .select('user_id, role, tenant_id')
    .eq('email', email)
    .maybeSingle()

  const isSuperAdmin = perfil?.role === 'super_admin'
  const isOwner = perfil?.user_id === transacao.user_id
  const isTenantAdmin = perfil?.tenant_id && perfil.tenant_id === transacao.tenant_id

  if (!isSuperAdmin && !isOwner && !isTenantAdmin) {
    return NextResponse.json({ status: 'nao_encontrado' })
  }

  // Se já está pago no banco, retorna direto
  if (transacao.status === 'pago') {
    return NextResponse.json({
      status: 'pago',
      saldoCreditado: transacao.saldo_creditado,
      valor: transacao.valor,
    })
  }

  // Se ainda pendente, consulta a EFÍ para ver se o pagamento foi confirmado
  const efiToken = await getEfiToken()
  if (efiToken) {
    const foiPago = await consultarPagamentoEfi(txid, efiToken)
    if (foiPago) {
      await creditarSaldo(supabase, transacao)
      return NextResponse.json({
        status: 'pago',
        saldoCreditado: transacao.saldo_creditado,
        valor: transacao.valor,
      })
    }
  }

  return NextResponse.json({
    status: transacao.status,
    saldoCreditado: transacao.saldo_creditado,
    valor: transacao.valor,
  })
}
