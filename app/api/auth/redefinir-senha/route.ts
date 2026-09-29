import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { hashSenha } from '@/lib/hash-senha'

const MINIMO_SENHA = 8

/** GET: a tela pergunta se o link ainda vale, antes de mostrar o formulário. */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') ?? ''
  if (!token) return NextResponse.json({ valido: false, motivo: 'Link inválido.' })

  const svc = createServiceRoleClient() as any
  const { data } = await svc
    .from('senha_tokens')
    .select('email, expira_em, usado_em')
    .eq('token_hash', createHash('sha256').update(token).digest('hex'))
    .maybeSingle()

  if (!data)                                   return NextResponse.json({ valido: false, motivo: 'Link inválido.' })
  if (data.usado_em)                           return NextResponse.json({ valido: false, motivo: 'Este link já foi usado.' })
  if (new Date(data.expira_em) < new Date())   return NextResponse.json({ valido: false, motivo: 'Este link expirou.' })

  // Devolve o e-mail mascarado só para a pessoa confirmar que é a conta certa.
  const [u, d] = data.email.split('@')
  const mascarado = `${u.slice(0, 2)}${'*'.repeat(Math.max(1, u.length - 2))}@${d}`
  return NextResponse.json({ valido: true, email: mascarado })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const token = String(body?.token ?? '')
  const senha = String(body?.senha ?? '')

  if (!token) return NextResponse.json({ erro: 'Link inválido.' }, { status: 400 })
  if (senha.length < MINIMO_SENHA) {
    return NextResponse.json({ erro: `A senha precisa ter ao menos ${MINIMO_SENHA} caracteres.` }, { status: 400 })
  }

  const svc = createServiceRoleClient() as any
  const tokenHash = createHash('sha256').update(token).digest('hex')

  const { data: reg } = await svc
    .from('senha_tokens')
    .select('id, email, expira_em, usado_em')
    .eq('token_hash', tokenHash)
    .maybeSingle()

  if (!reg)                                 return NextResponse.json({ erro: 'Link inválido.' },      { status: 400 })
  if (reg.usado_em)                         return NextResponse.json({ erro: 'Este link já foi usado.' }, { status: 400 })
  if (new Date(reg.expira_em) < new Date()) return NextResponse.json({ erro: 'Este link expirou.' },  { status: 400 })

  // Marca como usado ANTES de trocar a senha, e só segue se esta requisição
  // foi quem marcou. Dois cliques no mesmo link não trocam a senha duas vezes.
  const { data: marcado } = await svc
    .from('senha_tokens')
    .update({ usado_em: new Date().toISOString() })
    .eq('id', reg.id)
    .is('usado_em', null)
    .select('id')
    .maybeSingle()

  if (!marcado) return NextResponse.json({ erro: 'Este link já foi usado.' }, { status: 400 })

  const { error } = await svc
    .from('perfis')
    .update({ senha_hash: await hashSenha(senha), atualizado_em: new Date().toISOString() })
    .eq('email', reg.email)

  if (error) {
    console.error('[redefinir-senha]', error.message)
    return NextResponse.json({ erro: 'Não foi possível redefinir. Tente de novo.' }, { status: 500 })
  }

  // Invalida os outros links pendentes da mesma conta.
  await svc
    .from('senha_tokens')
    .update({ usado_em: new Date().toISOString() })
    .eq('email', reg.email)
    .is('usado_em', null)

  return NextResponse.json({ ok: true })
}
