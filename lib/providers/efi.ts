import axios from 'axios'
import https from 'https'

const SANDBOX = process.env.EFI_SANDBOX === 'true'
const BASE_URL = SANDBOX
  ? 'https://pix-h.api.efipay.com.br'
  : 'https://pix.api.efipay.com.br'

function makeAgent() {
  const certB64 = process.env.EFI_CERT_BASE64 ?? ''
  if (!certB64) throw new Error('EFI_CERT_BASE64 não configurado')
  return new https.Agent({
    pfx: Buffer.from(certB64, 'base64'),
    passphrase: '',
  })
}

async function getToken(): Promise<string> {
  const agent    = makeAgent()
  const clientId = process.env.EFI_CLIENT_ID ?? ''
  const secret   = process.env.EFI_CLIENT_SECRET ?? ''
  const basic    = Buffer.from(`${clientId}:${secret}`).toString('base64')

  const res = await axios.post(
    `${BASE_URL}/oauth/token`,
    { grant_type: 'client_credentials' },
    {
      httpsAgent: agent,
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/json',
      },
    }
  )
  return res.data.access_token
}

async function efiPost(path: string, body: object) {
  const token = await getToken()
  const agent = makeAgent()
  const res   = await axios.post(`${BASE_URL}${path}`, body, {
    httpsAgent: agent,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  })
  return res.data
}

async function efiGet(path: string) {
  const token = await getToken()
  const agent = makeAgent()
  const res   = await axios.get(`${BASE_URL}${path}`, {
    httpsAgent: agent,
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.data
}

export interface EfiCobResponse {
  txid: string
  loc: { id: number }
  valor: { original: string }
  status: string
}

export interface EfiQrCode {
  qrcode: string      // string base64 PNG
  imagemQrcode: string // data:image/png;base64,...
}

export async function criarCobranca(params: {
  valor: number
  descricao: string
  expiracao?: number
}): Promise<EfiCobResponse> {
  const chave = process.env.EFI_PIX_KEY ?? ''
  if (!chave) throw new Error('EFI_PIX_KEY não configurado')

  return efiPost('/v2/cob', {
    calendario: { expiracao: params.expiracao ?? 3600 },
    valor: { original: params.valor.toFixed(2) },
    chave,
    solicitacaoPagador: params.descricao,
  })
}

export async function obterQrCode(locId: number): Promise<EfiQrCode> {
  return efiGet(`/v2/loc/${locId}/qrcode`)
}

export async function consultarCobranca(txid: string) {
  return efiGet(`/v2/cob/${txid}`)
}

export async function registrarWebhook(pixKey: string, url: string) {
  const token = await getToken()
  const agent = makeAgent()
  await axios.put(`${BASE_URL}/v2/webhook/${pixKey}`, { webhookUrl: url }, {
    httpsAgent: agent,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  })
}
