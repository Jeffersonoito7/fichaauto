import { NextRequest, NextResponse } from 'next/server'
import { assinarJwt } from '@/lib/jwt'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? ''
const ADMIN_SENHA = process.env.ADMIN_SENHA ?? ''
const ADMIN_NOME  = process.env.ADMIN_NOME  ?? 'Administrador'

export async function POST(req: NextRequest) {
  const { email, senha } = await req.json()

  if (!ADMIN_EMAIL || !ADMIN_SENHA) {
    return NextResponse.json({ erro: 'Sistema não configurado.' }, { status: 503 })
  }

  const usuario = (email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() && senha === ADMIN_SENHA)
    ? { email: ADMIN_EMAIL, nome: ADMIN_NOME, role: 'super_admin' }
    : null

  if (!usuario) {
    return NextResponse.json({ erro: 'E-mail ou senha incorretos.' }, { status: 401 })
  }

  const token = await assinarJwt({ email: usuario.email, nome: usuario.nome, role: usuario.role })

  const res = NextResponse.json({ ok: true })
  res.cookies.set('ficha-auth', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })
  return res
}
