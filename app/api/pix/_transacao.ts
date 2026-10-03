// Helpers compartilhados dos caminhos de dinheiro do PIX.
// Arquivo auxiliar: nao e rota (rota no App Router precisa se chamar route.ts).

/**
 * Devolve a transacao para 'pendente' quando o credito pos-pagamento falhou,
 * para que o proximo aviso da Efi (ou o polling) tente creditar de novo.
 *
 * Se esta reversao TAMBEM falhar, o dinheiro fica marcado como pago sem credito
 * concedido: e perda silenciosa de dinheiro do cliente. Por isso o erro e
 * registrado em nivel de alerta, com o txid, para reconciliacao manual.
 */
export async function reverterParaPendente(
  supabase: any,
  txid: string,
  motivo: string,
): Promise<void> {
  const { error } = await supabase
    .from('transacoes_pix')
    .update({ status: 'pendente', pago_em: null })
    .eq('txid', txid)

  if (error) {
    console.error(
      `[PIX] ALERTA RECONCILIACAO: txid=${txid} ficou 'pago' sem credito (${motivo}) ` +
      `e a reversao para 'pendente' falhou:`,
      error.message,
    )
  }
}
