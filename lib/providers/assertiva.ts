// Assertiva API v3 — OAuth2 + todos os módulos disponíveis
// Documentação: https://integracao.assertivasolucoes.com.br/v3/doc/

const BASE_URL  = 'https://api.assertivasolucoes.com.br'
const TOKEN_URL = 'https://api.assertivasolucoes.com.br/oauth2/v3/token'
const LOGIN     = process.env.ASSERTIVA_LOGIN    ?? ''
const PASSWORD  = process.env.ASSERTIVA_PASSWORD ?? ''
const FINALIDADE = 2 // Ciclo de crédito (LGPD)

let _token: string | null = null
let _tokenExpiry = 0

async function getToken(): Promise<string> {
  if (_token && Date.now() < _tokenExpiry) return _token

  const basic = Buffer.from(`${LOGIN}:${PASSWORD}`).toString('base64')
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  })

  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Assertiva token error ${res.status}: ${txt}`)
  }

  const json = await res.json()
  _token = json.access_token ?? json.token
  _tokenExpiry = Date.now() + (json.expires_in ?? 3600) * 1000 - 300_000
  return _token!
}

async function get(path: string) {
  const token = await getToken()
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Assertiva ${path} erro ${res.status}`)
  return res.json()
}

function limpaPlaca(p: string)  { return p.replace(/[^A-Z0-9]/gi, '').toUpperCase() }
function limpaCpf(c: string)    { return c.replace(/\D/g, '') }
function limpaCnpj(c: string)   { return c.replace(/\D/g, '') }

// ═══════════════════════════════════════════════════════════════
// MÓDULOS — VEÍCULOS (API v3)
// A API v3 exige: 1) consulta-base (retorna protocolo) → 2) demais-consultas
// ═══════════════════════════════════════════════════════════════

/** Consulta base — identificação completa + protocolo para demais consultas */
export async function consultarPlaca(placa: string) {
  return get(`/veiculos/v3/consulta-base?tipo=placa&documento=${limpaPlaca(placa)}&idFinalidade=${FINALIDADE}`)
}

/** BIN Federal — roubo/furto, RENAJUD */
export async function consultarBinFederal(placa: string, protocolo?: string) {
  const proto = protocolo ?? (await consultarPlaca(placa))?.cabecalho?.protocolo
  return get(`/veiculos/v3/demais-consultas?tipo=placa&documento=${limpaPlaca(placa)}&consulta=binfederal&protocolo=${proto}&idFinalidade=${FINALIDADE}`)
}

/** Indício de sinistro + precificador */
export async function consultarSinistro(placa: string, protocolo?: string) {
  const proto = protocolo ?? (await consultarPlaca(placa))?.cabecalho?.protocolo
  return get(`/veiculos/v3/demais-consultas?tipo=placa&documento=${limpaPlaca(placa)}&consulta=indiciosinistro&protocolo=${proto}&idFinalidade=${FINALIDADE}`)
}

/** Gravame — histórico de financiamento */
export async function consultarGravame(placa: string, protocolo?: string) {
  const proto = protocolo ?? (await consultarPlaca(placa))?.cabecalho?.protocolo
  return get(`/veiculos/v3/demais-consultas?tipo=placa&documento=${limpaPlaca(placa)}&consulta=gravame&protocolo=${proto}&idFinalidade=${FINALIDADE}`)
}

/** Histórico de leilão (Base A + B + Remarketing) */
export async function consultarLeilao(placa: string, protocolo?: string) {
  const proto = protocolo ?? (await consultarPlaca(placa))?.cabecalho?.protocolo
  return get(`/veiculos/v3/demais-consultas?tipo=placa&documento=${limpaPlaca(placa)}&consulta=historicoleilao&protocolo=${proto}&idFinalidade=${FINALIDADE}`)
}

/** BIN Estadual — restrições estaduais */
export async function consultarBinEstadual(placa: string, protocolo?: string) {
  const proto = protocolo ?? (await consultarPlaca(placa))?.cabecalho?.protocolo
  return get(`/veiculos/v3/demais-consultas?tipo=placa&documento=${limpaPlaca(placa)}&consulta=binestadual&protocolo=${proto}&idFinalidade=${FINALIDADE}`)
}

/** Decodificador de chassi */
export async function consultarChassi(chassi: string) {
  return get(`/veiculos/v3/consulta-base?tipo=chassi&documento=${chassi}&idFinalidade=${FINALIDADE}`)
}

