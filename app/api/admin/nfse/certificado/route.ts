import { NextRequest, NextResponse } from 'next/server'
import { verificarJwt } from '@/lib/jwt'
import { cookies } from 'next/headers'
import { salvarCert, statusCert, parsePfx } from '@/lib/nfse/cert'

async function isSuperAdmin(): Promise<boolean> {
  const cookieStore = await cookies()
  const token = cookieStore.get('ficha-auth')?.value
  if (!token) return false
  const payload = await verificarJwt(token)
  return payload?.role === 'super_admin' || payload?.email === process.env.ADMIN_EMAIL
}

// GET — status do certificado
export async function GET() {
  if (!await isSuperAdmin()) return NextResponse.json({ erro: 'Sem acesso' }, { status: 403 })
  const status = await statusCert()
  return NextResponse.json(status)
}

// POST — upload do certificado
// Body JSON: { pfx_base64: string, senha: string }
export async function POST(req: NextRequest) {
  if (!await isSuperAdmin()) return NextResponse.json({ erro: 'Sem acesso' }, { status: 403 })

  const body = await req.json()
  const { pfx_base64, senha } = body
  if (!pfx_base64) return NextResponse.json({ erro: 'Envie o campo pfx_base64 com o conteúdo do arquivo .pfx em base64.' }, { status: 400 })

  let pfxBuffer: Buffer
  try {
    pfxBuffer = Buffer.from(pfx_base64, 'base64')
  } catch {
    return NextResponse.json({ erro: 'pfx_base64 inválido.' }, { status: 400 })
  }

  let info: { titular: string; validoAte: Date | null }
  try {
    const parsed = parsePfx(pfxBuffer, senha ?? '')
    info = { titular: parsed.titular, validoAte: parsed.validoAte }
  } catch (e: any) {
    return NextResponse.json({ erro: 'Certificado ou senha inválidos. Confira o arquivo .pfx e a senha.' }, { status: 400 })
  }

  await salvarCert(pfxBuffer, senha ?? '')

  return NextResponse.json({
    ok: true,
    configurado: true,
    titular: info.titular,
    validoAte: info.validoAte,
  })
}
