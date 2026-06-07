import { NextRequest, NextResponse } from 'next/server'
import {
  consultarCpfBasico, consultarScoreCpf, consultarProcessosCpf,
  consultarProtestosCpf, consultarEnderecosCpf, consultarTelefonesCpf,
  consultarRendaCpf, consultarPepCpf, consultarSocietarioCpf,
  consultarRelacionamentosCpf, consultarHistoricoVeiculosPorCpf,
} from '@/lib/providers/assertiva'
import { getAuthEmail, salvarConsulta } from '@/lib/consulta-helper'
import { createServiceRoleClient } from '@/lib/supabase-server'

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

  // Auth e débito de crédito
  const email = await getAuthEmail()
  if (!email) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const svc = createServiceRoleClient() as any
  const { data: perfil } = await svc.from('perfis').select('saldo_consultas, role').eq('email', email).maybeSingle()
  const isAdmin = perfil?.role === 'super_admin' || email === process.env.ADMIN_EMAIL
  const saldo = perfil?.saldo_consultas ?? 0

  if (!isAdmin && saldo <= 0) return NextResponse.json({ error: 'Saldo insuficiente.' }, { status: 402 })

  if (!isAdmin) {
    await svc.from('perfis').update({ saldo_consultas: saldo - 1, atualizado_em: new Date().toISOString() }).eq('email', email)
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

  const resultado = { cpf, basico, score, processos, protestos, enderecos, telefones, renda, pep, societario, relacionamentos, veiculos, erros }
  const descricao = basico?.nome ?? basico?.nomeCompleto ?? ''

  const saved = await salvarConsulta({
    email, tipo: 'cpf',
    documento: cpf,
    descricao,
    resultado,
  })

  return NextResponse.json({ ...resultado, token: saved?.token ?? null })
}
