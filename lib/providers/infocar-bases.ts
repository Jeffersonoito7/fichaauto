// ─── Infocar: Base Estadual B e Base Nacional B ──────────────────────────────
// Substituem o BIN Estadual (R$ 12,42) e o BIN Federal (R$ 12,42) da Assertiva
// por R$ 5,97 e R$ 6,07. Junto com o leilão, derrubam o custo da consulta de
// R$ 57,38 para R$ 36,36.
//
// Base Estadual B entrega: dados do veículo com Renavam, informações técnicas,
// restrições e impedimentos (administrativos, financeiros, judiciais e
// tributários), débitos estaduais, comunicação de venda e nome do proprietário.
//
// Base Nacional B entrega: dados do veículo com Renavam, informações técnicas,
// restrições e impedimentos (administrativa, financeira, judicial, tributária).
// A restrição judicial é o RENAJUD.
//
// ATENÇÃO: os nomes de campo abaixo são uma APOSTA. A documentação da Infocar
// ainda não chegou. Quando chegar, ajustar só as funções de normalização deste
// arquivo: o resto do sistema consome o formato da Assertiva e não muda.

const BASE_URL = process.env.INFOCAR_BASE_URL ?? 'https://api.infocar.com.br'
const API_KEY  = process.env.INFOCAR_API_KEY  ?? ''

export function basesInfocarAtivas(): boolean {
  return API_KEY.length > 0
}

const texto = (v: unknown): string => {
  if (v === null || v === undefined) return ''
  return String(v).trim()
}

/** Pega o primeiro valor presente entre vários nomes possíveis de campo. */
function primeiro(obj: any, ...chaves: string[]): any {
  if (!obj) return undefined
  for (const k of chaves) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k]
  }
  return undefined
}

/** Achata restrições vindas em qualquer formato para lista de strings. */
function listaRestricoes(bruto: any): string[] {
  const cand = primeiro(bruto, 'restricoes', 'impedimentos', 'restricoesImpedimentos') ?? []
  const saida: string[] = []

  const empurrar = (v: any) => {
    const s = texto(v).toUpperCase()
    if (s && !s.includes('NADA CONSTA') && !s.includes('SEM RESTRICAO')) saida.push(s)
  }

  if (Array.isArray(cand)) {
    cand.forEach(r => empurrar(typeof r === 'string' ? r : primeiro(r, 'descricao', 'tipo', 'restricao', 'nome')))
  } else if (cand && typeof cand === 'object') {
    // Formato por categoria: { administrativa: [...], judicial: [...] }
    Object.values(cand).forEach(v => {
      if (Array.isArray(v)) v.forEach(empurrar)
      else empurrar(v)
    })
  }
  return saida
}

/**
 * Base Nacional B, no formato que o relatório já lê do BIN Federal.
 * O relatório espera `resposta.restricoes` como ARRAY de strings, e procura
 * por RENAJUD, ROUBO e FURTO dentro delas.
 */
export function normalizarBaseNacional(bruto: any) {
  const d = bruto?.dados ?? bruto?.resultado ?? bruto ?? {}
  const restricoes = listaRestricoes(d)

  // Roubo e furto podem vir em bloco próprio em vez de dentro de restrições.
  const ocorrencia = texto(primeiro(d, 'rouboFurto', 'ocorrencia', 'situacaoRouboFurto')).toUpperCase()
  if (ocorrencia && !ocorrencia.includes('NADA CONSTA') && !ocorrencia.includes('NAO')) {
    restricoes.push(ocorrencia.includes('ROUBO') || ocorrencia.includes('FURTO') ? ocorrencia : `ROUBO/FURTO: ${ocorrencia}`)
  }

  return {
    _fonte: 'infocar',
    resposta: {
      restricoes,
      identificadores: {
        placa:       texto(primeiro(d, 'placa')),
        chassi:      texto(primeiro(d, 'chassi', 'numeroChassi')),
        renavam:     texto(primeiro(d, 'renavam', 'numeroRenavam')),
        numeroMotor: texto(primeiro(d, 'motor', 'numeroMotor')),
      },
      fichaTecnica: fichaTecnica(d),
      descricao:    descricao(d),
    },
  }
}

/**
 * Base Estadual B, no formato que o relatório lê do BIN Estadual.
 * Aqui o relatório espera `restricoes.outrasUFs` como array e
 * `debitosPendentes` com ipva, dpvat, licenciamento e multas por órgão.
 */