/** Histórico de veículos por CPF */
export async function consultarHistoricoVeiculosPorCpf(cpf: string) {
  return get(`/veiculos/v3/historico-veiculos?documento=${limpaCpf(cpf)}&idFinalidade=${FINALIDADE}`)
}

// ═══════════════════════════════════════════════════════════════
// MÓDULOS — PESSOAS (CPF)
// Localize v3 + Score v3 com retorno normalizado para compatibilidade
// ═══════════════════════════════════════════════════════════════

/** Dados cadastrais básicos — nome, endereço, telefone, e-mail, filiação */
export async function consultarCpfBasico(cpf: string) {
  const data = await get(`/localize/v3/cpf?cpf=${limpaCpf(cpf)}&idFinalidade=${FINALIDADE}`)
  const cad  = data?.resposta?.ocorrencias?.cadastro ?? data?.resposta?.cadastro ?? {}
  const tels = data?.resposta?.ocorrencias?.telefones ?? data?.resposta?.telefones ?? []
  const mails = data?.resposta?.ocorrencias?.emails ?? data?.resposta?.emails ?? []
  return {
    nome:           cad?.nome          ?? cad?.nomeCompleto,
    nomeCompleto:   cad?.nome          ?? cad?.nomeCompleto,
    situacaoCpf:    cad?.situacaoCadastral ?? cad?.situacao,
    situacao:       cad?.situacaoCadastral ?? cad?.situacao,
    dataNascimento: cad?.dataNascimento,
    telefone:       Array.isArray(tels) && tels.length ? (tels[0]?.numero ?? tels[0]?.telefone) : undefined,
    telefones:      tels,
    email:          Array.isArray(mails) && mails.length ? (mails[0]?.email) : undefined,
    emails:         mails,
    ...data,
  }
}

/** Score de crédito */
export async function consultarScoreCpf(cpf: string) {
  const data = await get(`/score/v3/pf/credito/${limpaCpf(cpf)}`)
  const pontos = data?.resposta?.score?.pontos ?? data?.resposta?.score
  return {
    score:    pontos,
    pontuacao: pontos,
    ...data,
  }
}

/** Processos judiciais (ações PF) */
export async function consultarProcessosCpf(cpf: string) {
  const data = await get(`/score/v3/pf/acoes/${limpaCpf(cpf)}`)
  const qtd  = data?.resposta?.acoes?.qtdAcoes ?? data?.resposta?.acoes?.quantidade ?? 0
  return {
    total:     qtd,
    quantidade: qtd,
    ...data,
  }
}

/** Protestos em cartório — retornados junto ao endpoint de score */
export async function consultarProtestosCpf(cpf: string) {
  const data = await get(`/score/v3/pf/credito/${limpaCpf(cpf)}`)
  const qtd  = data?.resposta?.protestosPublicos?.qtdProtestos
             ?? data?.resposta?.protestosPublicos?.sumQuantidade
             ?? 0
  return {
    total:     qtd,
    quantidade: qtd,
    ...data,
  }
}

/** Histórico de endereços */
export async function consultarEnderecosCpf(cpf: string) {
  return get(`/localize/v3/cpf?cpf=${limpaCpf(cpf)}&idFinalidade=${FINALIDADE}`)
}

/** Telefones vinculados ao CPF */
export async function consultarTelefonesCpf(cpf: string) {
  return get(`/localize/v3/mais-telefones?cpf=${limpaCpf(cpf)}&idFinalidade=${FINALIDADE}`)
}

/** Renda presumida */
export async function consultarRendaCpf(cpf: string) {
  const data = await get(`/score/v3/pf/credito/${limpaCpf(cpf)}`)
  return {
    renda:  data?.resposta?.rendaPresumida?.valor,
    valor:  data?.resposta?.rendaPresumida?.valor,
    ...data,
  }
}

/** PEP — Pessoa Politicamente Exposta (retorno seguro se não contratado) */
export async function consultarPepCpf(_cpf: string): Promise<{ pep: boolean; isPep: boolean } | null> {
  return null
}

