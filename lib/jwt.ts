import { createHmac } from 'crypto'

const getSecret = () => {
  const s = process.env.JWT_SECRET
  if (!s) throw new Error('JWT_SECRET não configurado')
  return s
}

export interface JwtPayload {
  email: string
  nome:  string
  role:  string
}

function b64url(str: string) {
  return Buffer.from(str).toString('base64url')
}

export async function assinarJwt(payload: JwtPayload): Promise<string> {
  const secret = getSecret()
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
    const secret = getSecret()
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const [header, body, sig] = parts
    const expected = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url')
    if (sig !== expected) return null
    const data = JSON.parse(Buffer.from(body, 'base64url').toString())
    if (data.exp && data.exp < Math.floor(Date.now() / 1000)) return null
    const { email, nome, role } = data
    if (!email || !role) return null
    return { email, nome: nome ?? '', role }
  } catch {
    return null
  }
}
