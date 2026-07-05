import { cookies } from 'next/headers'
import { createServiceRoleClient } from './supabase-server'
import { verificarJwt } from './jwt'
import { randomUUID } from 'crypto'

export async function getAuthEmail(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('ficha-auth')?.value
    if (!token) return null
    const payload = await verificarJwt(token)
    return payload?.email ?? null
  } catch { return null }
}

export async function registrarAuditoria(opts: {
  email: string
  acao: string
  documento?: string
  custo?: number
  ip?: string
  sucesso?: boolean
  detalhes?: string
}): Promise<void> {
  try {
    const svc = createServiceRoleClient() as any
    await svc.from('audit_logs').insert({
      email:     opts.email,
      acao:      opts.acao,
      documento: opts.documento ?? null,
      custo:     opts.custo ?? null,
      ip:        opts.ip ?? null,
      sucesso:   opts.sucesso ?? true,
      detalhes:  opts.detalhes ?? null,
    })
  } catch (e: any) {
    console.error('[registrarAuditoria]', e?.message ?? e)
  }
}

export async function salvarConsulta(opts: {
  email: string
  tipo: 'veiculo' | 'cpf' | 'cnpj'
  documento: string
  descricao?: string
  resultado?: any
}) {
  try {
    // as any: Supabase precisa de tipos gerados (supabase gen types) para inferência de select()
    const svc = createServiceRoleClient() as any
    const token = randomUUID().replace(/-/g, '')
    const expires_at = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()

    const { data, error } = await svc.from('consultas').insert({
      email:       opts.email,
      tipo:        opts.tipo,
      documento:   opts.documento,
      descricao:   opts.descricao ?? null,
      status:      'realizada',
      token,
      resultado:   opts.resultado ? JSON.stringify(opts.resultado) : null,
      expires_at,
    }).select('id, token').single()

    if (error) {
      console.error('[salvarConsulta]', error.message)
      return null
    }
    return data as { id: string; token: string }
  } catch (e: any) {
    console.error('[salvarConsulta]', e.message)
    return null
  }
}
