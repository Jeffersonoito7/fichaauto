/**
 * Indicadores de veículo — fonte ÚNICA de verdade para "tem ou não tem registro".
 *
 * POR QUE ESTE ARQUIVO EXISTE
 * ---------------------------
 * A Assertiva devolve, com frequência, listas com UM OBJETO VAZIO quando o
 * veículo NÃO tem o registro consultado. Exemplo real, copiado do banco:
 *
 *     { "historicoLeilao": [ {} ] }
 *
 * Isso NÃO é um leilão. É a forma da Assertiva dizer "consultei e não achei
 * nada". Quem contar `historicoLeilao.length` lê 1 e grita "1 ocorrência de
 * leilão". Foi exatamente esse bug que colocou a MESMA placa como LEILÃO na
 * página pública e SEM LEILÃO no relatório completo, em produção.
 *
 * Variantes do mesmo problema, todas já vistas na resposta da Assertiva:
 *  - lista com um objeto só de metadado nosso (`[{ _base: 'HISTÓRICO' }]`);
 *  - registro cujo único conteúdo é `situacao: 'NADA CONSTA'` / 'SEM REGISTRO';
 *  - campo booleano `false` (que, renderizado cru, virava o texto "false");
 *  - módulo ausente (`null`/`undefined`) porque o plano não cobre ou a chamada
 *    falhou — e isso tem de aparecer como "Não consultado", nunca como
 *    "Nada consta" nem com visual de "tudo certo". Já tivemos esse erro com
 *    PEP, em que `null` virava um check verde de "Não identificado".
 *    DADO AUSENTE NÃO É DADO LIMPO.
 *
 * REGRA (não "simplifique" isso)
 * ------------------------------
 * Um registro só conta como real se:
 *   1. não for sentinela de ausência ("NADA CONSTA", "SEM REGISTRO", ...), e
 *   2. tiver pelo menos UM campo identificador preenchido (data, comitente,
 *      leiloeiro, órgão, comarca, descrição, ...).
 *
 * A lista branca de campos identificadores é deliberada. Qualquer tentativa de
 * trocá-la por "tem alguma chave preenchida" volta a contar `[{ _base: ... }]`
 * como leilão e reintroduz o bug de produção.
 */

/** Módulo não consultado | consultado e vazio | consultado com registro. */
export type StatusIndicador = 'nao-consultado' | 'nada-consta' | 'consta'

/** Textos que a Assertiva usa para dizer "consultei e não achei nada". */
export const SENTINELAS_AUSENCIA = [
  'NADA CONSTA',
  'NAO CONSTA',
  'NÃO CONSTA',
  'SEM REGISTRO',
  'SEM REGISTROS',
  'SEM RESTRICAO',
  'SEM RESTRIÇÃO',
  'SEM INDICIO',
  'SEM INDÍCIO',
  'NAO EXISTEM',
  'NÃO EXISTEM',
] as const

/**
 * Campos identificadores de um registro de LEILÃO.
 * Exatamente a lista que o relatório completo (a tela de referência, correta)
 * já usava. Não reduzir.
 */
export const CAMPOS_ID_LEILAO = [
  'data',
  'dataLeilao',
  'dataCadastro',
  'comitente',
  'leiloeiro',
  'leilaoeiro', // typo que a API devolve em alguns payloads; mantido de propósito
  'orgao',
  'comarca',
  'descricao',
] as const

/** Campos identificadores de um registro de GRAVAME / restrição financeira. */
export const CAMPOS_ID_GRAVAME = [
  'agente',
  'nomeAgente',
  'financeira',
  'banco',
  'contrato',
  'numeroContrato',
  'data',
  'dataInclusao',
  'dataVigencia',
  'restricao',
  'tipoRestricao',
  'restricaoFinanceira',
  'alienacao',
  'descricao',
] as const

/** Campos identificadores de uma ocorrência de ROUBO/FURTO ou SINISTRO. */
export const CAMPOS_ID_OCORRENCIA = [
  'data',
  'dataOcorrencia',
  'dataSinistro',
  'dataRegistro',
  'bo',
  'numeroBo',
  'ocorrencia',
  'delegacia',
  'orgao',
  'uf',
  'municipio',
  'seguradora',
  'tipo',
  'descricao',
] as const

/** Campos identificadores de uma restrição genérica (RENAJUD, judicial, ...). */
export const CAMPOS_ID_RESTRICAO = [
  'data',
  'dataInclusao',
  'orgao',
  'orgaoRestricao',
  'comarca',
  'processo',
  'numeroProcesso',
  'tribunal',
  'restricao',
  'tipoRestricao',
  'descricao',
] as const

/**
 * Campos identificadores de uma sanção (CEIS/CNEP) nos relatórios de CPF/CNPJ.
 * Mesma classe de problema: a lista pode vir com um item vazio de padding.
 */
export const CAMPOS_ID_SANCAO = [
  'data',
  'dataInicio',
  'dataInicioSancao',
  'dataPublicacao',
  'orgao',
  'orgaoSancionador',
  'tipo',
  'tipoSancao',
  'processo',
  'numeroProcesso',
  'fundamentacao',
  'descricao',
  'nome',
] as const

