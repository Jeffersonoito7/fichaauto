import { NextRequest, NextResponse } from 'next/server'
import { verificarJwt } from '@/lib/jwt'
import { cookies } from 'next/headers'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { emitirNfse, lerConfigNfse, proximoRps } from '@/lib/nfse/emit'

async function isSuperAdmin(): Promise<boolean> {
  const cookieStore = await cookies()
  const token = cookieStore.get('ficha-auth')?.value
  if (!token) return false
  const payload = await verificarJwt(token)
  return payload?.role === 'super_admin' || payload?.email === process.env.ADMIN_EMAIL
}

// POST — emite NFS-e para uma cobrança
// Body: { cobranca_id: string, tomador?: object }
export async function POST(req: NextRequest) {
  if (!await isSuperAdmin()) return NextResponse.json({ erro: 'Sem acesso' }, { status: 403 })

  const body = await req.json()
  const { cobranca_id, tomador } = body

  if (!cobranca_id) return NextResponse.json({ erro: 'Informe cobranca_id.' }, { status: 400 })

  const svc = createServiceRoleClient() as any
  const { data: cob, error: cobErr } = await svc
    .from('cobrancas')
    .select('*, tenants(nome, nome_fantasia, cnpj, email_contato, endereco)')
    .eq('id', cobranca_id)
    .single()

  if (cobErr || !cob) return NextResponse.json({ erro: 'Cobrança não encontrada.' }, { status: 404 })
  if (cob.nfse_numero) return NextResponse.json({ erro: 'NFS-e já emitida para esta cobrança.' }, { status: 400 })

  const cfg = await lerConfigNfse()
  const numeroRps = await proximoRps()

  const tomadorFinal = tomador ?? (cob.tenants ? {
    razaoSocial: cob.tenants.nome_fantasia ?? cob.tenants.nome ?? '',
    cpfCnpj: cob.tenants.cnpj ?? '',
    email: cob.tenants.email_contato ?? '',
  } : undefined)

  let resultado
  try {
    resultado = await emitirNfse(cfg, {
      valor: cob.valor,
      descricao: cob.descricao,
      tomador: tomadorFinal,
      numeroRps,
      data: new Date().toISOString().slice(0, 10),
    })
  } catch (e: any) {
    return NextResponse.json({ erro: e?.message ?? 'Falha ao emitir NFS-e.' }, { status: 500 })
  }

  if (!resultado.ok) {
    return NextResponse.json({
      erro: resultado.erros?.join(' | ') ?? 'A prefeitura recusou a nota.',
      respostaBruta: resultado.respostaBruta,
    }, { status: 422 })
  }

  await svc.from('cobrancas').update({
    nfse_numero: resultado.numero,
    nfse_codigo_verificacao: resultado.codigoVerificacao ?? null,
    atualizado_em: new Date().toISOString(),
  }).eq('id', cobranca_id)

  return NextResponse.json({
    ok: true,
    numero: resultado.numero,
    codigoVerificacao: resultado.codigoVerificacao,
  })
}
