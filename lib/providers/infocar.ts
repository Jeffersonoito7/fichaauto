// ─── Infocar Tecnologia — histórico de leilão ────────────────────────────────
// CNPJ 04.290.983/0001-07. Produto contratado: Leilão Essencial.
// Custo: R$ 5,56 por consulta (R$ 5,57 com IA de danos), contra R$ 13,79 da
// Assertiva. Por isso a Infocar é a fonte preferencial de leilão.
//
// Para ativar em produção, basta preencher no .env do servidor:
//   INFOCAR_API_KEY   — chave entregue pela Infocar
//   INFOCAR_BASE_URL  — só se a Infocar usar host diferente do padrão
//   INFOCAR_IA_DANOS  — "true" para usar o endpoint com análise de danos
//
// Sem a chave o provider devolve null e o sistema cai na Assertiva sozinho,
// sem quebrar nenhuma consulta.

const BASE_URL = process.env.INFOCAR_BASE_URL ?? 'https://api.infocar.com.br'
const API_KEY  = process.env.INFOCAR_API_KEY  ?? ''
const IA_DANOS = process.env.INFOCAR_IA_DANOS === 'true'

export function infocarAtiva(): boolean {
  return API_KEY.length > 0
}

/** Registro de leilão no formato que o relatório já sabe ler. */
export interface RegistroLeilao {
  data:       string | null
  comitente:  string | null   // quem levou o veículo ao leilão
  leiloeiro:  string | null
  lote:       string | null
  descricao:  string | null
  situacao:   string | null
  patio:      string | null
  fotos:      string[]
  danos:      string | null   // laudo de danos, quando o plano inclui IA
  _base:      string
}

function texto(v: unknown): string | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s.length > 0 ? s : null
}

/**
 * Normaliza a resposta da Infocar para o mesmo formato da Assertiva.
 * O relatório lê `resposta.historicoLeilao`, então é esse o formato de saída.
 *
 * Os nomes de campo abaixo cobrem as variações mais comuns. Quando a
 * documentação da Infocar chegar, ajustar apenas esta função: nada mais no
 * sistema precisa mudar.
 */
export function normalizarLeilao(bruto: any): RegistroLeilao[] {
  const lista: any[] =
    bruto?.historicoLeilao ?? bruto?.leiloes ?? bruto?.registros ??
    bruto?.lotes ?? bruto?.data ?? bruto?.resultado ??
    (Array.isArray(bruto) ? bruto : [])

  if (!Array.isArray(lista)) return []

  return lista.map((l: any) => ({
    data:      texto(l.data ?? l.dataLeilao ?? l.data_leilao ?? l.dataEvento ?? l.dataCadastro),
    comitente: texto(l.comitente ?? l.vendedor ?? l.proprietario ?? l.cliente),
    leiloeiro: texto(l.leiloeiro ?? l.leiloeira ?? l.casaLeilao ?? l.casa_leilao ?? l.organizador),
    lote:      texto(l.lote ?? l.numeroLote ?? l.numero_lote),
    descricao: texto(l.descricao ?? l.observacao ?? l.titulo ?? l.evento),
    situacao:  texto(l.situacao ?? l.status ?? l.resultado ?? l.condicao),
    patio:     texto(l.patio ?? l.local ?? l.cidade),
    fotos:     Array.isArray(l.fotos ?? l.imagens) ? (l.fotos ?? l.imagens).filter(Boolean) : [],
    danos:     texto(l.danos ?? l.laudoDanos ?? l.analiseDanos ?? l.avarias),
    _base:     'INFOCAR',
  }))
}

/**
 * Consulta o histórico de leilão por placa ou chassi.
 * Devolve null quando a chave não está configurada, para o chamador cair
 * na Assertiva sem tratar erro.
 */
export async function consultarLeilao(
  documento: string,
  tipo: 'placa' | 'chassi' = 'placa',
): Promise<{ resposta: { historicoLeilao: RegistroLeilao[] }; _fonte: 'infocar' } | null> {
  if (!API_KEY) return null

  const doc = documento.replace(/[^A-Z0-9]/gi, '').toUpperCase()
  const rota = IA_DANOS ? 'leilao-essencial-ia' : 'leilao-essencial'

  const res = await fetch(`${BASE_URL}/v1/${rota}?${tipo}=${encodeURIComponent(doc)}`, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  })

  if (res.status === 404) {
    // Placa sem registro de leilão é resposta válida, não erro.
    return { resposta: { historicoLeilao: [] }, _fonte: 'infocar' }
  }
  if (!res.ok) throw new Error(`Infocar erro ${res.status}`)

  const bruto = await res.json()
  return { resposta: { historicoLeilao: normalizarLeilao(bruto) }, _fonte: 'infocar' }
}
