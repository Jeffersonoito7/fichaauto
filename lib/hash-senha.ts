import { createHmac } from 'crypto'
import bcrypt from 'bcryptjs'

export async function hashSenha(senha: string): Promise<string> {
  return bcrypt.hash(senha, 12)
}

// Verifica senha contra bcrypt ou HMAC legado
export async function verificarSenha(senha: string, hash: string): Promise<boolean> {
  if (hash.startsWith('$2')) {
    return bcrypt.compare(senha, hash)
  }
  const salt = process.env.JWT_SECRET ?? 'fallback-secret'
  return hash === createHmac('sha256', salt).update(senha).digest('hex')
}
