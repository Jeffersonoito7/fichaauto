import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'
import { createServiceRoleClient } from '@/lib/supabase-server'
import forge from 'node-forge'

function getKey(): Buffer {
  const k = process.env.DATA_ENCRYPTION_KEY
  if (!k) throw new Error('DATA_ENCRYPTION_KEY não configurada no ambiente.')
  return createHash('sha256').update(k).digest()
}

export function encryptBuffer(buf: Buffer): Buffer {
  const key = getKey()
  const iv = randomBytes(16)
  const c = createCipheriv('aes-256-cbc', key, iv)
  return Buffer.concat([iv, c.update(buf), c.final()])
}

export function decryptBuffer(buf: Buffer): Buffer {
  const key = getKey()
  const iv = buf.subarray(0, 16)
  const d = createDecipheriv('aes-256-cbc', key, iv)
  return Buffer.concat([d.update(buf.subarray(16)), d.final()])
}

export async function salvarCert(pfxBuffer: Buffer, senha: string): Promise<void> {
  const svc = createServiceRoleClient() as any
  const encPfx = encryptBuffer(pfxBuffer).toString('base64')
  const encPass = encryptBuffer(Buffer.from(senha, 'utf8')).toString('base64')
  await svc.from('config_financeiro').upsert(
    { chave: 'cert_pfx_enc', valor: encPfx, atualizado_em: new Date().toISOString() },
    { onConflict: 'chave' }
  )
  await svc.from('config_financeiro').upsert(
    { chave: 'cert_pass_enc', valor: encPass, atualizado_em: new Date().toISOString() },
    { onConflict: 'chave' }
  )
}

export function parsePfx(pfxBuffer: Buffer, senha: string): {
  keyPem: string
  certPem: string
  certBase64: string
  titular: string
  validoAte: Date | null
} {
  const p12Der = forge.util.createBuffer(pfxBuffer.toString('binary'))
  const p12Asn1 = forge.asn1.fromDer(p12Der)
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, senha)

  let privateKey: forge.pki.PrivateKey | null = null
  let cert: forge.pki.Certificate | null = null

  for (const sc of p12.safeContents) {
    for (const sb of sc.safeBags) {
      if (
        (sb.type === forge.pki.oids.pkcs8ShroudedKeyBag || sb.type === forge.pki.oids.keyBag) &&
        sb.key && !privateKey
      ) {
        privateKey = sb.key
      }
      if (sb.type === forge.pki.oids.certBag && sb.cert && !cert) {
        cert = sb.cert
      }
    }
  }

  if (!privateKey || !cert) throw new Error('Não foi possível extrair chave/certificado do arquivo .pfx.')

  const keyPem = forge.pki.privateKeyToPem(privateKey as forge.pki.rsa.PrivateKey)
  const certPem = forge.pki.certificateToPem(cert)
  const certBase64 = certPem.replace(/-----(BEGIN|END) CERTIFICATE-----/g, '').replace(/\s+/g, '')

  const cnField = cert.subject.getField('CN')
  const titular = cnField ? String(cnField.value) : ''
  const validoAte = cert.validity.notAfter ?? null

  return { keyPem, certPem, certBase64, titular, validoAte }
}

export async function carregarCert(): Promise<{ keyPem: string; certPem: string; certBase64: string }> {
  const svc = createServiceRoleClient() as any
  const { data } = await svc
    .from('config_financeiro')
    .select('chave, valor')
    .in('chave', ['cert_pfx_enc', 'cert_pass_enc'])

  const map: Record<string, string> = {}
  for (const row of data ?? []) map[row.chave] = row.valor ?? ''

  if (!map.cert_pfx_enc) throw new Error('Certificado digital não configurado. Faça o upload do .pfx nas configurações.')

  const pfxBuffer = decryptBuffer(Buffer.from(map.cert_pfx_enc, 'base64'))
  const senha = map.cert_pass_enc
    ? decryptBuffer(Buffer.from(map.cert_pass_enc, 'base64')).toString('utf8')
    : ''

  const { keyPem, certPem, certBase64 } = parsePfx(pfxBuffer, senha)
  return { keyPem, certPem, certBase64 }
}

export async function statusCert(): Promise<{
  configurado: boolean
  titular?: string
  validoAte?: Date | null
  erro?: string
}> {
  const svc = createServiceRoleClient() as any
  const { data } = await svc
    .from('config_financeiro')
    .select('chave, valor')
    .in('chave', ['cert_pfx_enc', 'cert_pass_enc'])

  const map: Record<string, string> = {}
  for (const row of data ?? []) map[row.chave] = row.valor ?? ''

  if (!map.cert_pfx_enc) return { configurado: false }

  try {
    const pfxBuffer = decryptBuffer(Buffer.from(map.cert_pfx_enc, 'base64'))
    const senha = map.cert_pass_enc
      ? decryptBuffer(Buffer.from(map.cert_pass_enc, 'base64')).toString('utf8')
      : ''
    const { titular, validoAte } = parsePfx(pfxBuffer, senha)
    return { configurado: true, titular, validoAte }
  } catch (e: any) {
    return { configurado: true, erro: e?.message ?? 'Erro ao ler certificado.' }
  }
}
