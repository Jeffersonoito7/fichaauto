import { createHmac } from 'crypto'

export interface JwtPayload {
  email: string
  nome:  string
  role:  string
}

function b64url(str: string) {
  return Buffer.from(str).toString('base64url')
}

export async function assinarJwt(payload: JwtPayload): Promise<string> {
  const secret = process.env.JWT_SECRET ?? 'fallback-secret'
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
      const secret = process.env.JWT_SECRET ?? 'fallback-secret'
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
