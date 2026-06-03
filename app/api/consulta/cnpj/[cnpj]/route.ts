import { NextRequest, NextResponse } from 'next/server'
import {
  consultarCnpjBasico, consultarQsaCnpj, consultarScoreCnpj,
  consultarProcessosCnpj, consultarProtestosCnpj, consultarRelacionadasCnpj,
} from '@/lib/providers/assertiva'

function limpaCnpj(c: string) { return c.replace(/\D/g, '') }

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ cnpj: string }> }
) {
  const { cnpj: cnpjParam } = await context.params
  const cnpj = limpaCnpj(cnpjParam)

  if (cnpj.length !== 14) {
    return NextResponse.json({ error: 'CNPJ inválido' }, { status: 400 })
  }

  const erros: string[] = []
  const safe = async (fn: () => Promise<any>, nome: string) => {
    try { return await fn() }
    catch (e: any) { erros.push(`${nome}: ${e.message}`); return null }
  }

  const [basico, qsa, score, processos, protestos, relacionadas] =
    await Promise.all([
      safe(() => consultarCnpjBasico(cnpj),       'basico'),
      safe(() => consultarQsaCnpj(cnpj),           'qsa'),
      safe(() => consultarScoreCnpj(cnpj),         'score'),
      safe(() => consultarProcessosCnpj(cnpj),     'processos'),
      safe(() => consultarProtestosCnpj(cnpj),     'protestos'),
      safe(() => consultarRelacionadasCnpj(cnpj),  'relacionadas'),
    ])

  return NextResponse.json({
    cnpj, basico, qsa, score, processos, protestos, relacionadas, erros,
  })
}
