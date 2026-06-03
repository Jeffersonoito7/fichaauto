import { NextResponse } from 'next/server'

const CREDENCIAIS = [
  { email: 'jefferson@fichaauto.com.br', senha: 'Ficha2026!', nome: 'Jefferson Soares', role: 'super_admin' },
]

export async function POST(req: Request) {
  const { email, senha } = await req.json()

  const usuario = CREDENCIAIS.find(
    c => c.email.toLowerCase() === email?.toLowerCase() && c.senha === senha
  )

  if (!usuario) {
    return NextResponse.json({ erro: 'E-mail ou senha incorretos.' }, { status: 401 })
  }

  const payload = Buffer.from(JSON.stringify({ email: usuario.email, nome: usuario.nome, role: usuario.role })).toString('base64')

  const res = NextResponse.json({ ok: true })
  res.cookies.set('ficha-auth', payload, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 dias
    path: '/',
  })
  return res
}
