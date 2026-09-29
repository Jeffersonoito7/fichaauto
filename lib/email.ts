// ─── Envio de e-mail transacional pelo Resend ────────────────────────────────
// Remetente único da plataforma, decisão do Jefferson em 19/09: quem envia é a
// conta global, e o e-mail só menciona o nome do cliente no texto. Assim nenhum
// cliente precisa configurar SMTP próprio.

const API_KEY    = process.env.RESEND_API_KEY ?? ''
const REMETENTE  = process.env.EMAIL_REMETENTE ?? 'Ficha Auto <nao-responda@fichaauto.com.br>'

export function emailConfigurado(): boolean {
  return API_KEY.length > 0
}

export async function enviarEmail(opts: {
  para: string
  assunto: string
  html: string
}): Promise<{ ok: boolean; erro?: string }> {
  if (!API_KEY) return { ok: false, erro: 'RESEND_API_KEY não configurada' }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:    REMETENTE,
        to:      [opts.para],
        subject: opts.assunto,
        html:    opts.html,
      }),
    })

    if (!res.ok) {
      const corpo = await res.text()
      console.error('[email] Resend recusou:', res.status, corpo.slice(0, 200))
      return { ok: false, erro: `Resend ${res.status}` }
    }
    return { ok: true }
  } catch (e: any) {
    console.error('[email] falha ao enviar:', e?.message ?? e)
    return { ok: false, erro: 'falha de rede' }
  }
}

/** Corpo do e-mail de recuperação, com a marca de quem o usuário conhece. */
export function htmlRecuperacao(opts: {
  link: string
  nomeEmpresa: string
  cor: string
  validadeMinutos: number
}): string {
  const { link, nomeEmpresa, cor, validadeMinutos } = opts
  return `
<!doctype html>
<html lang="pt-BR"><body style="margin:0;background:#f5f6fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f6fa;padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border:1px solid #e4e6ed;border-radius:14px;overflow:hidden">
        <tr><td style="height:4px;background:${cor}"></td></tr>
        <tr><td style="padding:32px">
          <h1 style="margin:0 0 8px;font-size:19px;color:#1a1d27">Redefinir sua senha</h1>
          <p style="margin:0 0 22px;font-size:14px;line-height:1.55;color:#4a4f65">
            Recebemos um pedido para redefinir a senha do seu acesso em
            <strong style="color:#1a1d27">${nomeEmpresa}</strong>.
            Clique no botão abaixo para escolher uma nova senha.
          </p>
          <a href="${link}" style="display:inline-block;background:${cor};color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 28px;border-radius:10px">
            Criar nova senha
          </a>
          <p style="margin:22px 0 0;font-size:12.5px;line-height:1.55;color:#4a4f65">
            O link vale por <strong>${validadeMinutos} minutos</strong> e só pode ser usado uma vez.
          </p>
          <p style="margin:18px 0 0;padding-top:18px;border-top:1px solid #e4e6ed;font-size:12px;line-height:1.55;color:#9097b1">
            Se você não pediu a troca de senha, ignore esta mensagem. Sua senha
            atual continua valendo e ninguém consegue acessar sua conta com este e-mail.
          </p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:11px;color:#9097b1">Este e-mail é automático, não responda.</p>
    </td></tr>
  </table>
</body></html>`
}
