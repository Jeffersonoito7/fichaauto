// ─── Critério único de admin para as rotas de /api/admin ─────────────────────
// Antes este mesmo bloco estava copiado em cada rota (integracao, fornecedores,
// tenants, usuarios). Copiar critério de autorização é como o furo aparece:
// basta um arquivo novo esquecer de colar o bloco. Aqui existe um só lugar.

import { NextResponse } from 'next/server'
import { getAuthEmail } from './consulta-helper'
import { createServiceRoleClient } from './supabase-server'

/** É super admin pelo perfil, ou é o e-mail do dono definido no ambiente. */
export async function isAdmin(email: string): Promise<boolean> {
  if (!email) return false
  // O dono passa mesmo sem linha em `perfis`, igual ao login de ADMIN_EMAIL.
  if (process.env.ADMIN_EMAIL && email === process.env.ADMIN_EMAIL) return true
  try {
    const svc = createServiceRoleClient() as any
    const { data } = await svc.from('perfis').select('role').eq('email', email).maybeSingle()
    return data?.role === 'super_admin'
  } catch (e: any) {
    // Falha de banco não libera rota administrativa.
    console.error('[admin-guard]', e?.message ?? e)
    return false
  }
}

export type ResultadoAdmin =
  | { ok: true; email: string }
  | { ok: false; resposta: NextResponse }

/**
 * Uso nas rotas:
 *   const auth = await exigirAdmin()
 *   if (!auth.ok) return auth.resposta
 *
 * Responde 403 com as duas grafias de chave ('erro' e 'error') porque as telas
 * existentes leem uma ou outra.
 */
export async function exigirAdmin(): Promise<ResultadoAdmin> {
  const email = await getAuthEmail()
  if (!email || !(await isAdmin(email))) {
    return {
      ok: false,
      resposta: NextResponse.json(
        { erro: 'Não autorizado', error: 'Nao autorizado' },
        { status: 403 },
      ),
    }
  }
  return { ok: true, email }
}
