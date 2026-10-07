// ─── Consulta-base paga, esperando a pessoa confirmar o veículo ───────────────
//
// A identificação veicular custa R$ 3,22 e já diz marca, modelo e ano. Rodar
// ela primeiro deixa a pessoa conferir que digitou a placa certa antes de gastar
// os R$ 54 restantes. O caso real: a AutoVale digitou TNM2H51 no lugar de
// TMN2H51 e pagou R$ 57,38 por um carro que não era o dela.
//
// Esta camada existe por causa do PROTOCOLO: a consulta-base é sempre a
// primeira chamada da Assertiva e dela sai o protocolo que os outros módulos
// exigem. Sem guardar a resposta, a confirmação e a consulta completa pagariam
// a base duas vezes e o total subiria de R$ 57,38 para R$ 60,60. Guardando,
// o preço final é o mesmo de hoje.
//
// Nada aqui lança: falhar em guardar ou em ler a pendência não pode impedir a
// consulta. O pior caso é pagar a base outra vez, que é melhor que travar o
// atendimento ou montar relatório com protocolo inválido.

import { createServiceRoleClient } from './supabase-server'

/**
 * Por quanto tempo a consulta-base paga ainda vale.
 *
 * A Assertiva não documenta a validade do protocolo. Quinze minutos é curto o
 * suficiente para o protocolo ainda valer e longo o suficiente para alguém
 * conferir uma placa na tela. Passado o prazo, a base é consultada e cobrada de
 * novo: pagar R$ 3,22 outra vez é melhor que montar o relatório com protocolo
 * velho e entregar módulo vazio como se fosse "nada consta".
 */
export const JANELA_MINUTOS = 15

export interface BasePendente {
  placa: string
  payload: any
  protocolo: string | null
  custoPago: number
  criadoEm: string
}

/** Normaliza a placa do mesmo jeito em toda parte: sem símbolo, maiúscula. */
export function normalizarPlaca(valor: string): string {
  return (valor ?? '').replace(/[^A-Za-z0-9]/g, '').toUpperCase()
}

/**
 * Guarda a consulta-base já paga. Confirmar a mesma placa de novo substitui o
 * registro, em vez de empilhar lixo (índice único por placa + e-mail).
 */
export async function guardarBasePendente(opts: {
  placa: string
  email: string
  tenantId: string | null
  payload: any
  custoPago: number
}): Promise<void> {
  const placa = normalizarPlaca(opts.placa)
  if (!placa || !opts.email || !opts.payload) return

  try {
    const svc = createServiceRoleClient() as any
    const { error } = await svc
      .from('consulta_base_pendente')
      .upsert({
        placa,
        email:      opts.email,
        tenant_id:  opts.tenantId,
        payload:    opts.payload,
        protocolo:  opts.payload?.cabecalho?.protocolo ?? null,
        custo_pago: opts.custoPago,
        criado_em:  new Date().toISOString(),
      }, { onConflict: 'placa,email' })

    if (error) console.error('[base-pendente] guardar:', error.message)
  } catch (e: any) {
    console.error('[base-pendente] guardar:', e?.message ?? e)
  }
}

/**
 * Busca a consulta-base paga e ainda dentro da janela.
 *
 * Procura primeiro o registro de quem está consultando. Se não houver, aceita o
 * de outro operador da MESMA empresa: o caixa é da empresa, então quem já
 * pagou a base foi ela, não a pessoa.
 *
 * Devolve null quando não existe ou quando está velha demais. Registro velho
 * não é apagado aqui: quem apaga é `descartarBasePendente`, depois do uso, e a
 * limpeza por idade.
 */
export async function lerBasePendente(opts: {
  placa: string
  email: string
  tenantId: string | null
}): Promise<BasePendente | null> {
  const placa = normalizarPlaca(opts.placa)
  if (!placa || !opts.email) return null

  const limite = new Date(Date.now() - JANELA_MINUTOS * 60_000).toISOString()

  try {
    const svc = createServiceRoleClient() as any

    const base = () => svc
      .from('consulta_base_pendente')
      .select('placa, payload, protocolo, custo_pago, criado_em')
      .eq('placa', placa)
      .gt('criado_em', limite)

    let { data } = await base().eq('email', opts.email).maybeSingle()

    if (!data && opts.tenantId) {
      const r = await base()
        .eq('tenant_id', opts.tenantId)
        .order('criado_em', { ascending: false })
        .limit(1)
        .maybeSingle()
      data = r.data
    }

    if (!data?.payload) return null

    return {
      placa:     data.placa,
      payload:   data.payload,
      protocolo: data.protocolo ?? data.payload?.cabecalho?.protocolo ?? null,
      custoPago: Number(data.custo_pago ?? 0),
      criadoEm:  data.criado_em,
    }
  } catch (e: any) {
    console.error('[base-pendente] ler:', e?.message ?? e)
    return null
  }
}

/**
 * Apaga a pendência depois de usada, e de passagem o que já venceu.
 *
 * A limpeza por idade mora aqui, e não num cron, porque a tabela só cresce
 * quando alguém consulta: limpar no mesmo caminho dispensa agendador e mantém
 * a tabela pequena sem mais nenhuma peça móvel.
 */
export async function descartarBasePendente(opts: {
  placa: string
  email: string
}): Promise<void> {
  const placa = normalizarPlaca(opts.placa)

  try {
    const svc = createServiceRoleClient() as any

    if (placa && opts.email) {
      await svc.from('consulta_base_pendente')
        .delete().eq('placa', placa).eq('email', opts.email)
    }

    const vencido = new Date(Date.now() - JANELA_MINUTOS * 60_000).toISOString()
    await svc.from('consulta_base_pendente').delete().lt('criado_em', vencido)
  } catch (e: any) {
    console.error('[base-pendente] descartar:', e?.message ?? e)
  }
}

/**
 * Resumo do veículo para a tela de confirmação.
 *
 * A Assertiva devolve `marcaModelo` repetindo a marca no início ("FIAT FIAT
 * ARGO"), então a marca sai dali quando não vem em campo próprio.
 */
export function resumoDoVeiculo(payload: any): {
  marca: string | null
  modelo: string | null
  ano: string | null
  cor: string | null
  chassi: string | null
  municipio: string | null
} {
  const desc  = payload?.resposta?.descricao ?? payload ?? {}
  const ident = payload?.resposta?.identificadores ?? payload ?? {}

  const marcaModelo: string = String(desc.marcaModelo ?? '').trim()
  const marca = String(desc.marca ?? marcaModelo.split(/[\s/]+/)[0] ?? '').trim() || null

  // Tira a marca repetida do início, para a tela não mostrar "FIAT FIAT ARGO".
  let modelo = marcaModelo || String(desc.modelo ?? '').trim()
  if (marca && modelo.toUpperCase().startsWith(marca.toUpperCase())) {
    modelo = modelo.slice(marca.length).trim() || modelo
  }

  const anoFab = desc.anoFabricacao ?? desc.anoFab ?? null
  const anoMod = desc.anoModelo     ?? desc.anoMod ?? null
  const ano = anoFab && anoMod && String(anoFab) !== String(anoMod)
    ? `${anoFab}/${anoMod}`
    : String(anoMod ?? anoFab ?? '') || null

  return {
    marca,
    modelo: modelo || null,
    ano,
    cor:       desc.cor ?? desc.corVeiculo ?? null,
    chassi:    ident.chassi ?? desc.chassi ?? null,
    municipio: desc.municipio ?? desc.municipioPlaca ?? null,
  }
}
