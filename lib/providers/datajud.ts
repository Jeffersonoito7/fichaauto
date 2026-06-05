// DataJud CNJ — API pública, sem custo
// Chave pública oficial: https://datajud-wiki.cnj.jus.br/api-publica/acesso
// Busca processos judiciais por nome do proprietário do veículo

const DATAJUD_API = 'https://api-publica.datajud.cnj.jus.br'
const DATAJUD_KEY = 'cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw=='

// Tribunais estaduais com maior volume de processos veiculares/fraude
const TRIBUNAIS = ['tjsp', 'tjrj', 'tjmg', 'tjrs', 'tjpr', 'tjba', 'tjgo', 'tjce', 'tjsc', 'tjpe']

const PALAVRAS_ALTO_RISCO = [
  'ESTELIONATO', 'FURTO', 'ROUBO', 'RECEPTACAO', 'RECEPTAÇÃO',
  'FRAUDE', 'FALSIDADE', 'CLONAGEM', 'LAVAGEM', 'EXTORSAO', 'EXTORSÃO',
  'APROPRIACAO', 'APROPRIAÇÃO', 'PENAL', 'TRÁFICO', 'TRAFICO',
  'PECULATO', 'CORRUPÇÃO', 'CORRUPCAO', 'FALSIFICAÇÃO', 'FALSIFICACAO',
]

const PALAVRAS_MEDIO_RISCO = [
  'EXECUCAO', 'EXECUÇÃO', 'INADIMPL', 'FALENCIA', 'FALÊNCIA',
  'RECUPERACAO', 'RECUPERAÇÃO', 'PENHORA', 'ARRESTO', 'SEQUESTRO',
  'APREENSAO', 'APREENSÃO', 'PROTESTO', 'BUSCA',
]

export interface ProcessoDatajud {
  numero:          string
  tribunal:        string
  classe:          string
  assuntos:        string[]
  dataAjuizamento: string
  orgaoJulgador:   string
  risco:           'alto' | 'medio' | 'baixo'
}

export interface ResultadoDatajud {
  total:      number
  altoRisco:  number
  medioRisco: number
  processos:  ProcessoDatajud[]
  nomeUsado:  string
}

function nivelRisco(classe: string, assuntos: string[]): 'alto' | 'medio' | 'baixo' {
  const texto = [classe, ...assuntos].join(' ').toUpperCase()
  if (PALAVRAS_ALTO_RISCO.some(p => texto.includes(p))) return 'alto'
  if (PALAVRAS_MEDIO_RISCO.some(p => texto.includes(p))) return 'medio'
  return 'baixo'
}

async function buscarNoTribunal(tribunal: string, nome: string): Promise<ProcessoDatajud[]> {
  try {
    const res = await fetch(`${DATAJUD_API}/api_publica_${tribunal}/_search`, {
      method:  'POST',
      headers: {
        'Authorization': `APIKey ${DATAJUD_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        query: {
          match: { 'partes.nome': { query: nome, operator: 'and' } },
        },
        size: 5,
        _source: ['numeroProcesso', 'classe', 'assuntos', 'dataAjuizamento', 'orgaoJulgador'],
      }),
      signal: AbortSignal.timeout(8000),
      cache:  'no-store',
    })
    if (!res.ok) return []
    const data = await res.json()
    const hits: any[] = data?.hits?.hits ?? []
    return hits.map((h: any) => {
      const src      = h._source ?? {}
      const classe   = src.classe?.nome   ?? String(src.classe ?? '')
      const assuntos = (src.assuntos ?? []).map((a: any) => a.nome ?? String(a))
      return {
        numero:          src.numeroProcesso ?? h._id ?? '',
        tribunal:        tribunal.toUpperCase(),
        classe,
        assuntos,
        dataAjuizamento: (src.dataAjuizamento ?? '').split('T')[0],
        orgaoJulgador:   src.orgaoJulgador?.nome ?? String(src.orgaoJulgador ?? ''),
        risco:           nivelRisco(classe, assuntos),
      }
    })
  } catch {
    return []
  }
}

export async function buscarProcessosProprietario(nome: string): Promise<ResultadoDatajud> {
  const nomeClean = (nome ?? '').trim().toUpperCase()
  if (nomeClean.length < 5) {
    return { total: 0, altoRisco: 0, medioRisco: 0, processos: [], nomeUsado: nomeClean }
  }

  const resultados = await Promise.allSettled(
    TRIBUNAIS.map(t => buscarNoTribunal(t, nomeClean))
  )

  const todos: ProcessoDatajud[] = resultados
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => (r as PromiseFulfilledResult<ProcessoDatajud[]>).value)

  // Deduplicar por número de processo
  const unicos = Array.from(new Map(todos.map(p => [p.numero, p])).values())

  // Ordenar: alto risco primeiro
  const ordenados = unicos.sort((a, b) => {
    const ord = { alto: 0, medio: 1, baixo: 2 }
    return ord[a.risco] - ord[b.risco]
  })

  return {
    total:      ordenados.length,
    altoRisco:  ordenados.filter(p => p.risco === 'alto').length,
    medioRisco: ordenados.filter(p => p.risco === 'medio').length,
    processos:  ordenados,
    nomeUsado:  nomeClean,
  }
}
