// ─── Confere se o PIX pago corresponde ao PIX cobrado ────────────────────────
//
// Até 10/10/2026 esta conferência não existia. O webhook marcava a transação
// como paga e creditava o valor da COBRANÇA gravada no nosso banco, sem nunca
// olhar quanto a pessoa realmente pagou. Cobrança de R$ 1.000 quitada com
// R$ 1,00 creditava R$ 1.000, e nada parecia errado em lugar nenhum.
//
// A decisão mora aqui, fora do webhook, porque é regra de dinheiro: inline, no
// meio de um laço com await, ela não teria teste nenhum e erraria calada.

/** Diferença tolerada, em reais, para arredondamento do provedor. */
export const TOLERANCIA = 0.01

export type ResultadoConferencia =
  | { aceito: true;  valorPago: number }
  | { aceito: false; valorPago: number | null; motivo: 'sem_valor' | 'pago_a_menor' }

/**
 * Decide se o pagamento pode creditar saldo.
 *
 * Pagamento a MENOR não credita: a transação fica divergente, esperando pessoa.
 * Decidir se devolve, credita proporcional ou cobra a diferença é regra de
 * negócio do dono, não do código.
 *
 * Pagamento a MAIOR é aceito, e quem credita usa o valor COBRADO: o excedente
 * nunca vira saldo sozinho.
 *
 * Valor ausente ou ilegível no aviso não credita. Sem poder conferir, segurar e
 * revisar é melhor que confiar apenas no que nós mesmos gravamos.
 */
export function conferirPagamento(opts: {
  valorCobrado: unknown
  valorPago: unknown
}): ResultadoConferencia {
  const pago = paraNumero(opts.valorPago)
  if (pago === null) return { aceito: false, valorPago: null, motivo: 'sem_valor' }

  const cobrado = paraNumero(opts.valorCobrado)

  // Sem cobrança registrada não há o que comparar: não inventa divergência.
  if (cobrado === null || cobrado <= 0) return { aceito: true, valorPago: pago }

  if (pago + TOLERANCIA < cobrado) {
    return { aceito: false, valorPago: pago, motivo: 'pago_a_menor' }
  }

  return { aceito: true, valorPago: pago }
}

/**
 * Converte o que o provedor mandou em número.
 *
 * A Efí manda o valor como string ("10.00"), e o Postgres devolve numeric como
 * string também. String vazia, nulo e texto não numérico viram null, nunca 0:
 * `Number('')` é 0 e faria um pagamento inexistente passar por conferido.
 */
function paraNumero(v: unknown): number | null {
  if (v === null || v === undefined) return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : null

  const texto = String(v).trim()
  if (texto === '') return null

  const n = Number(texto)
  return Number.isFinite(n) ? n : null
}
