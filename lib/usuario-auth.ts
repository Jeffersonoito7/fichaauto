// ─── Identidade no Supabase Auth ─────────────────────────────────────────────
// A tabela `perfis` tem FK obrigatória: `user_id REFERENCES auth.users(id)`.
// O login do sistema é JWT próprio (lib/jwt.ts) com senha em `perfis.senha_hash`,
// mas a identidade continua ancorada no Auth por causa dessa FK.
//
// Por isso NÃO adianta gerar um UUID qualquer no cadastro: o insert falha com
// 23503 (chave estrangeira). Foi exatamente o que deixou o cadastro do site
// quebrado, respondendo 500 para todo mundo.

import { createServiceRoleClient } from '@/lib/supabase-server'

export interface ResultadoIdentidade {
  userId: string | null
  erro?: string
}

/**
 * Devolve o id do Auth para um e-mail, criando a identidade se ela não existir.
 *
 * NUNCA mexe em quem já existe: se o e-mail já está no Auth, apenas devolve o
 * id. Atualizar um usuário existente aqui trocaria a senha de alguém sem que
 * essa pessoa tenha pedido, que é um problema que já tivemos em outro projeto.
 */
export async function garantirUsuarioAuth(email: string): Promise<ResultadoIdentidade> {
  const emailNorm = email.toLowerCase().trim()
  const svc = createServiceRoleClient() as any

  try {
    // Sem senha: quem se cadastra pelo site define a dela depois, pelo fluxo de
    // recuperação por e-mail. O cadastro nasce inativo, aguardando aprovação.
    const { data, error } = await svc.auth.admin.createUser({
      email: emailNorm,
      email_confirm: true,
    })

    if (!error && data?.user?.id) return { userId: data.user.id }

    // Já existe: procura o id em vez de falhar, e sem tocar no cadastro dele.
    const jaExiste =
      error?.status === 422 ||
      /already|registered|exists/i.test(String(error?.message ?? ''))

    if (jaExiste) {
      const id = await procurarIdPorEmail(svc, emailNorm)
      if (id) return { userId: id }
      return { userId: null, erro: 'Conta já existe, mas não foi possível localizá-la.' }
    }

    console.error('[usuario-auth] createUser falhou:', error?.message ?? error)
    return { userId: null, erro: 'Não foi possível criar a identidade.' }
  } catch (e: any) {
    console.error('[usuario-auth]', e?.message ?? e)
    return { userId: null, erro: 'Não foi possível criar a identidade.' }
  }
}

/** Varre as páginas do Auth atrás do e-mail. Lista grande é paginada. */
async function procurarIdPorEmail(svc: any, email: string): Promise<string | null> {
  for (let pagina = 1; pagina <= 20; pagina++) {
    const { data, error } = await svc.auth.admin.listUsers({ page: pagina, perPage: 200 })
    if (error) return null
    const lista: any[] = data?.users ?? []
    const achado = lista.find(u => String(u.email ?? '').toLowerCase() === email)
    if (achado?.id) return achado.id
    if (lista.length < 200) return null
  }
  return null
}
