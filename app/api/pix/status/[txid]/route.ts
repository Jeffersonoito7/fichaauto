import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

  const { data: perfil } = await supabase
    .from('perfis')
    .select('saldo_veiculo, saldo_cpf, creditos_credito')
    .eq('user_id', transacao.user_id)
    .single()

  if (!perfil) return false

  if (transacao.creditos_creditados) {
    const { error: err } = await supabase
      .from('perfis')
      .update({
        creditos_credito: Number(perfil.creditos_credito ?? 0) + Number(transacao.creditos_creditados),
        atualizado_em: new Date().toISOString(),
      })
      .eq('user_id', transacao.user_id)

    if (err) {
      await supabase.from('transacoes_pix').update({ status: 'pendente', pago_em: null }).eq('txid', transacao.txid)
      return false
    }
  } else {
    const saldoCreditado = parseFloat(transacao.saldo_creditado ?? transacao.valor ?? '0')
    const campo = transacao.produto === 'cpf' ? 'saldo_cpf' : 'saldo_veiculo'
    const saldoAtual = parseFloat(perfil[campo] ?? '0')

    const { error: err } = await supabase
      .from('perfis')
      .update({
        [campo]: parseFloat((saldoAtual + saldoCreditado).toFixed(2)),
        atualizado_em: new Date().toISOString(),
      })
      .eq('user_id', transacao.user_id)

    if (err) {
      await supabase.from('transacoes_pix').update({ status: 'pendente', pago_em: null }).eq('txid', transacao.txid)
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
  const { txid } = await params

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: transacao } = await supabase
    .from('transacoes_pix')
    .select('*')
    .eq('txid', txid)
    .single()

  if (!transacao) return NextResponse.json({ status: 'nao_encontrado' })

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
