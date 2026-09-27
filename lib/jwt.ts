import { createHmac } from 'crypto'

export interface JwtPayload {
  email: string
  nome:  string
  role:  string
}

function b64url(str: string) {
  return Buffer.from(str).toString('base64url')
}

/**
 * Segredo de assinatura da sessão.
 *
 * Isto existia como `process.env.JWT_SECRET ?? 'fallback-secret'` e a variável
 * nunca foi configurada em produção, então todo token estava assinado com uma
 * string pública: qualquer um podia forjar sessão de super admin. Falhar aqui é
 * obrigatório, porque um segredo previsível é pior que o sistema não subir.
 */
function segredo(): string {
  const s = process.env.JWT_SECRET
  if (!s || s.length < 32) {
    throw new Error('JWT_SECRET ausente ou curto demais. Configure com pelo menos 32 caracteres.')
  }
  return s
}

export async function assinarJwt(payload: JwtPayload): Promise<string> {
  const secret = segredo()
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body   = b64url(JSON.stringify({
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
  }))
  const sig = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url')
  return `${header}.${body}.${sig}`
}

export async function verificarJwt(token: string): Promise<JwtPayload | null> {
  try {
    // Formato JWT (3 partes separadas por ponto)
    if (token.includes('.') && token.split('.').length === 3) {
      const secret = segredo()
      const [header, body, sig] = token.split('.')
      const expected = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url')
      if (sig !== expected) return null
      const data = JSON.parse(Buffer.from(body, 'base64url').toString())
      if (data.exp && data.exp < Math.floor(Date.now() / 1000)) return null
      const { email, nome, role } = data
      if (!email || !role) return null
      return { email, nome: nome ?? '', role }
    }

    // Formato legado: base64 puro (cookie antigo)
    const data = JSON.parse(Buffer.from(token, 'base64').toString())
    const { email, nome, role } = data
    if (!email || !role) return null
    return { email, nome: nome ?? '', role }
  } catch {
    return null
  }
}
