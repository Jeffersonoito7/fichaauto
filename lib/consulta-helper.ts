import { cookies } from 'next/headers'
import { createServiceRoleClient } from './supabase-server'
import { randomUUID } from 'crypto'

export function getEmailFromCookie(token: string): string | null {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'))
    return payload?.email ?? null
  } catch { return null }
}

export async function getAuthEmail(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('ficha-auth')?.value
    if (!token) return null
    return getEmailFromCookie(token)
  } catch { return null }
}

export async function salvarConsulta(opts: {
  email: string
  tipo: 'veiculo' | 'cpf' | 'cnpj'
  documento: string
  descricao?: string
  resultado?: any
}) {
  try {
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
