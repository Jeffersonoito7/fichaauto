import { NextResponse } from 'next/server'
import { assinarJwt } from '@/lib/jwt'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? ''
const ADMIN_SENHA = process.env.ADMIN_SENHA ?? ''
const ADMIN_NOME  = process.env.ADMIN_NOME  ?? 'Administrador'

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const { email, senha } = body

  if (!ADMIN_EMAIL || !ADMIN_SENHA) {
    return NextResponse.json({ erro: 'Sistema não configurado.' }, { status: 503 })
  }

  const match = email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() && senha === ADMIN_SENHA
  if (!match) {
    return NextResponse.json({ erro: 'E-mail ou senha incorretos.' }, { status: 401 })
  }

  try {
    const token = await assinarJwt({ email: ADMIN_EMAIL, nome: ADMIN_NOME, role: 'super_admin' })
    const res = NextResponse.json({ ok: true })
    res.cookies.set('ficha-auth', token, {
      httpOnly: true,
      secure:   true,
      sameSite: 'lax',
      maxAge:   60 * 60 * 24 * 7,
      path:     '/',
    })
    return res
  } catch (e: any) {
    // Fallback: se JWT falhar por algum motivo, usa base64 simples
    const payload = Buffer.from(JSON.stringify({ email: ADMIN_EMAIL, nome: ADMIN_NOME, role: 'super_admin' })).toString('base64')
    const res = NextResponse.json({ ok: true })
    res.cookies.set('ficha-auth', payload, {
      httpOnly: true,
      secure:   true,
      sameSite: 'lax',
      maxAge:   60 * 60 * 24 * 7,
      path:     '/',
    })
    console.error('[login] JWT falhou, usando base64:', e?.message)
    return res
  }
}