function normaliza(v: unknown): string {
  return String(v ?? '').trim().toUpperCase()
}

/** true quando o texto é uma sentinela de ausência da Assertiva. */
export function ehSentinelaAusencia(valor: unknown): boolean {
  const u = normaliza(valor)
  if (!u) return false
  return SENTINELAS_AUSENCIA.some(s => u.includes(s))
}

/** Módulo não veio (plano não cobre, chamada falhou, campo inexistente). */
export function naoConsultado(modulo: unknown): boolean {
  return modulo === null || modulo === undefined
}

/**
 * Um item de lista conta como registro real?
 * `campos` é a lista branca de campos identificadores — ver comentário do topo.
 */
export function ehRegistroReal(
  item: unknown,
  campos: readonly string[] = CAMPOS_ID_LEILAO,
): boolean {
  if (item === null || item === undefined) return false

  // Registro que vem como texto puro: só conta se não for sentinela.
  if (typeof item !== 'object') {
    const u = normaliza(item)
    return !!u && !ehSentinelaAusencia(u)
  }

  const obj = item as Record<string, unknown>

  // 1. Resposta "NADA CONSTA" / "SEM REGISTRO" nunca é registro.
  const situacao = obj.resultado ?? obj.situacao ?? obj.status
  if (ehSentinelaAusencia(situacao)) return false

  // 2. Precisa de pelo menos um campo identificador preenchido.
  //    É isto que descarta o `[{}]` (e o `[{ _base: 'HISTÓRICO' }]`).
  return campos.some(c => {
    const v = obj[c]
    if (v === null || v === undefined) return false
    // Um campo identificador que CONTÉM a sentinela ("restricao": "SEM
    // RESTRICAO", "descricao": "NADA CONSTA") não identifica registro nenhum.
    if (typeof v === 'string') return v.trim() !== '' && !ehSentinelaAusencia(v)
    if (typeof v === 'boolean') return v
    return true
  })
}

/** Só os registros reais de uma lista. Entrada não-array devolve []. */
export function registrosReais<T = any>(
  lista: unknown,
  campos: readonly string[] = CAMPOS_ID_LEILAO,
): T[] {
  if (!Array.isArray(lista)) return []
  return lista.filter(item => ehRegistroReal(item, campos)) as T[]
}

/**
 * A ÚNICA contagem de registros que deve existir no produto.
 * `[{}]` → 0. `[]` → 0. `null`/`undefined` → 0.
 */
export function contarRegistrosReais(
  lista: unknown,
  campos: readonly string[] = CAMPOS_ID_LEILAO,
): number {
  return registrosReais(lista, campos).length
}

/**
 * Status de um indicador que vem como LISTA.
 * `null`/`undefined` → 'nao-consultado' (nunca 'nada-consta').
 */
export function statusLista(
  lista: unknown,
  campos: readonly string[] = CAMPOS_ID_LEILAO,
): StatusIndicador {
  if (naoConsultado(lista)) return 'nao-consultado'
  return contarRegistrosReais(lista, campos) > 0 ? 'consta' : 'nada-consta'
}

/**
 * Status de um indicador que vem como TEXTO ou BOOLEANO
 * (`restricaoRENAJUD`, `restricaoRouboFurto`, `indicioSinistro`, ...).
 *
 * - ausente/vazio  → 'nao-consultado' (campo que não veio não é campo limpo)
 * - `false`        → 'nada-consta'  (e NUNCA o texto cru "false")
 * - sentinela      → 'nada-consta'
 * - qualquer outro → 'consta'
 */
export function statusTexto(valor: unknown): StatusIndicador {
  if (valor === null || valor === undefined) return 'nao-consultado'
  if (typeof valor === 'boolean') return valor ? 'consta' : 'nada-consta'
  if (typeof valor === 'object') {
    const obj = valor as Record<string, unknown>
    const inner = obj.descricao ?? obj.titulo ?? obj.situacao ?? obj.resultado ?? obj.status
    return inner === undefined ? 'nao-consultado' : statusTexto(inner)
  }
  const u = normaliza(valor)
  if (!u) return 'nao-consultado'
  if (u === 'FALSE') return 'nada-consta'
  if (u === 'TRUE') return 'consta'
  if (ehSentinelaAusencia(u)) return 'nada-consta'
  return 'consta'
}

/**
 * Rótulo legível de um status. Garante que:
 *  - 'nao-consultado' vira "Não consultado" (nunca "Não informado",
 *    nunca visual de "tudo certo");
 *  - booleano cru nunca chega à tela como "false".
 */
export function rotuloStatus(
  status: StatusIndicador,
  textoConsta = 'Consta registro',
  textoNadaConsta = 'Nada consta',
): string {
  if (status === 'nao-consultado') return 'Não consultado'
  if (status === 'nada-consta') return textoNadaConsta
  return textoConsta
}

/**
 * Status de texto já resolvido para a tela, preservando a descrição original
 * quando ela existe e é informativa.
 */
