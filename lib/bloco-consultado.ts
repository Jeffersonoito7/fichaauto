// ─── Um bloco foi consultado, ou só não veio? ────────────────────────────────
//
// Existe porque o relatório de CPF afirmava o que nunca tinha verificado. A
// consulta de pessoa física não traz score, negativações nem protestos (isso é
// a Análise de Crédito), e mesmo assim o PDF escrevia "NADA CONSTA" em verde
// nessas seções e pintava o indicador de protesto de verde. Quem recebe o
// relatório decide compra com base nele.
//
// A distinção que importa: "consultei e não achei nada" é diferente de "não
// consultei". A primeira é informação, a segunda é ausência dela, e tratar as
// duas igual é o mesmo que inventar resultado.

export type StatusBloco = 'ok' | 'warn' | 'error' | 'ausente'

/**
 * O bloco veio na resposta?
 *
 * Objeto vazio conta como AUSENTE: é o que sobra quando a rota monta
 * `data.protestos ?? {}` para um campo que ninguém preencheu. Array vazio
 * também, pelo mesmo motivo.
 */
export function blocoVeio(bloco: unknown): boolean {
  if (bloco === null || bloco === undefined) return false
  if (Array.isArray(bloco)) return bloco.length > 0
  if (typeof bloco !== 'object') return true
  return Object.keys(bloco as object).length > 0
}

/**
 * Status de um indicador de ocorrência (protesto, processo, negativação).
 *
 * Nunca devolve 'ok' para bloco ausente: verde significa "verificado e limpo",
 * e dizer isso sem ter consultado é a falha que esta função previne.
 */
export function statusDeOcorrencia(bloco: unknown, total: number | null | undefined): StatusBloco {
  if (!blocoVeio(bloco)) return 'ausente'
  return Number(total ?? 0) > 0 ? 'error' : 'ok'
}

/**
 * Status do score de crédito.
 *
 * Score ausente vira 'ausente', não 'error'. Antes, `Number(undefined ?? 0)`
 * dava 0 e a faixa mais baixa pintava o indicador de VERMELHO para todo mundo:
 * o relatório dizia que a pessoa tinha péssimo score sem nunca ter consultado,
 * o que é pior que omitir.
 */
export function statusDeScore(bloco: unknown, valor: number | null | undefined): StatusBloco {
  const n = Number(valor ?? 0)
  if (!blocoVeio(bloco) || !(n > 0)) return 'ausente'
  if (n >= 700) return 'ok'
  if (n >= 400) return 'warn'
  return 'error'
}
