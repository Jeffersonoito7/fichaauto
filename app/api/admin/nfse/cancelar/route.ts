import { NextRequest, NextResponse } from 'next/server'
import { verificarJwt } from '@/lib/jwt'
import { cookies } from 'next/headers'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { cancelarNfse, lerConfigNfse } from '@/lib/nfse/emit'

async function isSuperAdmin(): Promise<boolean> {
  const cookieStore = await cookies()
  const token = cookieStore.get('ficha-auth')?.value
  if (!token) return false
  const payload = await verificarJwt(token)
  return payload?.role === 'super_admin' || payload?.email === process.env.ADMIN_EMAIL
}

// POST — cancela NFS-e de uma cobrança
// Body: { cobranca_id: string, codigo_cancelamento?: string }
export async function POST(req: NextRequest) {
  if (!await isSuperAdmin()) return NextResponse.json({ erro: 'Sem acesso' }, { status: 403 })

  const body = await req.json()
  const { cobranca_id, numero, codigo_cancelamento } = body

  const svc = createServiceRoleClient() as any

  let nfseNumero = numero
  if (!nfseNumero && cobranca_id) {
    const { data: cob } = await svc.from('cobrancas').select('nfse_numero').eq('id', cobranca_id).single()
    nfseNumero = cob?.nfse_numero
  }

  if (!nfseNumero) return NextResponse.json({ erro: 'Informe o número da NFS-e ou cobranca_id com NFS-e emitida.' }, { status: 400 })

  const cfg = await lerConfigNfse()

  let resultado
  try {
    resultado = await cancelarNfse(cfg, { numero: String(nfseNumero), codigoCancelamento: codigo_cancelamento ?? '1' })
  } catch (e: any) {
    return NextResponse.json({ erro: e?.message ?? 'Falha ao cancelar NFS-e.' }, { status: 500 })
  }

  if (!resultado.ok) {
    return NextResponse.json({
      erro: resultado.erros?.join(' | ') ?? 'A prefeitura recusou o cancelamento.',
    }, { status: 422 })
  }

  if (cobranca_id) {
    await svc.from('cobrancas').update({
      nfse_numero: null,
      atualizado_em: new Date().toISOString(),
    }).eq('id', cobranca_id)
  }

  return NextResponse.json({ ok: true })
}
