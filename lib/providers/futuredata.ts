// ─── Provider FutureData ───────────────────────────────────────────────────────
// Todos os módulos estão estruturados e prontos para integração.
// Quando o contrato FutureData for fechado, basta definir:
//   FUTUREDATA_API_KEY=sua_chave
//   FUTUREDATA_BASE_URL=https://apiwl.futuredata.com.br
// em .env.local e todas as funções passam a chamar a API real.

const BASE  = process.env.FUTUREDATA_BASE_URL ?? 'https://apiwl.futuredata.com.br'
const KEY   = process.env.FUTUREDATA_API_KEY  ?? ''

function isAtivo() { return !!KEY }

async function chamar(endpoint: string, body: Record<string, string>) {
  const res = await fetch(`${BASE}/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${KEY}`,
      'x-api-key': KEY,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(90_000),
  })
  if (!res.ok) throw new Error(`FutureData ${endpoint}: HTTP ${res.status}`)
  return res.json()
}

// ─── PLACA — Recall ───────────────────────────────────────────────────────────
export interface RecallItem {
  campanha:    string
  descricao:   string
  dataInicio:  string
  situacao:    string // 'PENDENTE' | 'REALIZADO'
  componente?: string
}
export interface ResultadoRecall {
  placa:    string
  chassi:   string
  temRecall: boolean
  recalls:  RecallItem[]
}

export async function consultarRecall(placa: string): Promise<ResultadoRecall | null> {
  if (!isAtivo()) return null
  return chamar('veicularRecall', { placa })
}

// ─── PLACA — Histórico de proprietários ───────────────────────────────────────
export interface ProprietarioHistorico {
  nome:         string
  documento:    string // CPF ou CNPJ
  tipoDocumento:'PF' | 'PJ'
  dataInicio:   string
  dataFim:      string | null
  uf:           string
}
export interface ResultadoHistoricoProprietarios {
  placa:         string
  proprietarios: ProprietarioHistorico[]
  totalDonos:    number
}

export async function consultarHistoricoProprietarios(placa: string): Promise<ResultadoHistoricoProprietarios | null> {
  if (!isAtivo()) return null
  return chamar('veicularHistoricoProprietario', { placa })
}

// ─── PLACA — Sinistro Plus (ampliado) ─────────────────────────────────────────
export interface ResultadoSinistroPlus {
  placa:                string
  indicioSinistro:      boolean
  historicoDanos:       boolean
  historicoAvarias:     boolean
  historicoAcidente:    boolean
  lojasSalvados:        boolean
  descricao:            string
}

export async function consultarSinistroPlus(placa: string): Promise<ResultadoSinistroPlus | null> {
  if (!isAtivo()) return null
  return chamar('veicularIndicioSinistroPlus', { placa })
}

// ─── PLACA — Histórico de frota ───────────────────────────────────────────────
export interface ResultadoFrota {
  placa:          string
  frotaLocadora:  boolean
  frotaPolicial:  boolean
  frotaPublica:   boolean
  frotaSegPrivada:boolean
  exTaxi:         boolean
  utilizacaoExcessivaTaxi: boolean
}

export async function consultarHistoricoFrota(placa: string): Promise<ResultadoFrota | null> {
  if (!isAtivo()) return null
  const [locadora, policial, taxi] = await Promise.all([
    chamar('hist_ex_frota_locadora',  { placa }).catch(() => null),
    chamar('hist_ex_viatu_policial',  { placa }).catch(() => null),
    chamar('ind_util_excessiva_taxi', { placa }).catch(() => null),
  ])
  return {
    placa,
    frotaLocadora:           !!(locadora?.consta),
    frotaPolicial:           !!(policial?.consta),
    frotaPublica:            !!(policial?.frotaPublica),
    frotaSegPrivada:         !!(policial?.segPrivada),
    exTaxi:                  !!(taxi?.exTaxi),
    utilizacaoExcessivaTaxi: !!(taxi?.utilizacaoExcessiva),
  }
}

// ─── PLACA — Veículo em crime ─────────────────────────────────────────────────
export interface ResultadoVeiculoCrime {
  placa:   string
  consta:  boolean
  detalhes:string
}

export async function consultarVeiculoCrime(placa: string): Promise<ResultadoVeiculoCrime | null> {
  if (!isAtivo()) return null
  return chamar('vei_utilizado_comet_crime', { placa })
}

// ─── PLACA — Transferência para seguradora ───────────────────────────────────
export interface ResultadoTransfSeguradora {
  placa:   string
  consta:  boolean
  cnpjSeguradora: string | null
  nomeSeguradora: string | null
  data:    string | null
}

