const TCU_BASE = 'https://certidoes.apps.tcu.gov.br/api/publico'
const TCU_APF  = 'https://certidoes-apf.apps.tcu.gov.br/api/rest/publico'
const CEIS_BASE = 'https://api.portaldatransparencia.gov.br/api-de-dados'

async function tcuPost(endpoint: string, cpf?: string, cnpj?: string) {
  try {
    const body: Record<string, string> = {}
    if (cpf)  body.cpf  = cpf
    if (cnpj) body.cnpj = cnpj
    const res = await fetch(`${TCU_BASE}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : (data?.content ?? data?.items ?? [])
  } catch { return [] }
}

async function tcuCnpjConsolidado(cnpj: string) {
  try {
    const res = await fetch(`${TCU_APF}/certidoes/${cnpj}?seEmitirPDF=false`, {
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}

async function ceisGet(codigo: string) {
  try {
    const key = process.env.TRANSPARENCIA_API_KEY
    if (!key) return []
    const res = await fetch(`${CEIS_BASE}/ceis?codigoSancionado=${codigo}&pagina=1`, {
      headers: { 'chave-api-dados': key },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch { return [] }
}

async function cnepGet(codigo: string) {
  try {
    const key = process.env.TRANSPARENCIA_API_KEY
    if (!key) return []
    const res = await fetch(`${CEIS_BASE}/cnep?codigoSancionado=${codigo}&pagina=1`, {
      headers: { 'chave-api-dados': key },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch { return [] }
}

export async function consultarSancoesCpf(cpf: string) {
  const [inidoneos, inabilitados, contasIrreg, ceis, cnep] = await Promise.all([
    tcuPost('responsaveis-inidoneos',          cpf),
    tcuPost('responsaveis-inabilitados',       cpf),
    tcuPost('responsaveis-contas-irregulares', cpf),
    ceisGet(cpf),
    cnepGet(cpf),
  ])

  const temSancao =
    inidoneos.length > 0 ||
    inabilitados.length > 0 ||
    contasIrreg.length > 0 ||
    ceis.length > 0 ||
    cnep.length > 0

  return { inidoneos, inabilitados, contasIrreg, ceis, cnep, temSancao }
}

export async function consultarSancoesCnpj(cnpj: string) {
  // TCU APF: endpoint consolidado já inclui CEIS e CNEP internamente
  // Chamamos CEIS/CNEP separado apenas se tiver chave (redundância para detalhes extras)
  const [consolidado, ceis, cnep] = await Promise.all([
    tcuCnpjConsolidado(cnpj),
    ceisGet(cnpj),
    cnepGet(cnpj),
  ])

  // A API TCU retorna campo "situacao": "NADA_CONSTA" | "CONSTA"
  // e campo "tipo": "Inidôneos" | "CNIA" | "CEIS" | "CNEP" etc.
  const certidoes: any[] = consolidado?.certidoes ?? []

  const certComSancao = certidoes.filter((c: any) =>
    c.situacao && c.situacao !== 'NADA_CONSTA'
  )

  const inidoneos    = certidoes.filter((c: any) => c.tipo?.toLowerCase().includes('inidôn') && c.situacao !== 'NADA_CONSTA')
  const inabilitados = certidoes.filter((c: any) => c.tipo?.toLowerCase().includes('inabilit') && c.situacao !== 'NADA_CONSTA')
  const ceisResultTcu = certidoes.filter((c: any) => c.tipo?.toUpperCase() === 'CEIS' && c.situacao !== 'NADA_CONSTA')
  const cnepResultTcu = certidoes.filter((c: any) => c.tipo?.toUpperCase() === 'CNEP' && c.situacao !== 'NADA_CONSTA')

  // Mescla TCU + Portal da Transparência (sem duplicar)
  const ceisTotal = ceisResultTcu.length > 0 ? ceisResultTcu : ceis
  const cnepTotal = cnepResultTcu.length > 0 ? cnepResultTcu : cnep

  const temSancao =
    certComSancao.length > 0 ||
    ceis.length > 0 ||
    cnep.length > 0

  return {
    consolidadoTcu: consolidado,
    todasCertidoes: certidoes,
    inidoneos,
    inabilitados,
    ceis: ceisTotal,
    cnep: cnepTotal,
    temSancao,
  }
}
