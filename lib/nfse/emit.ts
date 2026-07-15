import { createHash } from 'crypto'
import https from 'https'
import axios from 'axios'
import { SignedXml } from 'xml-crypto'
import { carregarCert } from './cert'
import { createServiceRoleClient } from '@/lib/supabase-server'

const NS = 'http://www.abrasf.org.br/nfse.xsd'
const NS_WS = 'http://nfse.abrasf.org.br'

function soDigitos(s: unknown): string {
  return String(s ?? '').replace(/\D/g, '')
}
function esc(s: unknown): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
function n2(v: unknown): string {
  return Number(v ?? 0).toFixed(2)
}
function escXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function unescXml(s: string): string {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')
}

export async function lerConfigNfse(): Promise<Record<string, string>> {
  const svc = createServiceRoleClient() as any
  const { data } = await svc.from('config_financeiro').select('chave, valor').order('chave')
  const cfg: Record<string, string> = {}
  for (const row of data ?? []) cfg[row.chave] = row.valor ?? ''
  return cfg
}

export async function proximoRps(): Promise<number> {
  const svc = createServiceRoleClient() as any
  const { data } = await svc.from('config_financeiro').select('valor').eq('chave', 'nfse_rps_seq').single()
  const n = (Number(data?.valor) || 0) + 1
  await svc.from('config_financeiro').upsert(
    { chave: 'nfse_rps_seq', valor: String(n), atualizado_em: new Date().toISOString() },
    { onConflict: 'chave' }
  )
  return n
}

interface Tomador {
  cpfCnpj?: string
  cnpj?: string
  cpf?: string
  doc?: string
  nome?: string
  razaoSocial?: string
  razao?: string
  email?: string
  inscricaoMunicipal?: string
  im?: string
  endereco?: {
    logradouro?: string
    endereco?: string
    numero?: string
    complemento?: string
    bairro?: string
    codigoCidade?: string
    codigoMunicipio?: string
    descricaoCidade?: string
    municipio?: string
    estado?: string
    uf?: string
    cep?: string
  }
}

interface DadosEmissao {
  valor: number | string
  descricao?: string
  tomador?: Tomador
  numeroRps?: number
  data?: string
}

