import { NextResponse } from 'next/server'
import { assinarJwt }   from '@/lib/jwt'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { hashSenha, verificarSenha } from '@/lib/hash-senha'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? ''
const ADMIN_SENHA = process.env.ADMIN_SENHA ?? ''
const ADMIN_NOME  = process.env.ADMIN_NOME  ?? 'Administrador'

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const { email, senha } = body

  if (!email || !senha) {
    return NextResponse.json({ erro: 'E-mail e senha obrigatórios.' }, { status: 400 })
  }

  const emailNorm = email.toLowerCase().trim()

  // 1. Super admin via variavel de ambiente
  if (
    ADMIN_EMAIL &&
    ADMIN_SENHA &&
    emailNorm === ADMIN_EMAIL.toLowerCase() &&
    senha === ADMIN_SENHA
  ) {
    const token = await assinarJwt({ email: ADMIN_EMAIL, nome: ADMIN_NOME, role: 'super_admin' })
    const res = NextResponse.json({ ok: true, role: 'super_admin' })
    res.cookies.set('ficha-auth', token, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 604800, path: '/' })
    return res
  }

  // 2. Usuarios comuns — busca no banco
  const supabase = createServiceRoleClient() as any
  const { data: perfil } = await supabase
    .from('perfis')
    .select('email, nome, senha_hash, role, tenant_id, tenant_role, ativo, pode_placa, pode_cpf, pode_cnpj')
    .eq('email', emailNorm)
    .maybeSingle()

  if (!perfil) {
    return NextResponse.json({ erro: 'E-mail ou senha incorretos.' }, { status: 401 })
  }

  if (!perfil.ativo) {
    return NextResponse.json({ erro: 'Conta aguardando aprovação. Entre em contato com o administrador.' }, { status: 403 })
  }

  if (!perfil.senha_hash) {
    return NextResponse.json({ erro: 'Senha não configurada. Entre em contato com o administrador.' }, { status: 403 })
  }

  const senhaCorreta = await verificarSenha(senha, perfil.senha_hash)
  if (!senhaCorreta) {
    return NextResponse.json({ erro: 'E-mail ou senha incorretos.' }, { status: 401 })
  }

  // Migracao transparente: se ainda estiver em HMAC, re-salvar como bcrypt
  if (!perfil.senha_hash.startsWith('$2')) {
    const novoHash = await hashSenha(senha)
    await supabase.from('perfis').update({ senha_hash: novoHash }).eq('email', emailNorm)
  }

  const role = perfil.role === 'super_admin' ? 'super_admin' : 'user'
  const token = await assinarJwt({ email: perfil.email, nome: perfil.nome ?? '', role })

  const res = NextResponse.json({ ok: true, role })
  res.cookies.set('ficha-auth', token, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 604800, path: '/' })
  return res
}
