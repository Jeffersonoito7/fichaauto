import { NextRequest, NextResponse } from 'next/server'
import { verificarJwt } from '@/lib/jwt'
import { cookies } from 'next/headers'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { lerConfigNfse } from '@/lib/nfse/emit'
import { gerarDanfsePdf } from '@/lib/nfse/danfse'

async function isSuperAdmin(): Promise<boolean> {
  const cookieStore = await cookies()
  const token = cookieStore.get('ficha-auth')?.value
  if (!token) return false
  const payload = await verificarJwt(token)
  return payload?.role === 'super_admin' || payload?.email === process.env.ADMIN_EMAIL
}

export async function GET(_req: NextRequest, context: { params: Promise<{ numero: string }> }) {
  if (!await isSuperAdmin()) return NextResponse.json({ erro: 'Sem acesso' }, { status: 403 })

  const { numero } = await context.params
  const svc = createServiceRoleClient() as any

  const { data: cob } = await svc
    .from('cobrancas')
    .select('*, tenants(nome, nome_fantasia, cnpj, email_contato)')
    .eq('nfse_numero', numero)
    .single()

  if (!cob) return NextResponse.json({ erro: 'Cobrança com esta NFS-e não encontrada.' }, { status: 404 })

  const cfg = await lerConfigNfse()

  const nota = {
    numero: cob.nfse_numero,
    codigoVerificacao: (cob as any).nfse_codigo_verificacao ?? undefined,
    valor: cob.valor,
    descricao: cob.descricao,
    data: cob.criado_em,
    status: cob.status,
    item: cfg.nfse_item_lc116,
    aliquota: cfg.nfse_aliquota,
    tomadorNome: cob.tenants?.nome_fantasia ?? cob.tenants?.nome ?? '',
    tomadorDoc: cob.tenants?.cnpj ?? '',
  }

  const branding = { cor: '#046718', logo: null }

  try {
    const pdf = await gerarDanfsePdf(cfg, nota, branding)
    return new NextResponse(pdf as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="nfse-${numero}.pdf"`,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ erro: e?.message ?? 'Falha ao gerar PDF.' }, { status: 500 })
  }
}
