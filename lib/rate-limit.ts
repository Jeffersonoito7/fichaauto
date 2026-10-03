// ─── Limite de tentativas por origem ─────────────────────────────────────────
// Usado em rotas públicas que custam dinheiro (chamada paga a fornecedor) ou
// que são alvo de força bruta (login, recuperação de senha).

/**
 * IP de quem chamou, de forma que o próprio cliente não consiga escolher.
 *
 * O código anterior lia `x-forwarded-for.split(',')[0]`, o PRIMEIRO da cadeia.
 * Isso é forjável: basta o atacante enviar `X-Forwarded-For: 1.2.3.4` e cada
 * requisição parece vir de um IP novo, zerando qualquer contador.
 *
 * Esta aplicação roda atrás de UM proxy reverso (Traefik, do EasyPanel), e o
 * proxy ACRESCENTA o IP real ao fim da cadeia. Por isso o valor confiável é o
 * ÚLTIMO elemento: tudo que vem antes dele foi escrito pelo cliente.
 *
 * Se um dia entrar outro proxy na frente (CDN, por exemplo), este número tem
 * que mudar junto, senão o limite volta a ser burlável.
 */
export function ipDaRequisicao(req: Request): string {
  const cadeia = req.headers.get('x-forwarded-for')
  if (cadeia) {
    const partes = cadeia.split(',').map(p => p.trim()).filter(Boolean)
    if (partes.length > 0) return partes[partes.length - 1]
  }
  return req.headers.get('x-real-ip')?.trim() || 'desconhecido'
}

type Registro = { contador: number; expiraEm: number }
const memoria = new Map<string, Registro>()

/** Evita a memória crescer para sempre com chaves que ninguém mais usa. */
function limpar(agora: number) {
  if (memoria.size < 5000) return
  for (const [chave, reg] of memoria) {
    if (agora > reg.expiraEm) memoria.delete(chave)
  }
}

export interface ResultadoLimite {
  permitido: boolean
  restantes: number
  /** Segundos até a janela reabrir. Serve para o cabeçalho Retry-After. */
  esperarSegundos: number
}

/**
 * Conta tentativas por chave dentro de uma janela de tempo.
 *
 * O estado vive na memória do processo. Isso é suficiente aqui porque a
 * aplicação roda em UM processo PM2. Se um dia houver mais de uma instância,
 * cada uma terá o próprio contador e o limite efetivo será multiplicado pelo
 * número de instâncias: nesse dia, trocar por Redis.
 */
export function limitar(
  chave: string,
  maximo: number,
  janelaMs: number,
): ResultadoLimite {
  const agora = Date.now()
  limpar(agora)

  const reg = memoria.get(chave)

  if (!reg || agora > reg.expiraEm) {
    memoria.set(chave, { contador: 1, expiraEm: agora + janelaMs })
    return { permitido: true, restantes: maximo - 1, esperarSegundos: 0 }
  }

  if (reg.contador >= maximo) {
    return {
      permitido: false,
      restantes: 0,
      esperarSegundos: Math.max(1, Math.ceil((reg.expiraEm - agora) / 1000)),
    }
  }

  reg.contador++
  return {
    permitido: true,
    restantes: maximo - reg.contador,
    esperarSegundos: 0,
  }
}

/** Resposta padrão de limite estourado, com Retry-After para clientes educados. */
export function respostaLimiteExcedido(esperarSegundos: number, mensagem?: string): Response {
  return new Response(
    JSON.stringify({
      erro: mensagem ?? 'Muitas tentativas. Aguarde um momento e tente de novo.',
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(esperarSegundos),
      },
    },
  )
}