/** Participação societária via Mix v3 com opção PARTICIPACOES */
export async function consultarSocietarioCpf(cpf: string) {
  try {
    const data  = await get(`/mix-v3/pf/${limpaCpf(cpf)}?idFinalidade=${FINALIDADE}&opcoes=PARTICIPACOES`)
    const qtd   = data?.resposta?.resumos?.participacoesEmpresas?.qtdeParticipacoes ?? 0
    const lista = data?.resposta?.ocorrencias?.participacoes ?? (qtd > 0 ? [{}] : [])
    return {
      lista,
      empresas: lista,
      ...data,
    }
  } catch {
    return { lista: [], empresas: [] }
  }
}

/** Relacionamentos — parentes e pessoas ligadas */
export async function consultarRelacionamentosCpf(cpf: string) {
  return get(`/localize/v3/pessoas-de-referencia?cpf=${limpaCpf(cpf)}&idFinalidade=${FINALIDADE}`)
}

// ═══════════════════════════════════════════════════════════════
// MÓDULOS — EMPRESAS (CNPJ)
// ═══════════════════════════════════════════════════════════════

/** Dados cadastrais da empresa */
export async function consultarCnpjBasico(cnpj: string) {
  return get(`/localize/v3/cnpj?cnpj=${limpaCnpj(cnpj)}&idFinalidade=${FINALIDADE}`)
}

/** Quadro societário */
export async function consultarQsaCnpj(cnpj: string) {
  return get(`/localize/v3/cnpj?cnpj=${limpaCnpj(cnpj)}&idFinalidade=${FINALIDADE}`)
}

/** Score de crédito empresarial */
export async function consultarScoreCnpj(cnpj: string) {
  const data = await get(`/score/v3/pj/credito/${limpaCnpj(cnpj)}`)
  const pontos = data?.resposta?.score?.pontos ?? data?.resposta?.score
  return { score: pontos, pontuacao: pontos, ...data }
}

/** Processos judiciais da empresa */
export async function consultarProcessosCnpj(cnpj: string) {
  const data = await get(`/score/v3/pj/acoes/${limpaCnpj(cnpj)}`)
  const qtd  = data?.resposta?.acoes?.qtdAcoes ?? 0
  return { total: qtd, quantidade: qtd, ...data }
}

/** Protestos da empresa */
export async function consultarProtestosCnpj(cnpj: string) {
  const data = await get(`/score/v3/pj/credito/${limpaCnpj(cnpj)}`)
  const qtd  = data?.resposta?.protestosPublicos?.qtdProtestos ?? 0
  return { total: qtd, quantidade: qtd, ...data }
}

/** Empresas relacionadas */
export async function consultarRelacionadasCnpj(cnpj: string) {
  return get(`/localize/v3/cnpj?cnpj=${limpaCnpj(cnpj)}&idFinalidade=${FINALIDADE}`)
}

// ═══════════════════════════════════════════════════════════════
// CATÁLOGO DE MÓDULOS
// ═══════════════════════════════════════════════════════════════

export type ModuloId =
  | 'placa' | 'binFederal' | 'sinistro' | 'gravame' | 'leilao' | 'chassi' | 'historicoVeiculosCpf'
  | 'cpfBasico' | 'cpfScore' | 'cpfProcessos' | 'cpfProtestos' | 'cpfEnderecos'
  | 'cpfTelefones' | 'cpfRenda' | 'cpfPep' | 'cpfSocietario' | 'cpfRelacionamentos'
  | 'cnpjBasico' | 'cnpjQsa' | 'cnpjScore' | 'cnpjProcessos' | 'cnpjProtestos' | 'cnpjRelacionadas'

export interface ModuloInfo {
  id:        ModuloId
  grupo:     'Veículos' | 'CPF — Pessoa Física' | 'CNPJ — Pessoa Jurídica'
  label:     string
  descricao: string
  custo:     number
}

