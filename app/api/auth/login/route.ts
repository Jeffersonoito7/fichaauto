import { NextResponse } from 'next/server'
import { createHmac } from 'crypto'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? ''
const ADMIN_SENHA = process.env.ADMIN_SENHA ?? ''
const ADMIN_NOME  = process.env.ADMIN_NOME  ?? 'Administrador'

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const { email, senha } = body

  if (!ADMIN_EMAIL || !ADMIN_SENHA) {
    return NextResponse.json({ erro: 'Sistema não configurado.' }, { status: 503 })
  }

  const usuario = (email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() && senha === ADMIN_SENHA)
    ? { email: ADMIN_EMAIL, nome: ADMIN_NOME, role: 'super_admin' }
    : null

  if (!usuario) {
    return NextResponse.json({ erro: 'E-mail ou senha incorretos.' }, { status: 401 })
  }

  const secret = process.env.JWT_SECRET ?? 'fallback-secret'
  const now = Math.floor(Date.now() / 1000)
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    email: usuario.email,
    nome:  usuario.nome,
    role:  usuario.role,
    iat:   now,
    exp:   now + 60 * 60 * 24 * 7,
  })).toString('base64url')
  const sig = createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url')
  const token = `${header}.${payload}.${sig}`

  const res = NextResponse.json({ ok: true })
  res.cookies.set('ficha-auth', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })
  return res
}
