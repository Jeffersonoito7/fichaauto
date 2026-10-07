// ─── Etapa 1 da consulta veicular: confirmar o veículo ───────────────────────
//
// Roda SÓ a identificação (R$ 3,22) e devolve marca, modelo e ano para a pessoa
// confirmar que digitou a placa certa. Existe porque a AutoVale digitou
// TNM2H51 no lugar de TMN2H51 e pagou R$ 57,38 por um carro que não era o dela.
//
// A resposta da consulta-base fica guardada com o protocolo, então a etapa
// completa reaproveita o que já foi pago e o preço final não muda. Ver
// lib/consulta-base-pendente.ts.

import { NextRequest, NextResponse } from 'next/server'
import { consultarPlaca } from '@/lib/providers/assertiva'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { getAuthEmail, registrarAuditoria, tenantComAssinaturaAtiva } from '@/lib/consulta-helper'
import { lerSaldo, debitarSaldo, mensagemSemSaldo } from '@/lib/saldo'
import { CUSTO_MODULO } from '@/lib/modulos-veiculo'
import {
  guardarBasePendente, lerBasePendente, resumoDoVeiculo, normalizarPlaca,
} from '@/lib/consulta-base-pendente'
import { buscarConsultaAnterior, textoIdade } from '@/lib/reaproveitar-consulta'
import { ipDaRequisicao, limitar, respostaLimiteExcedido } from '@/lib/rate-limit'

const CUSTO_IDENT = CUSTO_MODULO.placa_identificacao.custo

export async function POST(req: NextRequest) {
  try {
    const { placa } = await req.json()
    const doc = normalizarPlaca(placa ?? '')

    if (doc.length < 7) {
      return NextResponse.json({ error: 'Placa inválida' }, { status: 400 })
    }

    const email = await getAuthEmail()
    if (!email) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Esta rota gasta dinheiro a cada chamada, então tem teto por IP.
    const limite = limitar(`identificar:${ipDaRequisicao(req)}`, 20, 60_000)
    if (!limite.permitido) {
      return respostaLimiteExcedido(limite.esperarSegundos, 'Muitas consultas. Aguarde um instante.')
    }

    const service = createServiceRoleClient() as any
    const { data: perfil } = await service
      .from('perfis')
      .select('role, pode_placa, tenant_id')
      .eq('email', email)
      .maybeSingle()

    const isAdmin = perfil?.role === 'super_admin' || email === process.env.ADMIN_EMAIL
    const isAssinante = !isAdmin && await tenantComAssinaturaAtiva(email)
    const tenantId = perfil?.tenant_id ?? null

    if (!isAdmin && !isAssinante && !perfil?.pode_placa) {
      return NextResponse.json({ error: 'Sem permissão para consulta veicular.' }, { status: 403 })
    }

    // A empresa já tem relatório desta placa? Então não gasta nem os R$ 3,22:
    // a tela oferece o relatório existente. Mesma regra da tela de consulta.
    const anterior = tenantId ? await buscarConsultaAnterior(tenantId, doc, 'veiculo') : null
    if (anterior) {
      return NextResponse.json({
        jaConsultada: true,
        placa: doc,
        consultadaEm:  anterior.consultadaEm,
        diasAtras:     anterior.diasAtras,
        envelhecida:   anterior.envelhecida,
        idadeTexto:    textoIdade(anterior),
        consultadaPor: anterior.consultadaPor,
      })
    }

    // Já identificou esta placa há pouco? Não cobra de novo.
    const pendente = await lerBasePendente({ placa: doc, email, tenantId })
    if (pendente) {
      return NextResponse.json({
        placa: doc,
        veiculo: resumoDoVeiculo(pendente.payload),
        custo: 0,
        jaIdentificada: true,
      })
    }

    const { saldo, origem } = await lerSaldo(service, { email, tenantId })
    if (!isAdmin && !isAssinante && saldo < CUSTO_IDENT) {
      return NextResponse.json(
        { error: mensagemSemSaldo(saldo, CUSTO_IDENT, origem), recarregar: true, saldo },
        { status: 402 }
      )
    }

    const payload = await consultarPlaca(doc)
    const veiculo = resumoDoVeiculo(payload)

    // Placa que não existe não deve custar nada: sem marca nem modelo, não há
    // o que confirmar e cobrar seria cobrar por uma resposta vazia.
    if (!veiculo.marca && !veiculo.modelo) {
      return NextResponse.json({
        error: 'Não encontramos veículo com esta placa. Confira os caracteres.',
        naoEncontrada: true,
      }, { status: 404 })
    }

    let debitado = 0
    if (!isAdmin && !isAssinante) {
      const d = await debitarSaldo(service, { email, tenantId, valor: CUSTO_IDENT })
      if (!d.sucesso) {
        return NextResponse.json(
          { error: mensagemSemSaldo(d.restante, CUSTO_IDENT, origem), recarregar: true, saldo: d.restante },
          { status: 402 }
        )
      }
      debitado = CUSTO_IDENT
    }

    // Guardado DEPOIS do débito: sem isto, a etapa completa reaproveitaria uma
    // base que ninguém pagou.
    await guardarBasePendente({ placa: doc, email, tenantId, payload, custoPago: debitado })

    registrarAuditoria({ email, acao: 'consulta_identificacao', documento: doc, custo: debitado })

    return NextResponse.json({ placa: doc, veiculo, custo: debitado })
  } catch (err: any) {
    console.error('[identificar]', err?.message ?? err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
