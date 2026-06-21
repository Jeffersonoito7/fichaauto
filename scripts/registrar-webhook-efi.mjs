// Script para registrar o webhook PIX na EFÍ via API (executa uma vez)
// Uso: node scripts/registrar-webhook-efi.mjs
import https from 'https'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Carregar variáveis do .env.local manualmente
const envPath = path.join(__dirname, '..', '.env.local')
const envVars = {}
for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
  const m = line.match(/^([^#=\s]+)=(.+)$/)
  if (m) envVars[m[1]] = m[2].trim()
}

const CLIENT_ID     = envVars.EFI_CLIENT_ID
const CLIENT_SECRET = envVars.EFI_CLIENT_SECRET
const PIX_KEY       = envVars.EFI_PIX_KEY
const CERT_BASE64   = envVars.EFI_CERT_BASE64
const WEBHOOK_URL   = `https://fichaauto.com.br/api/pix/webhook?token=${envVars.PIX_WEBHOOK_SECRET}`

const certBuffer = Buffer.from(CERT_BASE64, 'base64')

function httpsRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => resolve({ status: res.statusCode, body: data }))
    })
    req.on('error', reject)
    if (body) req.write(body)
    req.end()
  })
}

async function getToken() {
  const creds = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')
  const body = JSON.stringify({ grant_type: 'client_credentials' })

  const res = await httpsRequest({
    hostname: 'pix.api.efipay.com.br',
    path: '/oauth/token',
    method: 'POST',
    headers: {
      'Authorization': `Basic ${creds}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    },
    pfx: certBuffer,
    passphrase: '',
    rejectUnauthorized: true,
  }, body)

  const data = JSON.parse(res.body)
  if (!data.access_token) throw new Error(`Token falhou: ${res.body}`)
  return data.access_token
}

async function registrarWebhook(token) {
  const chaveEncoded = encodeURIComponent(PIX_KEY)
  const body = JSON.stringify({ webhookUrl: WEBHOOK_URL })

  return httpsRequest({
    hostname: 'pix.api.efipay.com.br',
    path: `/v2/webhook/${chaveEncoded}`,
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    },
    pfx: certBuffer,
    passphrase: '',
    rejectUnauthorized: true,
  }, body)
}

async function consultarWebhook(token) {
  const chaveEncoded = encodeURIComponent(PIX_KEY)

  return httpsRequest({
    hostname: 'pix.api.efipay.com.br',
    path: `/v2/webhook/${chaveEncoded}`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
    pfx: certBuffer,
    passphrase: '',
    rejectUnauthorized: true,
  }, null)
}

async function main() {
  console.log('Chave PIX:', PIX_KEY)
  console.log('Webhook URL:', WEBHOOK_URL)
  console.log('')

  console.log('1. Obtendo token OAuth2...')
  const token = await getToken()
  console.log('   Token obtido com sucesso.')

  console.log('2. Registrando webhook...')
  const reg = await registrarWebhook(token)
  console.log(`   Status: ${reg.status}`)
  console.log(`   Resposta: ${reg.body || '(vazio)'}`)

  if (reg.status === 204 || reg.status === 200) {
    console.log('\nWebhook registrado com sucesso!')
    console.log('3. Verificando registro...')
    const consulta = await consultarWebhook(token)
    console.log(`   Confirmacao: ${consulta.body}`)
  } else {
    console.error('\nERRO ao registrar. Veja a resposta acima.')
  }
}

main().catch(err => {
  console.error('Erro fatal:', err.message)
  process.exit(1)
})