function montarXml(cfg: Record<string, string>, dados: DadosEmissao): { xml: string; id: string } {
  const cnpjPrest = soDigitos(cfg.nfse_cnpj)
  const im = soDigitos(cfg.nfse_inscricao_mun)
  const ibge = soDigitos(cfg.nfse_municipio_ibge) || '2611101'
  const item = String(cfg.nfse_item_lc116 ?? '').trim()
  const aliq = n2(String(cfg.nfse_aliquota ?? '0').replace(',', '.'))
  const optante = cfg.nfse_optante_simples === 'true' ? '1' : '2'
  const incentivo = '2'
  const valor = n2(dados.valor)
  const hoje = dados.data ?? new Date().toISOString().slice(0, 10)
  const rpsNum = String(dados.numeroRps ?? 1)
  const rpsSerie = String(cfg.nfse_serie_rps ?? '1')
  const discr = esc(dados.descricao ?? cfg.nfse_descricao_servico ?? 'Prestação de serviço')

  const t: Tomador = dados.tomador ?? {}
  const docTom = soDigitos(t.cpfCnpj ?? t.cnpj ?? t.cpf ?? t.doc)
  const nomeTom = t.nome ?? t.razaoSocial ?? t.razao ?? ''

  let tomadorXml = ''
  if (docTom && nomeTom) {
    const idTom = docTom.length === 14 ? `<Cnpj>${docTom}</Cnpj>` : `<Cpf>${docTom}</Cpf>`
    const imTom = soDigitos(t.inscricaoMunicipal ?? t.im)
    const e = t.endereco ?? {}
    const logr = e.logradouro ?? e.endereco
    const endTom = logr
      ? `<Endereco>` +
        `<Endereco>${esc(logr)}</Endereco>` +
        `<Numero>${esc(e.numero ?? 'S/N')}</Numero>` +
        (e.complemento ? `<Complemento>${esc(e.complemento)}</Complemento>` : '') +
        `<Bairro>${esc(e.bairro ?? 'Centro')}</Bairro>` +
        `<CodigoMunicipio>${soDigitos(e.codigoCidade ?? e.codigoMunicipio ?? ibge)}</CodigoMunicipio>` +
        `<Uf>${esc(e.estado ?? e.uf ?? cfg.nfse_uf ?? 'PE')}</Uf>` +
        `<Cep>${soDigitos(e.cep) || '00000000'}</Cep>` +
        `</Endereco>`
      : ''
    tomadorXml =
      `<TomadorServico>` +
      `<IdentificacaoTomador><CpfCnpj>${idTom}</CpfCnpj>` +
      (imTom ? `<InscricaoMunicipal>${imTom}</InscricaoMunicipal>` : '') +
      `</IdentificacaoTomador>` +
      `<RazaoSocial>${esc(nomeTom)}</RazaoSocial>` +
      endTom +
      (t.email ? `<Contato><Email>${esc(t.email)}</Email></Contato>` : '') +
      `</TomadorServico>`
  }

  const id = `rps${rpsNum}`
  const inf =
    `<InfDeclaracaoPrestacaoServico Id="${id}">` +
    `<Rps>` +
    `<IdentificacaoRps><Numero>${rpsNum}</Numero><Serie>${esc(rpsSerie)}</Serie><Tipo>1</Tipo></IdentificacaoRps>` +
    `<DataEmissao>${hoje}</DataEmissao>` +
    `<Status>1</Status>` +
    `</Rps>` +
    `<Competencia>${hoje}</Competencia>` +
    `<Servico>` +
    `<Valores><ValorServicos>${valor}</ValorServicos><Aliquota>${aliq}</Aliquota></Valores>` +
    `<IssRetido>2</IssRetido>` +
    `<ItemListaServico>${esc(item)}</ItemListaServico>` +
    (cfg.nfse_codigo_tributacao ? `<CodigoTributacaoMunicipio>${esc(cfg.nfse_codigo_tributacao)}</CodigoTributacaoMunicipio>` : '') +
    `<Discriminacao>${discr}</Discriminacao>` +
    `<CodigoMunicipio>${ibge}</CodigoMunicipio>` +
    `<ExigibilidadeISS>1</ExigibilidadeISS>` +
    `</Servico>` +
    `<Prestador><CpfCnpj><Cnpj>${cnpjPrest}</Cnpj></CpfCnpj>` +
    (im ? `<InscricaoMunicipal>${im}</InscricaoMunicipal>` : '') +
    `</Prestador>` +
    tomadorXml +
    `<OptanteSimplesNacional>${optante}</OptanteSimplesNacional>` +
    `<IncentivoFiscal>${incentivo}</IncentivoFiscal>` +
    `</InfDeclaracaoPrestacaoServico>`

  const xml = `<GerarNfseEnvio xmlns="${NS}"><Rps>${inf}</Rps></GerarNfseEnvio>`
  return { xml, id }
}

function assinar(xml: string, _id: string, keyPem: string, certBase64: string): string {
  const sig = new SignedXml()
  ;(sig as any).signingKey = keyPem
  ;(sig as any).signatureAlgorithm = 'http://www.w3.org/2000/09/xmldsig#rsa-sha1'
  ;(sig as any).canonicalizationAlgorithm = 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315'
  sig.addReference({
    xpath: "//*[local-name(.)='InfDeclaracaoPrestacaoServico']",
    digestAlgorithm: 'http://www.w3.org/2000/09/xmldsig#sha1',
    transforms: [
      'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
      'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
    ],
  })
  ;(sig as any).keyInfoProvider = {
    getKeyInfo: () => `<X509Data><X509Certificate>${certBase64}</X509Certificate></X509Data>`,
  }
  sig.computeSignature(xml, {
    location: {
      reference: "//*[local-name(.)='InfDeclaracaoPrestacaoServico']",
      action: 'after',
    },
  })
  return sig.getSignedXml()
}