export function normalizarBaseEstadual(bruto: any) {
  const d = bruto?.dados ?? bruto?.resultado ?? bruto ?? {}
  const deb = primeiro(d, 'debitos', 'debitosPendentes', 'debitosEstaduais') ?? {}
  const mul = primeiro(deb, 'multas', 'infracoes') ?? {}

  const valor = (v: unknown) => {
    const s = texto(v)
    return s || '0,00'
  }

  return {
    _fonte: 'infocar',
    resposta: {
      restricoes: { outrasUFs: listaRestricoes(d) },
      debitosPendentes: {
        ipva:          valor(primeiro(deb, 'ipva', 'valorIpva')),
        dpvat:         valor(primeiro(deb, 'dpvat', 'valorDpvat')),
        licenciamento: valor(primeiro(deb, 'licenciamento', 'valorLicenciamento')),
        multas: typeof mul === 'object' && mul !== null ? {
          detran:     valor(primeiro(mul, 'detran')),
          prf:        valor(primeiro(mul, 'prf')),
          der:        valor(primeiro(mul, 'der')),
          dersa:      valor(primeiro(mul, 'dersa')),
          cetesb:     valor(primeiro(mul, 'cetesb')),
          renainf:    valor(primeiro(mul, 'renainf')),
          municipais: valor(primeiro(mul, 'municipais', 'municipal')),
          total:      valor(primeiro(mul, 'total', 'valorTotal')),
        } : { total: valor(mul) },
      },
      comunicacaoVenda: primeiro(d, 'comunicacaoVenda', 'comunicadoVenda') ?? null,
      movimentacao: {
        proprietarioAtual: texto(primeiro(d, 'proprietario', 'nomeProprietario', 'proprietarioAtual')),
        documento:         texto(primeiro(d, 'documentoProprietario', 'docProprietario', 'cpfCnpjProprietario')),
        situacao:          texto(primeiro(d, 'situacao', 'situacaoVeiculo')),
      },
      identificadores: {
        placa:       texto(primeiro(d, 'placa')),
        chassi:      texto(primeiro(d, 'chassi', 'numeroChassi')),
        renavam:     texto(primeiro(d, 'renavam', 'numeroRenavam')),
        numeroMotor: texto(primeiro(d, 'motor', 'numeroMotor')),
      },
      fichaTecnica: fichaTecnica(d),
      descricao:    descricao(d),
    },
  }
}

function fichaTecnica(d: any) {
  return {
    tipo:           texto(primeiro(d, 'tipoVeiculo', 'tipo')),
    potencia:       texto(primeiro(d, 'potencia', 'cv')),
    numeroEixos:    texto(primeiro(d, 'eixos', 'numeroEixos', 'qtdEixos')),
    maximaTracao:   texto(primeiro(d, 'cmt', 'maximaTracao', 'capacidadeMaximaTracao')),
    pesoBrutoTotal: texto(primeiro(d, 'pbt', 'pesoBrutoTotal')),
    tipoCarroceria: texto(primeiro(d, 'carroceria', 'tipoCarroceria')),
  }
}

function descricao(d: any) {
  return {
    marcaModelo:           texto(primeiro(d, 'marcaModelo', 'modelo', 'marca')),
    cor:                   texto(primeiro(d, 'cor')),
    anoFabricacao:         texto(primeiro(d, 'anoFabricacao', 'anoFab')),
    anoModelo:             texto(primeiro(d, 'anoModelo', 'anoMod')),
    combustivel:           texto(primeiro(d, 'combustivel')),
    especie:               texto(primeiro(d, 'especie')),
    municipio:             texto(primeiro(d, 'municipio', 'cidade')),
    uf:                    texto(primeiro(d, 'uf', 'estado')),
    capacidadePassageiros: texto(primeiro(d, 'passageiros', 'lotacao', 'capacidadePassageiros')),
  }
}

async function buscar(rota: string, placa: string) {
  if (!API_KEY) return null
  const doc = placa.replace(/[^A-Z0-9]/gi, '').toUpperCase()

  const res = await fetch(`${BASE_URL}/v1/${rota}?placa=${encodeURIComponent(doc)}`, {
    headers: { Authorization: `Bearer ${API_KEY}`, Accept: 'application/json' },
    cache: 'no-store',
  })
  // Placa sem registro e resposta valida, nao erro.
  if (res.status === 404) return {}
  if (!res.ok) throw new Error(`Infocar ${rota} erro ${res.status}`)
  return res.json()
}

export async function consultarBaseNacional(placa: string) {
  const bruto = await buscar('base-nacional-b', placa)
  return bruto === null ? null : normalizarBaseNacional(bruto)
}

export async function consultarBaseEstadual(placa: string) {
  const bruto = await buscar('base-estadual-b', placa)
  return bruto === null ? null : normalizarBaseEstadual(bruto)
}
