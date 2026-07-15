import QRCode from 'qrcode'

function esc(v: unknown): string {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function digitos(v: unknown): string { return String(v ?? '').replace(/\D/g, '') }
function maskDoc(v: unknown): string {
  const d = digitos(v)
  if (d.length === 14) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
  if (d.length === 11) return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
  return String(v ?? '')
}
function maskCep(v: unknown): string {
  const d = digitos(v)
  return d.length === 8 ? d.replace(/^(\d{5})(\d{3})$/, '$1-$2') : String(v ?? '')
}
function brl(n: unknown): string {
  return 'R$ ' + Number(n ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function dataBR(iso: unknown): string {
  try {
    const d = new Date(String(iso))
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR').slice(0, 5)
  } catch { return '' }
}

const LC116: Record<string, string> = {
  '1.01': 'Análise e desenvolvimento de sistemas.',
  '1.02': 'Programação.',
  '1.03': 'Processamento, armazenamento ou hospedagem de dados, textos, imagens, vídeos, páginas eletrônicas, aplicativos e sistemas de informação, e congêneres.',
  '1.04': 'Elaboração de programas de computadores, inclusive de jogos eletrônicos.',
  '1.05': 'Licenciamento ou cessão de direito de uso de programas de computação.',
  '1.06': 'Assessoria e consultoria em informática.',
  '1.07': 'Suporte técnico em informática, inclusive instalação, configuração e manutenção de programas de computação e bancos de dados.',
  '1.08': 'Planejamento, confecção, manutenção e atualização de páginas eletrônicas.',
  '17.01': 'Assessoria ou consultoria de qualquer natureza.',
  '17.06': 'Propaganda e publicidade.',
}

function descItem(code: unknown): string {
  if (!code) return ''
  const c = String(code)
  if (LC116[c]) return LC116[c]
  const d = digitos(c)
  if (d.length >= 4) {
    const k = d.slice(0, 2) + '.' + d.slice(2, 4)
    if (LC116[k]) return LC116[k]
  }
  return ''
}

interface NotaNfse {
  numero: string | number
  codigoVerificacao?: string
  valor: number | string
  descricao?: string
  aliquota?: number | string
  data?: string
  status?: string
  rps?: number | string
  item?: string
  tomador?: {
    razaoSocial?: string
    nome?: string
    cpfCnpj?: string
    cpf?: string
    cnpj?: string
    doc?: string
    email?: string
    endereco?: {
      logradouro?: string
      numero?: string
      bairro?: string
      descricaoCidade?: string
      municipio?: string
      estado?: string
      uf?: string
      cep?: string
    }
  }
  tomadorNome?: string
  tomadorDoc?: string
}

function buildHtml(cfg: Record<string, string>, nota: NotaNfse, branding: { cor?: string; logo?: string | null }, qrDataUrl: string | null): string {
  const cor = branding.cor || '#046718'
  const logo = branding.logo
  const t = nota.tomador ?? {}
  const end = t.endereco ?? {}
  const valor = Number(nota.valor ?? 0)
  const aliq = Number(String(nota.aliquota ?? cfg.nfse_aliquota ?? '0').replace(',', '.')) || 0
  const iss = valor * aliq / 100
  const cancelada = nota.status === 'cancelada'
  const itemCode = nota.item ?? cfg.nfse_item_lc116 ?? ''
  const itemDesc = descItem(itemCode)
  const rps = nota.rps ?? ''
  const serieRps = cfg.nfse_serie_rps ?? '1'
  const competencia = (() => {
    try { const d = new Date(String(nota.data)); return String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear() }
    catch { return '' }
  })()
  const munIncidencia = (cfg.nfse_municipio ?? 'Petrolina') + '/' + (cfg.nfse_uf ?? 'PE')
  const prestEnd = [cfg.nfse_logradouro, cfg.nfse_numero_endereco].filter(Boolean).join(', ') +
    (cfg.nfse_bairro ? ' - ' + cfg.nfse_bairro : '') +
    (cfg.nfse_municipio ? ' - ' + cfg.nfse_municipio : '') +
    (cfg.nfse_uf ? '/' + cfg.nfse_uf : '') +
    (cfg.nfse_cep ? ' - CEP ' + maskCep(cfg.nfse_cep) : '')
  const tomNome = t.razaoSocial ?? t.nome ?? nota.tomadorNome ?? '-'
  const tomDoc = t.cpfCnpj ?? t.cnpj ?? t.cpf ?? t.doc ?? nota.tomadorDoc ?? ''
  const tomEnd = end.logradouro
    ? [end.logradouro, end.numero].filter(Boolean).join(', ') +
      (end.bairro ? ' - ' + end.bairro : '') +
      (end.descricaoCidade ?? end.municipio ? ' - ' + (end.descricaoCidade ?? end.municipio) : '') +
      (end.estado ?? end.uf ? '/' + (end.estado ?? end.uf) : '') +
      (end.cep ? ' - CEP ' + maskCep(end.cep) : '')
    : ''

  return `<!doctype html><html><head><meta charset="utf-8"><style>
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #1e293b; font-size: 12px; margin: 0; padding: 0; }
    .wrap { padding: 26px 30px; }
    .topbar { height: 6px; background: ${cor}; }
    .header { background: #fff; color: #0f172a; display: flex; justify-content: space-between; align-items: center; padding: 16px 30px; border-bottom: 2px solid ${cor}; }
    .header .brand { display: flex; align-items: center; gap: 16px; }
    .header img { height: 66px; max-width: 300px; object-fit: contain; }
    .header h1 { font-size: 16px; margin: 0; line-height: 1.15; color: ${cor}; }
    .header .sub { font-size: 11px; color: #64748b; }
    .header .num { text-align: right; font-size: 11px; line-height: 1.4; color: #334155; border: 1px solid ${cor}55; border-radius: 8px; padding: 8px 12px; }
    .header .num b { font-size: 22px; display: block; color: ${cor}; }
    .verif { display: flex; align-items: center; gap: 16px; border: 1px solid ${cor}44; border-radius: 10px; padding: 12px 16px; margin: 16px 0; background: ${cor}0c; }
    .verif img { width: 90px; height: 90px; }
    .verif .k { font-size: 11px; color: #64748b; }
    .verif .cod { font-size: 18px; font-weight: bold; color: ${cor}; letter-spacing: .04em; font-family: monospace; }
    .sec { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; margin-bottom: 10px; }
    .sec h2 { font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: ${cor}; margin: 0 0 6px; border-bottom: 1px solid #eef2f6; padding-bottom: 4px; }
    .row { display: flex; flex-wrap: wrap; gap: 2px 18px; }
    .f { font-size: 12px; margin: 1px 0; }
    .f span { color: #64748b; }
    .val { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed #e2e8f0; }
    .val:last-child { border-bottom: none; }
    .tot { font-weight: bold; font-size: 15px; color: ${cor}; border-top: 2px solid ${cor}; margin-top: 2px; padding-top: 6px; }
    .canc { position: fixed; top: 42%; left: 0; right: 0; text-align: center; font-size: 92px; color: rgba(220,38,38,.16); font-weight: bold; transform: rotate(-18deg); }
    .foot { margin-top: 14px; font-size: 10px; color: #94a3b8; text-align: center; }
    .disc { white-space: pre-wrap; font-size: 12px; }
  </style></head><body>
  ${cancelada ? '<div class="canc">CANCELADA</div>' : ''}
  <div class="topbar"></div>
  <div class="header">
    <div class="brand">
      ${logo ? `<img src="${logo}" alt="logo"/>` : ''}
      <div><h1>Nota Fiscal de Serviços Eletrônica</h1><div class="sub">Prefeitura Municipal de ${esc(cfg.nfse_municipio ?? 'Petrolina')} - ${esc(cfg.nfse_uf ?? 'PE')}</div></div>
    </div>
    <div class="num">Número da NFS-e<b>${esc(nota.numero)}</b>Emissão: ${esc(dataBR(nota.data))}${cancelada ? '<br><b style="font-size:12px">NOTA CANCELADA</b>' : ''}</div>
  </div>
  <div class="wrap">
    <div class="verif">
      ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR"/>` : ''}
      <div>
        <div class="k">Chave de acesso / código de verificação</div>
        <div class="cod">${esc(nota.codigoVerificacao ?? '-')}</div>
        <div class="k" style="margin-top:6px">Confira a autenticidade no portal da Prefeitura de ${esc(cfg.nfse_municipio ?? 'Petrolina')} informando o número (${esc(nota.numero)}) e esta chave.</div>
      </div>
    </div>
    <div class="sec">
      <h2>Prestador do serviço</h2>
      <div class="f"><b>${esc(cfg.nfse_razao_social ?? '')}</b></div>
      <div class="row"><div class="f"><span>CNPJ:</span> ${esc(maskDoc(cfg.nfse_cnpj))}</div><div class="f"><span>Inscrição municipal:</span> ${esc(cfg.nfse_inscricao_mun ?? '-')}</div></div>
      <div class="f"><span>Endereço:</span> ${esc(prestEnd)}</div>
    </div>
    <div class="sec">
      <h2>Tomador do serviço</h2>
      <div class="f"><b>${esc(tomNome)}</b></div>
      <div class="row"><div class="f"><span>CPF/CNPJ:</span> ${esc(maskDoc(tomDoc))}</div>${t.email ? `<div class="f"><span>E-mail:</span> ${esc(t.email)}</div>` : ''}</div>
      ${tomEnd ? `<div class="f"><span>Endereço:</span> ${esc(tomEnd)}</div>` : ''}
    </div>
    <div class="sec">
      <h2>Serviço prestado</h2>
      <div class="f"><span>Serviço (LC 116, item ${esc(itemCode || '-')}):</span> ${esc(itemDesc || 'não informado')}</div>
      <div class="row">${rps ? `<div class="f"><span>RPS:</span> nº ${esc(rps)} série ${esc(serieRps)}</div>` : ''}<div class="f"><span>Competência:</span> ${esc(competencia)}</div><div class="f"><span>Município de incidência:</span> ${esc(munIncidencia)}</div></div>
      <div class="f" style="margin-top:6px"><span>Discriminação:</span></div>
      <div class="disc">${esc(nota.descricao ?? '-')}</div>
    </div>
    <div class="sec">
      <h2>Valores</h2>
      <div class="val"><span>Valor dos serviços</span><span>${brl(valor)}</span></div>
      <div class="val"><span>Base de cálculo</span><span>${brl(valor)}</span></div>
      <div class="val"><span>Alíquota ISS</span><span>${aliq.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}%</span></div>
      <div class="val"><span>Valor do ISS</span><span>${brl(iss)}</span></div>
      <div class="val"><span>ISS retido pelo tomador</span><span>Não</span></div>
      <div class="val tot"><span>Valor líquido da nota</span><span>${brl(valor)}</span></div>
    </div>
    <div class="foot">Documento auxiliar da NFS-e. A validade jurídica é do registro eletrônico na Prefeitura de ${esc(cfg.nfse_municipio ?? 'Petrolina')}. Verifique a autenticidade pelo código de verificação no portal da prefeitura.</div>
  </div>
  </body></html>`
}

export async function gerarDanfsePdf(cfg: Record<string, string>, nota: NotaNfse, branding: { cor?: string; logo?: string | null }): Promise<Buffer> {
  let qrDataUrl: string | null = null
  try {
    const texto = `NFS-e ${nota.numero} | Cod ${nota.codigoVerificacao ?? ''} | CNPJ ${String(cfg.nfse_cnpj ?? '').replace(/\D/g, '')}`
    qrDataUrl = await QRCode.toDataURL(texto, { margin: 1, width: 180, color: { dark: branding.cor ?? '#046718', light: '#ffffff' } })
  } catch { qrDataUrl = null }

  const puppeteer = await import('puppeteer-core')
  const browser = await puppeteer.default.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH ?? '/usr/bin/chromium-browser',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })
  try {
    const page = await browser.newPage()
    await page.setContent(buildHtml(cfg, nota, branding, qrDataUrl), { waitUntil: 'networkidle0' })
    const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '0', bottom: '0', left: '0', right: '0' } })
    return Buffer.from(pdf)
  } finally {
    try { await browser.close() } catch { /* */ }
  }
}