export async function consultarTransferenciaSeguradora(placa: string): Promise<ResultadoTransfSeguradora | null> {
  if (!isAtivo()) return null
  return chamar('transf_titu_cnpj_seg', { placa })
}

// ─── PLACA — Decodificador de chassi (VIN) ───────────────────────────────────
export interface ResultadoDecodificadorChassi {
  chassi:       string
  pais:         string
  fabricante:   string
  marca:        string
  modelo:       string
  anoFabricacao:string
  motor:        string
  sequencial:   string
  digito:       string
}

export async function consultarDecodificadorChassi(chassi: string): Promise<ResultadoDecodificadorChassi | null> {
  if (!isAtivo()) return null
  return chamar('veicularDecodificadorChassi', { chassi })
}

// ─── PLACA — CRLVe digital ────────────────────────────────────────────────────
export interface ResultadoCrlve {
  placa: string
  uf:    string
  urlDocumento: string
  validade:     string
}

export async function consultarCrlve(placa: string, uf: string): Promise<ResultadoCrlve | null> {
  if (!isAtivo()) return null
  return chamar(`veicularCrlve${uf.toUpperCase()}`, { placa })
}

// ─── CPF — KYC ────────────────────────────────────────────────────────────────
export interface ResultadoKycPf {
  cpf:          string
  validado:     boolean
  biometria:    boolean
  score:        number
  alertas:      string[]
}

export async function consultarKycPf(cpf: string): Promise<ResultadoKycPf | null> {
  if (!isAtivo()) return null
  return chamar('pfKyc', { cpf })
}

// ─── CPF — Antecedentes criminais ────────────────────────────────────────────
export interface ResultadoAntecedentes {
  cpf:     string
  consta:  boolean
  detalhes:string[]
}

export async function consultarAntecedentes(cpf: string): Promise<ResultadoAntecedentes | null> {
  if (!isAtivo()) return null
  return chamar('pfAntecedentesCriminais', { cpf })
}

// ─── CPF — Mandados de prisão ─────────────────────────────────────────────────
export interface ResultadoMandados {
  cpf:    string
  consta: boolean
  mandados: { vara: string; data: string; situacao: string }[]
}

export async function consultarMandados(cpf: string): Promise<ResultadoMandados | null> {
  if (!isAtivo()) return null
  return chamar('pfMandadosPrisao', { cpf })
}

// ─── CPF — CNH completa ───────────────────────────────────────────────────────
export interface ResultadoCnh {
  cpf:          string
  numero:       string
  categoria:    string
  validade:     string
  situacao:     string
  bloqueios:    string[]
  exames:       { tipo: string; data: string; resultado: string }[]
  toxicologico: { data: string; resultado: string } | null
  infracoes:    { data: string; descricao: string; pontos: number }[]
}

export async function consultarCnh(cpf: string): Promise<ResultadoCnh | null> {
  if (!isAtivo()) return null
  return chamar('CnhNacional', { cpf })
}

// ─── CNPJ — KYC empresarial ───────────────────────────────────────────────────
export interface ResultadoKycPj {
  cnpj:     string
  validado: boolean
  alertas:  string[]
  sancoes:  string[]
  pepSocios:boolean
}

export async function consultarKycPj(cnpj: string): Promise<ResultadoKycPj | null> {
  if (!isAtivo()) return null
  return chamar('pjKyc', { cnpj })
}

// ─── CNPJ — Dívida ativa ─────────────────────────────────────────────────────
export interface ResultadoDividaAtiva {
  cnpj:        string
  consta:      boolean
  valorTotal:  number
  inscricoes:  { numero: string; valor: number; origem: string }[]
}

export async function consultarDividaAtiva(cnpj: string): Promise<ResultadoDividaAtiva | null> {
  if (!isAtivo()) return null
  return chamar('pjDebitosDividaAtivaUniao', { cnpj })
}

// ─── CNPJ — Grupo empresarial ─────────────────────────────────────────────────
export interface ResultadoGrupoEmpresarial {
  cnpj:     string
  empresas: { cnpj: string; razaoSocial: string; relacao: string }[]
}

export async function consultarGrupoEmpresarial(cnpj: string): Promise<ResultadoGrupoEmpresarial | null> {
  if (!isAtivo()) return null
  return chamar('pjGrupoEmpresarial', { cnpj })
}

// ─── CNPJ — SINTEGRA ──────────────────────────────────────────────────────────
export interface ResultadoSintegra {
  cnpj:              string
  inscricaoEstadual: string
  situacao:          string
  uf:                string
}

export async function consultarSintegra(cnpj: string): Promise<ResultadoSintegra | null> {
  if (!isAtivo()) return null
  return chamar('pjSintegra', { cnpj })
}