function assinarElemento(xml: string, localName: string, keyPem: string, certBase64: string): string {
  const sig = new SignedXml()
  ;(sig as any).signingKey = keyPem
  ;(sig as any).signatureAlgorithm = 'http://www.w3.org/2000/09/xmldsig#rsa-sha1'
  ;(sig as any).canonicalizationAlgorithm = 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315'
  sig.addReference({
    xpath: `//*[local-name(.)='${localName}']`,
    digestAlgorithm: 'http://www.w3.org/2000/09/xmldsig#sha1',
    transforms: [
      'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
      'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
    ],
  })
  ;(sig as any).keyInfoProvider = {
    getKeyInfo: () => `<X509Data><X509Certificate>${certBase64}</X509Certificate></X509Data>`,
  }
  sig.computeSignature(xml, {
    location: { reference: `//*[local-name(.)='${localName}']`, action: 'after' },
  })
  return sig.getSignedXml()
}

async function enviarSoap(
  endpoint: string,
  gerarNfseEnvioAssinado: string,
  keyPem: string,
  certPem: string
): Promise<{ status: number; body: string }> {
  const cabecalho = `<cabecalho versao="2.04" xmlns="${NS}"><versaoDados>2.04</versaoDados></cabecalho>`
  const soap =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:nfse="${NS_WS}">` +
    `<soapenv:Header/><soapenv:Body><nfse:GerarNfse><nfse:GerarNfseRequest>` +
    `<nfseCabecMsg>${escXml(cabecalho)}</nfseCabecMsg>` +
    `<nfseDadosMsg>${escXml(gerarNfseEnvioAssinado)}</nfseDadosMsg>` +
    `</nfse:GerarNfseRequest></nfse:GerarNfse></soapenv:Body>` +
    `</soapenv:Envelope>`

  const agent = new https.Agent({ key: keyPem, cert: certPem, rejectUnauthorized: false })
  const resp = await axios.post(endpoint, soap, {
    httpsAgent: agent,
    headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: `${NS_WS}/GerarNfse` },
    timeout: 60000,
    transformResponse: (x: unknown) => x,
    validateStatus: () => true,
  })
  return { status: resp.status, body: String(resp.data ?? '') }
}

function parseResposta(xmlBruto: string): {
  numero: string | null
  codigo: string | null
  erros: string[]
  xml: string | null
} {
  let xmlResp = xmlBruto
  const out = xmlBruto.match(/<(?:\w+:)?outputXML>([\s\S]*?)<\/(?:\w+:)?outputXML>/)
  if (out) xmlResp = unescXml(out[1])

  const get = (tag: string) => {
    const m = xmlResp.match(new RegExp(`<(?:\\w+:)?${tag}>([^<]*)<\\/(?:\\w+:)?${tag}>`))
    return m ? m[1] : null
  }

  const numero = get('Numero')
  const codigo = get('CodigoVerificacao')
  const erros: string[] = []
  const re = /<(?:\w+:)?MensagemRetorno>[\s\S]*?<\/(?:\w+:)?MensagemRetorno>/g
  let m
  while ((m = re.exec(xmlResp))) {
    const bloco = m[0]
    const cod = (bloco.match(/<(?:\w+:)?Codigo>([^<]*)\//) || bloco.match(/<(?:\w+:)?Codigo>([^<]*)</) || [])[1] ?? ''
    const msg = (bloco.match(/<(?:\w+:)?Mensagem>([^<]*)</) || [])[1] ?? ''
    const cor = (bloco.match(/<(?:\w+:)?Correcao>([^<]*)</) || [])[1] ?? ''
    if (msg) erros.push(`${cod ? '[' + cod + '] ' : ''}${msg}${cor ? ' - ' + cor : ''}`)
  }

  const comp = xmlResp.match(/<(?:\w+:)?CompNfse[\s\S]*?<\/(?:\w+:)?CompNfse>/)
  const nf = xmlResp.match(/<(?:\w+:)?Nfse[ >][\s\S]*?<\/(?:\w+:)?Nfse>/)
  const xmlNota = comp ? comp[0] : nf ? nf[0] : null

  return { numero, codigo, erros, xml: xmlNota }
}

export async function emitirNfse(
  cfg: Record<string, string>,
  dados: DadosEmissao
): Promise<{
  ok: boolean
  numero?: string
  codigoVerificacao?: string | null
  xml?: string | null
  httpStatus?: number
  erros?: string[]
  respostaBruta?: string
}> {
  const endpoint = String(cfg.nfse_url_servico ?? '').replace(/\?wsdl$/i, '')
  if (!endpoint) throw new Error('URL do serviço NFS-e não configurada.')

  const { keyPem, certPem, certBase64 } = await carregarCert()
  const { xml, id } = montarXml(cfg, dados)
  const assinado = assinar(xml, id, keyPem, certBase64)
  const { status, body } = await enviarSoap(endpoint, assinado, keyPem, certPem)
  const parsed = parseResposta(body)

  if (parsed.numero) {
    return {
      ok: true,
      numero: parsed.numero,
      codigoVerificacao: parsed.codigo,
      xml: parsed.xml,
      httpStatus: status,
    }
  }
  return {
    ok: false,
    httpStatus: status,
    erros: parsed.erros.length ? parsed.erros : ['A prefeitura recusou a nota.'],
    respostaBruta: body.slice(0, 4000),
  }
}

export async function cancelarNfse(
  cfg: Record<string, string>,
  dados: { numero: string; codigoCancelamento?: string }
): Promise<{ ok: boolean; erros?: string[]; respostaBruta?: string }> {
  const endpoint = String(cfg.nfse_url_servico ?? '').replace(/\?wsdl$/i, '')
  const { keyPem, certPem, certBase64 } = await carregarCert()
  const ibge = soDigitos(cfg.nfse_municipio_ibge) || '2611101'
  const cnpj = soDigitos(cfg.nfse_cnpj)
  const im = soDigitos(cfg.nfse_inscricao_mun)
  const numero = String(dados.numero)
  const codCanc = String(dados.codigoCancelamento ?? '1')

  const inf =
    `<InfPedidoCancelamento Id="cancel${numero}">` +
    `<IdentificacaoNfse><Numero>${esc(numero)}</Numero><CpfCnpj><Cnpj>${cnpj}</Cnpj></CpfCnpj>` +
    (im ? `<InscricaoMunicipal>${im}</InscricaoMunicipal>` : '') +
    `<CodigoMunicipio>${ibge}</CodigoMunicipio></IdentificacaoNfse>` +
    `<CodigoCancelamento>${esc(codCanc)}</CodigoCancelamento>` +
    `</InfPedidoCancelamento>`

  const pedidoAssinado = assinarElemento(`<Pedido>${inf}</Pedido>`, 'InfPedidoCancelamento', keyPem, certBase64)
  const dadosXml = `<CancelarNfseEnvio xmlns="${NS}">${pedidoAssinado}</CancelarNfseEnvio>`
  const cabecalho = `<cabecalho versao="2.04" xmlns="${NS}"><versaoDados>2.04</versaoDados></cabecalho>`
  const soap =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:nfse="${NS_WS}">` +
    `<soapenv:Header/><soapenv:Body><nfse:CancelarNfse><nfse:CancelarNfseRequest>` +
    `<nfseCabecMsg>${escXml(cabecalho)}</nfseCabecMsg><nfseDadosMsg>${escXml(dadosXml)}</nfseDadosMsg>` +
    `</nfse:CancelarNfseRequest></nfse:CancelarNfse></soapenv:Body></soapenv:Envelope>`

  const agent = new https.Agent({ key: keyPem, cert: certPem, rejectUnauthorized: false })
  const resp = await axios.post(endpoint, soap, {
    httpsAgent: agent,
    headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: `${NS_WS}/CancelarNfse` },
    timeout: 60000,
    transformResponse: (x: unknown) => x,
    validateStatus: () => true,
  })
  const body = String(resp.data ?? '')
  const out = body.match(/<outputXML>([\s\S]*?)<\/outputXML>/)
  const xmlOut = out ? unescXml(out[1]) : body
  if (/<DataHora>/.test(xmlOut) || /Confirmacao/.test(xmlOut)) return { ok: true }
  const parsed = parseResposta(body)
  return {
    ok: false,
    erros: parsed.erros.length ? parsed.erros : ['A prefeitura recusou o cancelamento.'],
    respostaBruta: body.slice(0, 3000),
  }
}