export const MODULOS: ModuloInfo[] = [
  { id: 'placa',               grupo: 'Veículos',               label: 'Placa',                       descricao: 'Identificação, restrições estaduais, IPVA, multas e débitos',         custo: 1 },
  { id: 'binFederal',          grupo: 'Veículos',               label: 'BIN Federal',                 descricao: 'Roubo/furto, RENAJUD e restrições federais',                          custo: 1 },
  { id: 'sinistro',            grupo: 'Veículos',               label: 'Indício de Sinistro',         descricao: 'Detecção de sinistro e precificação do veículo',                      custo: 1 },
  { id: 'gravame',             grupo: 'Veículos',               label: 'Gravame',                     descricao: 'Histórico completo de financiamentos e alienações',                    custo: 1 },
  { id: 'leilao',              grupo: 'Veículos',               label: 'Histórico de Leilão',         descricao: 'Verificação nas bases A, B e Remarketing',                            custo: 1 },
  { id: 'chassi',              grupo: 'Veículos',               label: 'Decodificador de Chassi',     descricao: 'VIN completo e alterações de características',                        custo: 1 },
  { id: 'historicoVeiculosCpf',grupo: 'Veículos',               label: 'Histórico Veículos por CPF',  descricao: 'Todos os veículos que um CPF já registrou',                           custo: 1 },
  { id: 'cpfBasico',           grupo: 'CPF — Pessoa Física',    label: 'Cadastro Básico',             descricao: 'Nome, endereço, telefone, e-mail, filiação, data de nascimento',      custo: 1 },
  { id: 'cpfScore',            grupo: 'CPF — Pessoa Física',    label: 'Score de Crédito',            descricao: 'Pontuação de risco financeiro e comportamento de crédito',            custo: 1 },
  { id: 'cpfProcessos',        grupo: 'CPF — Pessoa Física',    label: 'Processos Judiciais',         descricao: 'Ações judiciais federais, estaduais e trabalhistas',                  custo: 2 },
  { id: 'cpfProtestos',        grupo: 'CPF — Pessoa Física',    label: 'Protestos',                   descricao: 'Protestos em cartório em todo o Brasil',                              custo: 1 },
  { id: 'cpfEnderecos',        grupo: 'CPF — Pessoa Física',    label: 'Histórico de Endereços',      descricao: 'Todos os endereços vinculados ao CPF ao longo do tempo',              custo: 1 },
  { id: 'cpfTelefones',        grupo: 'CPF — Pessoa Física',    label: 'Telefones',                   descricao: 'Telefones fixos e celulares vinculados ao CPF',                       custo: 1 },
  { id: 'cpfRenda',            grupo: 'CPF — Pessoa Física',    label: 'Renda Presumida',             descricao: 'Estimativa de renda baseada em dados públicos e comportamentais',     custo: 1 },
  { id: 'cpfPep',              grupo: 'CPF — Pessoa Física',    label: 'PEP',                         descricao: 'Pessoa Politicamente Exposta — risco de lavagem de dinheiro',         custo: 1 },
  { id: 'cpfSocietario',       grupo: 'CPF — Pessoa Física',    label: 'Participação Societária',     descricao: 'CNPJs e empresas nos quais o CPF é sócio ou administrador',           custo: 1 },
  { id: 'cpfRelacionamentos',  grupo: 'CPF — Pessoa Física',    label: 'Relacionamentos',             descricao: 'Parentes, cônjuge e pessoas ligadas ao CPF',                          custo: 1 },
  { id: 'cnpjBasico',          grupo: 'CNPJ — Pessoa Jurídica', label: 'Cadastro Empresarial',        descricao: 'Razão social, CNAE, endereço, situação cadastral na Receita Federal', custo: 1 },
  { id: 'cnpjQsa',             grupo: 'CNPJ — Pessoa Jurídica', label: 'Quadro Societário (QSA)',     descricao: 'Sócios, administradores e representantes legais',                     custo: 1 },
  { id: 'cnpjScore',           grupo: 'CNPJ — Pessoa Jurídica', label: 'Score Empresarial',           descricao: 'Pontuação de risco e capacidade de pagamento da empresa',             custo: 1 },
  { id: 'cnpjProcessos',       grupo: 'CNPJ — Pessoa Jurídica', label: 'Processos Judiciais PJ',      descricao: 'Ações judiciais da empresa em âmbito federal, estadual e trabalhista', custo: 2 },
  { id: 'cnpjProtestos',       grupo: 'CNPJ — Pessoa Jurídica', label: 'Protestos PJ',                descricao: 'Protestos em cartório no nome da empresa',                            custo: 1 },
  { id: 'cnpjRelacionadas',    grupo: 'CNPJ — Pessoa Jurídica', label: 'Empresas Relacionadas',       descricao: 'Empresas com sócios em comum, mesmo endereço ou telefone',            custo: 1 },
]

// ═══════════════════════════════════════════════════════════════
// CONSULTA COMPLETA (veículos) — usada pelo Ficha Auto B2C
// ═══════════════════════════════════════════════════════════════

