import { NextResponse } from 'next/server'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? ''
const ADMIN_SENHA = process.env.ADMIN_SENHA ?? ''

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const { email, senha } = body

  if (!ADMIN_EMAIL) {
    return NextResponse.json({ erro: 'Sistema não configurado.', debug: 'no_admin_email' }, { status: 503 })
  }

  const match = email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() && senha === ADMIN_SENHA
  if (!match) {
    return NextResponse.json({ erro: 'E-mail ou senha incorretos.' }, { status: 401 })
  }

  // Sem JWT por agora - so retorna ok para confirmar que a rota funciona
  return NextResponse.json({ ok: true, debug: 'match_sem_cookie' })
}
