import { NextRequest, NextResponse } from 'next/server'
import { criarCobranca, obterQrCode } from '@/lib/providers/efi'
import { createClient, createServiceRoleClient } from '@/lib/supabase-server'

// Pacotes B2B disponíveis para recarga de tenant
const PACOTES = {
  veiculo_10:  { produto: 'veiculo' as const, qtd: 10,  valorPago: 319.00,  saldoCreditado: 369.00, label: '10 consultas Veicular' },
  veiculo_50:  { produto: 'veiculo' as const, qtd: 50,  valorPago: 1390.00, saldoCreditado: 1845.00, label: '50 consultas Veicular' },
  veiculo_100: { produto: 'veiculo' as const, qtd: 100, valorPago: 2490.00, saldoCreditado: 3690.00, label: '100 consultas Veicular' },
  cpf_10:      { produto: 'cpf'     as const, qtd: 10,  valorPago: 129.00,  saldoCreditado: 149.00,  label: '10 consultas CPF' },
  cpf_50:      { produto: 'cpf'     as const, qtd: 50,  valorPago: 549.00,  saldoCreditado: 745.00,  label: '50 consultas CPF' },
  cpf_100:     { produto: 'cpf'     as const, qtd: 100, valorPago: 990.00,  saldoCreditado: 1490.00, label: '100 consultas CPF' },
} as const

type PacoteId = keyof typeof PACOTES

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

    const { pacote } = await req.json()
    if (!pacote || !(pacote in PACOTES)) {
      return NextResponse.json({ erro: 'Pacote inválido.' }, { status: 400 })
    }

    // Verificar que o usuário é admin do tenant
    const svc = createServiceRoleClient() as any
    const { data: perfil } = await svc
      .from('perfis')
      .select('tenant_id, tenant_role')
      .eq('user_id', user.id)
      .single()

    if (!perfil?.tenant_id || perfil.tenant_role !== 'admin') {
      return NextResponse.json({ erro: 'Acesso restrito ao administrador da revenda.' }, { status: 403 })
    }

    const p = PACOTES[pacote as PacoteId]

    // Criar cobrança Pix na EFÍ
    const cob = await criarCobranca({
      valor:     p.valorPago,
      descricao: `${p.label} — Ficha Auto`,
      expiracao: 3600,
    })

    const qr = await obterQrCode(cob.loc.id)

    // Salvar transação com tenant_id para o webhook creditar corretamente
    await svc.from('transacoes_pix').insert({
      txid:            cob.txid,
      user_id:         user.id,
      tenant_id:       perfil.tenant_id,
      valor:           p.valorPago,
      saldo_creditado: p.saldoCreditado,
      produto:         p.produto,
      status:          'pendente',
    })

    return NextResponse.json({
      txid:           cob.txid,
      pacote,
      valorPago:      p.valorPago,
      saldoCreditado: p.saldoCreditado,
      qtd:            p.qtd,
      produto:        p.produto,
      qrCode:         qr.imagemQrcode,
      copiaECola:     qr.qrcode,
      expira:         '60 minutos',
    })
  } catch (err: any) {
    console.error('[PIX tenant/recarga]', err?.response?.data ?? err.message)
    return NextResponse.json({ erro: 'Falha ao gerar PIX. Tente novamente.' }, { status: 500 })
  }
}