export interface ConsultaVeiculoResult {
  placa:      any; binFederal: any; sinistro: any
  gravame:    any; leilao:     any; chassi:   any
  erros:      string[]
}

export async function consultarCompleto(placa: string, chassi?: string): Promise<ConsultaVeiculoResult> {
  const placaLimpa = limpaPlaca(placa)
  const erros: string[] = []

  const safe = async (fn: () => Promise<any>, nome: string) => {
    try { return await fn() }
    catch (e: any) { erros.push(`${nome}: ${e.message}`); return null }
  }

  // Chama consulta-base primeiro para obter o protocolo
  const placaData = await safe(() => consultarPlaca(placaLimpa), 'placa')
  const protocolo = placaData?.cabecalho?.protocolo as string | undefined

  const [binFederal, sinistro, gravame, leilao, chassiData] = await Promise.all([
    safe(() => consultarBinFederal(placaLimpa, protocolo), 'binFederal'),
    safe(() => consultarSinistro(placaLimpa, protocolo),   'sinistro'),
    safe(() => consultarGravame(placaLimpa, protocolo),    'gravame'),
    safe(() => consultarLeilao(placaLimpa, protocolo),     'leilao'),
    chassi ? safe(() => consultarChassi(chassi), 'chassi') : Promise.resolve(null),
  ])

  return { placa: placaData, binFederal, sinistro, gravame, leilao, chassi: chassiData, erros }
}

// ═══════════════════════════════════════════════════════════════
// CONSULTA MODULAR — executa apenas os módulos habilitados
// ═══════════════════════════════════════════════════════════════

export async function consultarModular(
  input: string,
  tipo: 'placa' | 'cpf' | 'cnpj',
  modulosHabilitados: ModuloId[]
): Promise<Record<string, any>> {
  const erros: string[] = []
  const resultado: Record<string, any> = { erros }

  const safe = async (id: ModuloId, fn: () => Promise<any>) => {
    if (!modulosHabilitados.includes(id)) return
    try { resultado[id] = await fn() }
    catch (e: any) { erros.push(`${id}: ${e.message}`); resultado[id] = null }
  }

  if (tipo === 'placa') {
    const p = limpaPlaca(input)
    // Obtém protocolo da consulta-base antes das demais consultas
    let protocolo: string | undefined
    await safe('placa', async () => {
      const base = await consultarPlaca(p)
      protocolo = base?.cabecalho?.protocolo
      return base
    })
    await Promise.all([
      safe('binFederal', () => consultarBinFederal(p, protocolo)),
      safe('sinistro',   () => consultarSinistro(p, protocolo)),
      safe('gravame',    () => consultarGravame(p, protocolo)),
      safe('leilao',     () => consultarLeilao(p, protocolo)),
    ])
  }

  if (tipo === 'cpf') {
    const c = limpaCpf(input)
    await Promise.all([
      safe('cpfBasico',          () => consultarCpfBasico(c)),
      safe('cpfScore',           () => consultarScoreCpf(c)),
      safe('cpfProcessos',       () => consultarProcessosCpf(c)),
      safe('cpfProtestos',       () => consultarProtestosCpf(c)),
      safe('cpfEnderecos',       () => consultarEnderecosCpf(c)),
      safe('cpfTelefones',       () => consultarTelefonesCpf(c)),
      safe('cpfRenda',           () => consultarRendaCpf(c)),
      safe('cpfPep',             () => consultarPepCpf(c)),
      safe('cpfSocietario',      () => consultarSocietarioCpf(c)),
      safe('cpfRelacionamentos', () => consultarRelacionamentosCpf(c)),
      safe('historicoVeiculosCpf', () => consultarHistoricoVeiculosPorCpf(c)),
    ])
  }

  if (tipo === 'cnpj') {
    const cn = limpaCnpj(input)
    await Promise.all([
      safe('cnpjBasico',       () => consultarCnpjBasico(cn)),
      safe('cnpjQsa',          () => consultarQsaCnpj(cn)),
      safe('cnpjScore',        () => consultarScoreCnpj(cn)),
      safe('cnpjProcessos',    () => consultarProcessosCnpj(cn)),
      safe('cnpjProtestos',    () => consultarProtestosCnpj(cn)),
      safe('cnpjRelacionadas', () => consultarRelacionadasCnpj(cn)),
    ])
  }

  return resultado
}
