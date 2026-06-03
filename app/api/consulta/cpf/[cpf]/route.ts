import { NextRequest, NextResponse } from 'next/server'
import {
  consultarCpfBasico, consultarScoreCpf, consultarProcessosCpf,
  consultarProtestosCpf, consultarEnderecosCpf, consultarTelefonesCpf,
  consultarRendaCpf, consultarPepCpf, consultarSocietarioCpf,
  consultarRelacionamentosCpf, consultarHistoricoVeiculosPorCpf,
} from '@/lib/providers/assertiva'

function limpaCpf(c: string) { return c.replace(/\D/g, '') }

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ cpf: string }> }
) {
  const { cpf: cpfParam } = await context.params
  const cpf = limpaCpf(cpfParam)

  if (cpf.length !== 11) {
    return NextResponse.json({ error: 'CPF inválido' }, { status: 400 })
  }

  const erros: string[] = []
  const safe = async (fn: () => Promise<any>, nome: string) => {
    try { return await fn() }
    catch (e: any) { erros.push(`${nome}: ${e.message}`); return null }
  }

  const [basico, score, processos, protestos, enderecos, telefones, renda, pep, societario, relacionamentos, veiculos] =
    await Promise.all([
      safe(() => consultarCpfBasico(cpf),              'basico'),
      safe(() => consultarScoreCpf(cpf),               'score'),
      safe(() => consultarProcessosCpf(cpf),           'processos'),
      safe(() => consultarProtestosCpf(cpf),           'protestos'),
      safe(() => consultarEnderecosCpf(cpf),           'enderecos'),
      safe(() => consultarTelefonesCpf(cpf),           'telefones'),
      safe(() => consultarRendaCpf(cpf),               'renda'),
      safe(() => consultarPepCpf(cpf),                 'pep'),
      safe(() => consultarSocietarioCpf(cpf),          'societario'),
      safe(() => consultarRelacionamentosCpf(cpf),     'relacionamentos'),
      safe(() => consultarHistoricoVeiculosPorCpf(cpf),'veiculos'),
    ])

  return NextResponse.json({
    cpf, basico, score, processos, protestos,
    enderecos, telefones, renda, pep, societario,
    relacionamentos, veiculos, erros,
  })
}