export function rotuloTexto(valor: unknown): { status: StatusIndicador; texto: string } {
  const status = statusTexto(valor)
  if (status === 'nao-consultado') return { status, texto: 'Não consultado' }
  if (status === 'nada-consta') {
    // Descrição textual útil ("NADA CONSTA") é preservada; booleano `false` não.
    const t = typeof valor === 'string' && valor.trim() && normaliza(valor) !== 'FALSE'
      ? valor.trim()
      : 'Nada consta'
    return { status, texto: t }
  }
  const t = typeof valor === 'string' && valor.trim()
    ? valor.trim()
    : typeof valor === 'object' && valor !== null
      ? String((valor as any).descricao ?? (valor as any).titulo ?? 'Consta registro')
      : 'Consta registro'
  return { status, texto: t }
}

/**
 * Achata o histórico de leilão da Assertiva preservando a base de origem,
 * sem filtrar. Use `registrosLeilao` para a lista já limpa.
 */
export function leilaoRegistrosBrutos(leilaoResp: any): any[] {
  const r = leilaoResp ?? {}
  if (Array.isArray(r.historicoLeilao)) {
    return r.historicoLeilao.map((l: any) => ({ ...l, _base: l?._base ?? 'HISTÓRICO' }))
  }
  return [
    ...(Array.isArray(r.baseA) ? r.baseA.map((l: any) => ({ ...l, _base: 'BASE A — JUDICIAL' })) : []),
    ...(Array.isArray(r.baseB) ? r.baseB.map((l: any) => ({ ...l, _base: 'BASE B — FINANCEIRO' })) : []),
    ...(Array.isArray(r.remarketing) ? r.remarketing.map((l: any) => ({ ...l, _base: 'REMARKETING' })) : []),
    ...(Array.isArray(r.lotes) ? r.lotes.map((l: any) => ({ ...l, _base: 'JUDICIAL — LOTES' })) : []),
  ]
}

/** Leilões REAIS do módulo de leilão (já achatados e filtrados). */
export function registrosLeilao(leilaoResp: any): any[] {
  return registrosReais(leilaoRegistrosBrutos(leilaoResp), CAMPOS_ID_LEILAO)
}

/** Quantidade de leilões reais. `{ historicoLeilao: [{}] }` → 0. */
export function contarLeilao(leilaoResp: any): number {
  return registrosLeilao(leilaoResp).length
}

/**
 * Status do indicador de leilão a partir do MÓDULO inteiro
 * (`data.leilao`), para distinguir "não consultado" de "nada consta".
 */
export function statusLeilao(moduloLeilao: any): StatusIndicador {
  if (naoConsultado(moduloLeilao)) return 'nao-consultado'
  const resp = moduloLeilao?.resposta ?? moduloLeilao ?? {}
  return contarLeilao(resp) > 0 ? 'consta' : 'nada-consta'
}

/**
 * Gravame real?
 *
 * O gravame da API v3 vem como OBJETO ÚNICO com nomes de campo que variam por
 * agente financeiro, então aqui a lista branca é usada como atalho e há um
 * fallback: qualquer campo preenchido serve, desde que o registro não seja
 * sentinela de ausência e não seja só metadado interno (`_base`). O que este
 * filtro garante é o mesmo do leilão: `{}` e `{ situacao: 'NADA CONSTA' }`
 * contam ZERO.
 */
function ehGravameReal(item: unknown): boolean {
  if (item === null || item === undefined) return false
  if (typeof item !== 'object') {
    const u = normaliza(item)
    return !!u && !ehSentinelaAusencia(u)
  }
  if (ehRegistroReal(item, CAMPOS_ID_GRAVAME)) return true
  const obj = item as Record<string, unknown>
  if (ehSentinelaAusencia(obj.resultado ?? obj.situacao ?? obj.status)) return false
  return Object.entries(obj).some(([k, v]) => {
    if (k.startsWith('_')) return false
    if (v === null || v === undefined) return false
    if (typeof v === 'string') return v.trim() !== '' && !ehSentinelaAusencia(v)
    if (typeof v === 'boolean') return v
    return true
  })
}

/** Gravames REAIS. Aceita objeto único (API v3) ou lista. */
export function registrosGravame(gravResp: any): any[] {
  const r = gravResp ?? {}
  const lista = r.gravames ?? r.listaGravames
  if (Array.isArray(lista)) return lista.filter(ehGravameReal)
  const obj = r.gravame
  if (obj && typeof obj === 'object' && Object.keys(obj).length > 0) {
    return [obj].filter(ehGravameReal)
  }
  return []
}

/**
 * Status do gravame a partir do MÓDULO inteiro (`data.gravame`), para
 * distinguir "não consultado" de "nada consta".
 */
export function statusGravame(moduloGravame: any): StatusIndicador {
  if (naoConsultado(moduloGravame)) return 'nao-consultado'
  const resp = moduloGravame?.resposta ?? moduloGravame ?? {}
  return registrosGravame(resp).length > 0 ? 'consta' : 'nada-consta'
}
