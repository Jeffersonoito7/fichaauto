import { SignJWT, jwtVerify } from 'jose'

const secret = () => {
  const s = process.env.JWT_SECRET
  if (!s) throw new Error('JWT_SECRET não configurado')
  return new TextEncoder().encode(s)
}

export interface JwtPayload {
  email: string
  nome:  string
  role:  string
}

export async function assinarJwt(payload: JwtPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret())
}

export async function verificarJwt(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret())
    const { email, nome, role } = payload as Record<string, string>
    if (!email || !role) return null
    return { email, nome: nome ?? '', role }
  } catch {
    return null
  }
}
