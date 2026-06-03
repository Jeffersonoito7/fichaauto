// Assertiva API — OAuth2 + todos os módulos disponíveis
// Documentação: https://integracao.assertivasolucoes.com.br/v3/doc/

const BASE_URL  = 'https://gateway.assertivasolucoes.com.br'
const TOKEN_URL = 'https://plataforma.assertivasolucoes.com.br/oauth2/v3/token'
const LOGIN     = process.env.ASSERTIVA_LOGIN    ?? ''
const PASSWORD  = process.env.ASSERTIVA_PASSWORD ?? ''

// Cache do token em memória
let _token: string | null = null
let _tokenExpiry = 0

async function getToken(): Promise<string> {
  if (_token && Date.now() < _tokenExpiry) return _token

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login: LOGIN, password: PASSWORD, grant_type: 'client_credentials' }),
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
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Assertiva ${path} erro ${res.status}`)
  return res.json()
}

function limpaPlaca(p: string)  { return p.replace(/[^A-Z0-9]/gi, '').toUpperCase() }
function limpaCpf(c: string)    { return c.replace(/\D/g, '') }
function limpaCnpj(c: string)   { return c.replace(/\D/g, '') }

// ═══════════════════════════════════════════════════════════════
// MÓDULOS — VEÍCULOS
// ═══════════════════════════════════════════════════════════════

/** Identificação + restrições estaduais + débitos */
export async function consultarPlaca(placa: string) {
  return get(`/veiculos/v1/placa/${limpaPlaca(placa)}`)
}

/** BIN Federal + Roubo/Furto + RENAJUD */
export async function consultarBinFederal(placa: string) {
  return get(`/veiculos/v1/bin-federal/${limpaPlaca(placa)}`)
}

/** Indício de sinistro + precificador */
export async function consultarSinistro(placa: string) {
  return get(`/veiculos/v1/precificador/${limpaPlaca(placa)}`)
}

/** Gravame — histórico de financiamento */
export async function consultarGravame(placa: string) {
  return get(`/veiculos/v1/gravame/${limpaPlaca(placa)}`)
}

/** Histórico de leilão (Base A + B + Remarketing) */
export async function consultarLeilao(placa: string) {
  return get(`/veiculos/v1/leilao/${limpaPlaca(placa)}`)
}

/** Decodificador de chassi + alterações de características */
export async function consultarChassi(chassi: string) {
  return get(`/veiculos/v1/chassi/${chassi}`)
}

/** Histórico de veículos por CPF ou CNPJ */
export async function consultarHistoricoVeiculosPorCpf(cpf: string) {
  return get(`/veiculos/v1/historico/${limpaCpf(cpf)}`)
}

// ═══════════════════════════════════════════════════════════════
// MÓDULOS — PESSOAS (CPF)
// ═══════════════════════════════════════════════════════════════

/** Dados cadastrais básicos — nome, endereço, telefone, e-mail, filiação */
export async function consultarCpfBasico(cpf: string) {
  return get(`/pessoas/v1/basico/${limpaCpf(cpf)}`)
}

/** Score de crédito e risco da pessoa física */
export async function consultarScoreCpf(cpf: string) {
  return get(`/pessoas/v1/score/${limpaCpf(cpf)}`)
}

/** Processos judiciais (federal, estadual, trabalhista) */
export async function consultarProcessosCpf(cpf: string) {
  return get(`/pessoas/v1/processos/${limpaCpf(cpf)}`)
}

/** Protestos em cartório */
export async function consultarProtestosCpf(cpf: string) {
  return get(`/pessoas/v1/protestos/${limpaCpf(cpf)}`)
}

/** Histórico de endereços */
export async function consultarEnderecosCpf(cpf: string) {
  return get(`/pessoas/v1/enderecos/${limpaCpf(cpf)}`)
}

/** Telefones vinculados ao CPF */
export async function consultarTelefonesCpf(cpf: string) {
  return get(`/pessoas/v1/telefones/${limpaCpf(cpf)}`)
}

/** Renda presumida */
export async function consultarRendaCpf(cpf: string) {
  return get(`/pessoas/v1/renda/${limpaCpf(cpf)}`)
}

/** PEP — Pessoa Politicamente Exposta */
export async function consultarPepCpf(cpf: string) {
  return get(`/pessoas/v1/pep/${limpaCpf(cpf)}`)
}

/** Participação societária — empresas vinculadas ao CPF */
export async function consultarSocietarioCpf(cpf: string) {
  return get(`/pessoas/v1/societario/${limpaCpf(cpf)}`)
}

/** Relacionamentos — parentes e pessoas ligadas */
export async function consultarRelacionamentosCpf(cpf: string) {
  return get(`/pessoas/v1/relacionamentos/${limpaCpf(cpf)}`)
}

// ═══════════════════════════════════════════════════════════════
// MÓDULOS — EMPRESAS (CNPJ)
// ═══════════════════════════════════════════════════════════════

/** Dados cadastrais da empresa — razão social, CNAE, endereço, situação */
export async function consultarCnpjBasico(cnpj: string) {
  return get(`/empresas/v1/basico/${limpaCnpj(cnpj)}`)
}

/** Quadro societário — sócios e administradores */
export async function consultarQsaCnpj(cnpj: string) {
  return get(`/empresas/v1/qsa/${limpaCnpj(cnpj)}`)
}

/** Score de crédito empresarial */
export async function consultarScoreCnpj(cnpj: string) {
  return get(`/empresas/v1/score/${limpaCnpj(cnpj)}`)
}

/** Processos judiciais da empresa */
export async function consultarProcessosCnpj(cnpj: string) {
  return get(`/empresas/v1/processos/${limpaCnpj(cnpj)}`)
}

/** Protestos da empresa */
export async function consultarProtestosCnpj(cnpj: string) {
  return get(`/empresas/v1/protestos/${limpaCnpj(cnpj)}`)
}

/** Empresas relacionadas (mesmos sócios, endereço, etc.) */
export async function consultarRelacionadasCnpj(cnpj: string) {
  return get(`/empresas/v1/relacionadas/${limpaCnpj(cnpj)}`)
}

// ═══════════════════════════════════════════════════════════════
// CATÁLOGO DE MÓDULOS — usado pelo super admin para toggles
// ═══════════════════════════════════════════════════════════════

export type ModuloId =
  // Veículos
  | 'placa' | 'binFederal' | 'sinistro' | 'gravame' | 'leilao' | 'chassi' | 'historicoVeiculosCpf'
  // CPF
  | 'cpfBasico' | 'cpfScore' | 'cpfProcessos' | 'cpfProtestos' | 'cpfEnderecos'
  | 'cpfTelefones' | 'cpfRenda' | 'cpfPep' | 'cpfSocietario' | 'cpfRelacionamentos'
  // CNPJ
  | 'cnpjBasico' | 'cnpjQsa' | 'cnpjScore' | 'cnpjProcessos' | 'cnpjProtestos' | 'cnpjRelacionadas'

export interface ModuloInfo {
  id:        ModuloId
  grupo:     'Veículos' | 'CPF — Pessoa Física' | 'CNPJ — Pessoa Jurídica'
  label:     string
  descricao: string
  custo:     number   // créditos por consulta (referência)
}

export const MODULOS: ModuloInfo[] = [
  // ── Veículos ──────────────────────────────────────────────────
  { id: 'placa',               grupo: 'Veículos',               label: 'Placa',                       descricao: 'Identificação, restrições estaduais, IPVA, multas e débitos',         custo: 1 },
  { id: 'binFederal',          grupo: 'Veículos',               label: 'BIN Federal',                 descricao: 'Roubo/furto, RENAJUD e restrições federais',                          custo: 1 },
  { id: 'sinistro',            grupo: 'Veículos',               label: 'Indício de Sinistro',         descricao: 'Detecção de sinistro e precificação do veículo',                      custo: 1 },
  { id: 'gravame',             grupo: 'Veículos',               label: 'Gravame',                     descricao: 'Histórico completo de financiamentos e alienações',                    custo: 1 },
  { id: 'leilao',              grupo: 'Veículos',               label: 'Histórico de Leilão',         descricao: 'Verificação nas bases A, B e Remarketing',                            custo: 1 },
  { id: 'chassi',              grupo: 'Veículos',               label: 'Decodificador de Chassi',     descricao: 'VIN completo e alterações de características',                        custo: 1 },
  { id: 'historicoVeiculosCpf',grupo: 'Veículos',               label: 'Histórico Veículos por CPF',  descricao: 'Todos os veículos que um CPF já registrou',                           custo: 1 },
  // ── CPF ───────────────────────────────────────────────────────
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
  // ── CNPJ ──────────────────────────────────────────────────────
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

  const [placaData, binFederal, sinistro, gravame, leilao, chassiData] = await Promise.all([
    safe(() => consultarPlaca(placaLimpa),      'placa'),
    safe(() => consultarBinFederal(placaLimpa), 'binFederal'),
    safe(() => consultarSinistro(placaLimpa),   'sinistro'),
    safe(() => consultarGravame(placaLimpa),    'gravame'),
    safe(() => consultarLeilao(placaLimpa),     'leilao'),
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
    await Promise.all([
      safe('placa',      () => consultarPlaca(p)),
      safe('binFederal', () => consultarBinFederal(p)),
      safe('sinistro',   () => consultarSinistro(p)),
      safe('gravame',    () => consultarGravame(p)),
      safe('leilao',     () => consultarLeilao(p)),
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
