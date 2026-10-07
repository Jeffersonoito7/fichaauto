// ─── Leitura do relatório já pago, para as rotas de impressão ────────────────
//
// Existe porque as três rotas de PDF geravam custo em vez de imprimir:
//
//   - /api/pdf/[placa] lia a consulta salva ordenando por `criado_em`, coluna
//     que não existe. A query falhava sempre, um catch vazio engolia o erro e o
//     fallback refazia a consulta na Assertiva: até R$ 57,38 por download, sem
//     debitar ninguém e sem nada parecer errado.
//   - /api/pdf/cpf e /api/pdf/cnpj eram piores: nem tentavam ler o banco.
//     Disparavam 11 e 6 chamadas pagas a cada download, para qualquer usuário
//     autenticado, inclusive sem saldo e sem permissão para o produto.
//
// A regra que este arquivo carrega: rota de IMPRESSÃO não gera dado. Ela só
// imprime o que já foi pago. Quem cobra é a rota de consulta.

import { createServiceRoleClient } from './supabase-server'

export type TipoRelatorio = 'veiculo' | 'cpf' | 'cnpj' | 'credito_cpf' | 'credito_cnpj'

export interface RelatorioSalvo {
  resultado: any
  consultadoEm: string
  tenantId: string | null
}

export interface FalhaRelatorio {
  /** 404: não existe relatório pago. 500: o banco falhou ao responder. */
  status: 404 | 500
  mensagem: string
}

/** Normaliza igual em toda parte: só letras e números, maiúsculo. */
function normalizar(doc: string): string {
  return (doc ?? '').replace(/[^A-Za-z0-9]/g, '').toUpperCase()
}

/**
 * Busca o relatório já pago para imprimir.
 *
 * O relatório é da EMPRESA, não da pessoa: qualquer operador pode imprimir o
 * que a empresa pagou. Sem empresa, vale só o que é do próprio e-mail.
 *
 * Nunca lança e nunca consulta API externa. Devolve `{ erro }` quando não há o
 * que imprimir, para a rota responder sem inventar dado nem gerar custo.
 */
export async function buscarRelatorioSalvo(opts: {
  email: string
  tenantId: string | null
  tipo: TipoRelatorio
  documento: string
}): Promise<{ dados: RelatorioSalvo } | { erro: FalhaRelatorio }> {
  const doc = normalizar(opts.documento)

  if (!doc || !opts.email) {
    return { erro: { status: 404, mensagem: 'Documento inválido.' } }
  }

  try {
    const svc = createServiceRoleClient() as any

    let q = svc
      .from('consultas')
      .select('resultado, created_at, tenant_id')
      .eq('tipo', opts.tipo)
      .eq('documento', doc)
      .not('resultado', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)

    q = opts.tenantId ? q.eq('tenant_id', opts.tenantId) : q.eq('email', opts.email)

    const { data, error } = await q.maybeSingle()

    if (error) {
      // Falha de leitura NUNCA pode virar consulta paga silenciosa.
      console.error('[relatorio-salvo]', opts.tipo, error.message)
      return {
        erro: {
          status: 500,
          mensagem: 'Não foi possível ler o relatório salvo. Tente novamente.',
        },
      }
    }

    if (!data?.resultado) {
      return {
        erro: {
          status: 404,
          mensagem: 'Não há relatório salvo para este documento. Faça a consulta primeiro.',
        },
      }
    }

    // Consultas antigas foram gravadas com JSON.stringify numa coluna jsonb,
    // então vêm como string escapada. Aceita os dois formatos.
    let resultado = data.resultado
    if (typeof resultado === 'string') {
      try {
        resultado = JSON.parse(resultado)
      } catch {
        console.error('[relatorio-salvo] resultado corrompido:', opts.tipo, doc)
        return {
          erro: { status: 500, mensagem: 'O relatório salvo está corrompido. Refaça a consulta.' },
        }
      }
    }

    if (!resultado || typeof resultado !== 'object') {
      return {
        erro: { status: 500, mensagem: 'O relatório salvo está corrompido. Refaça a consulta.' },
      }
    }

    return {
      dados: {
        resultado,
        consultadoEm: data.created_at,
        tenantId: data.tenant_id ?? null,
      },
    }
  } catch (e: any) {
    console.error('[relatorio-salvo]', opts.tipo, e?.message ?? e)
    return {
      erro: { status: 500, mensagem: 'Não foi possível ler o relatório salvo. Tente novamente.' },
    }
  }
}
