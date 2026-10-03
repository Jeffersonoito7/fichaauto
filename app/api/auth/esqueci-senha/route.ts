import { NextRequest, NextResponse } from 'next/server'
import { createHash, randomBytes } from 'crypto'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { enviarEmail, htmlRecuperacao, emailConfigurado } from '@/lib/email'
import { ipDaRequisicao, limitar, respostaLimiteExcedido } from '@/lib/rate-limit'

const VALIDADE_MINUTOS = 30
/** Quantos pedidos o mesmo e-mail pode fazer por hora. */
const LIMITE_POR_HORA = 3

export async function POST(req: NextRequest) {
  // O limite por e-mail (3 por hora) ja existia, mas nao segura quem varia o
  // e-mail para descobrir quais contas existem, nem quem so quer gastar nosso
  // envio. Este limite e por origem.
  const ip = ipDaRequisicao(req)
  const porIp = limitar(`esqueci:ip:${ip}`, 10, 60 * 60_000)
  if (!porIp.permitido) return respostaLimiteExcedido(porIp.esperarSegundos)

  const body = await req.json().catch(() => ({}))
  const email = String(body?.email ?? '').toLowerCase().trim()

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return NextResponse.json({ erro: 'Informe um e-mail válido.' }, { status: 400 })
  }

  // Resposta SEMPRE igual, exista ou não a conta. Responder diferente
  // transformaria esta rota num descobridor de e-mails cadastrados.
  const respostaPadrao = NextResponse.json({
    ok: true,
    mensagem: 'Se este e-mail estiver cadastrado, você receberá o link em instantes.',
  })

  try {
    const svc = createServiceRoleClient() as any

    const { data: perfil } = await svc
      .from('perfis')
      .select('email, nome, ativo, tenant_id')
      .eq('email', email)
      .maybeSingle()

    if (!perfil || perfil.ativo === false) return respostaPadrao

    // Trava de abuso: sem isto dá para inundar a caixa de alguém.
    const umaHoraAtras = new Date(Date.now() - 3_600_000).toISOString()
    const { count } = await svc
      .from('senha_tokens')
      .select('id', { count: 'exact', head: true })
      .eq('email', email)
      .gte('criado_em', umaHoraAtras)

    if ((count ?? 0) >= LIMITE_POR_HORA) return respostaPadrao

    // Marca do cliente, para o e-mail chegar com a cara que ele conhece.
    let nomeEmpresa = 'Ficha Auto'
    let cor = '#00A651'
    let host = process.env.NEXT_PUBLIC_APP_URL ?? 'https://fichaauto.com.br'

    if (perfil.tenant_id) {
      const { data: tenant } = await svc
        .from('tenants')
        .select('nome, nome_fantasia, cor_primaria, dominio')
        .eq('id', perfil.tenant_id)
        .maybeSingle()
      if (tenant) {
        nomeEmpresa = tenant.nome_fantasia ?? tenant.nome ?? nomeEmpresa
        cor = tenant.cor_primaria ?? cor
        if (tenant.dominio) host = `https://${tenant.dominio}`
      }
    }

    // O token em claro só existe no link. No banco fica o hash.
    const token = randomBytes(32).toString('base64url')
    const tokenHash = createHash('sha256').update(token).digest('hex')

    await svc.from('senha_tokens').insert({
      email,
      token_hash: tokenHash,
      expira_em: new Date(Date.now() + VALIDADE_MINUTOS * 60_000).toISOString(),
      ip,
    })

    if (!emailConfigurado()) {
      console.error('[esqueci-senha] RESEND_API_KEY ausente, link não enviado para', email)
      return respostaPadrao
    }

    await enviarEmail({
      para: email,
      assunto: `Redefinir sua senha — ${nomeEmpresa}`,
      html: htmlRecuperacao({
        link: `${host}/redefinir-senha?token=${token}`,
        nomeEmpresa,
        cor,
        validadeMinutos: VALIDADE_MINUTOS,
      }),
    })

    return respostaPadrao
  } catch (e: any) {
    console.error('[esqueci-senha]', e?.message ?? e)
    // Mesmo em falha interna a resposta não muda, pelo mesmo motivo.
    return respostaPadrao
  }
}
