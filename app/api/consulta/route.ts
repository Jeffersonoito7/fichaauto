import { NextRequest, NextResponse } from 'next/server'
import { consultarVeiculo } from '@/lib/providers'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { getAuthEmail, salvarConsulta, registrarAuditoria, tenantComAssinaturaAtiva } from '@/lib/consulta-helper'
import { PRECO } from '@/lib/products'
import { salvarCacheDeResultado } from '@/lib/cache-placas'
import { buscarConsultaAnterior, buscarConsultaSalvaDoUsuario, textoIdade } from '@/lib/reaproveitar-consulta'
import { lerSaldo, debitarSaldo, mensagemSemSaldo, saldoAcabando } from '@/lib/saldo'

export async function POST(req: NextRequest) {
  try {
    // forcarAtualizacao: o usuario pediu explicitamente dado novo, pagando por isso
    // apenasSalva: modo LEITURA. Serve o relatorio ja gravado e, se nao houver
    // nenhum, devolve 404 em vez de gastar. Existe porque a guarda de custo tem
    // que viver aqui, na rota que gasta, e nao na tela que normalmente leva ate
    // ela: abrir relatorio pelo historico, por link ou pela URL na mao sao
    // portas que nao passam pelo aviso de duplicidade da tela de consulta.
    const { placa, chassi, forcarAtualizacao, apenasSalva } = await req.json()
    const input = (placa ?? chassi ?? '').trim()

    if (!input) {
      return NextResponse.json({ error: 'Placa ou chassi obrigatório' }, { status: 400 })
    }

    // Autenticação via cookie ficha-auth
    const email = await getAuthEmail()
    if (!email) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Verificar saldo com service role (ignora RLS)
    // as any: Supabase precisa de tipos gerados (supabase gen types) para inferência de select()
    const service = createServiceRoleClient() as any
    const { data: perfil } = await service
      .from('perfis')
      .select('saldo_veiculo, role, pode_placa, ativo, modulos_liberados, tenant_id')
      .eq('email', email)
      .maybeSingle()

    // Módulos contratados: o do usuário vale; sem ele, herda os da empresa.
    // Nada configurado em nenhum dos dois significa pacote completo.
    let modulos: string[] | null = Array.isArray(perfil?.modulos_liberados) && perfil.modulos_liberados.length > 0
      ? perfil.modulos_liberados
      : null

    if (!modulos && perfil?.tenant_id) {
      const { data: tenant } = await service
        .from('tenants')
        .select('modulos_liberados')
        .eq('id', perfil.tenant_id)
        .maybeSingle()
      if (Array.isArray(tenant?.modulos_liberados) && tenant.modulos_liberados.length > 0) {
        modulos = tenant.modulos_liberados
      }
    }

    const isAdmin = perfil?.role === 'super_admin' || email === process.env.ADMIN_EMAIL
    const isAssinante = !isAdmin && await tenantComAssinaturaAtiva(email)

    // O caixa é da EMPRESA, não de cada operador. Sem empresa, cai no perfil.
    const { saldo, precoTenant } = await lerSaldo(service, {
      email, tenantId: perfil?.tenant_id ?? null,
    })
    // Estimativa para barrar antes de gastar API. O débito usa o custo real.
    const custo = precoTenant ?? PRECO.placa

    if (!isAdmin && !isAssinante && !perfil?.pode_placa) {
      return NextResponse.json({ error: 'Sem permissão para consulta veicular.' }, { status: 403 })
    }

    if (!isAdmin && !isAssinante && saldo < custo) {
      return NextResponse.json(
        { error: mensagemSemSaldo(saldo, custo), recarregar: true, saldo },
        { status: 402 }
      )
    }

    // ── Reaproveitamento: a empresa já consultou este documento? ──
    // Evita pagar de novo quando outro operador da mesma associação já
    // consultou a mesma placa. Só vale quando o usuário NÃO pediu atualização.
    const doc = input.toUpperCase().replace(/[^A-Z0-9]/g, '')

    // ── Modo leitura: nunca gasta e nunca grava ──
    // Quem abre um relatorio existente nao esta pedindo consulta nova. Sem dado
    // salvo, a resposta e 404 com o custo, para a tela pedir confirmacao antes
    // de qualquer debito.
    if (apenasSalva && !forcarAtualizacao) {
      const salva = perfil?.tenant_id
        ? await buscarConsultaAnterior(perfil.tenant_id, doc, 'veiculo')
        : await buscarConsultaSalvaDoUsuario(service, email, doc, 'veiculo')

      if (!salva) {
        return NextResponse.json({
          error: 'Esta placa ainda não foi consultada.',
          naoConsultada: true,
          custo: isAdmin || isAssinante ? 0 : custo,
          assinante: isAdmin || isAssinante,
          // Empresa sem preço de tabela consome o CUSTO REAL da consulta, que
          // só se sabe depois de rodar os módulos. Sem esta flag a tela cravaria
          // o padrão do código e prometeria menos do que vai debitar.
          precoFechado: isAdmin || isAssinante || precoTenant != null,
        }, { status: 404 })
      }

      return NextResponse.json({
        success: true,
        ...salva.resultado,
        _somenteLeitura: true,
        _reaproveitada:  true,
        _consultadaEm:   salva.consultadaEm,
        _diasAtras:      salva.diasAtras,
        _envelhecida:    salva.envelhecida,
        _idadeTexto:     textoIdade(salva),
        _consultadaPor:  salva.consultadaPor,
      })
    }

    if (!forcarAtualizacao && perfil?.tenant_id) {
      const anterior = await buscarConsultaAnterior(perfil.tenant_id, doc, 'veiculo')
      if (anterior) {
        await service.from('consultas').insert({
          email,
          tenant_id:     perfil.tenant_id,
          tipo:          'veiculo',
          documento:     doc,
          descricao:     'reaproveitada',
          resultado:     anterior.resultado,
          custo:         0,
          reaproveitada: true,
          origem_id:     anterior.id,
        })
        registrarAuditoria({ email, acao: 'consulta_placa_reaproveitada', documento: doc, custo: 0 })

        return NextResponse.json({
          success: true,
          ...anterior.resultado,
          _reaproveitada:  true,
          _consultadaEm:   anterior.consultadaEm,
          _diasAtras:      anterior.diasAtras,
          _envelhecida:    anterior.envelhecida,
          _idadeTexto:     textoIdade(anterior),
          _consultadaPor:  anterior.consultadaPor,
          _custoEvitado:   custo,
        })
      }
    }

    const resultado = await consultarVeiculo(
      placa  ? input : '',
      chassi ? input : undefined,
      modulos,
      // Cada empresa pode ter fornecedor proprio, definido no cadastro dela.
      perfil?.tenant_id ?? null,
    )

    // Debitar somente após retorno da API (evita perda de saldo em falha externa).
    // Empresa sem preço de tabela consome o CUSTO REAL da consulta, calculado
    // pelos módulos que rodaram e pelo fornecedor de leilão que respondeu.
    // Sem isso o sistema cobraria o padrão do código e daria prejuízo em toda
    // consulta, porque o custo real é maior que esse padrão.
    const custoReal = Number((resultado as any)._custoTotal) || custo
    const aDebitar  = precoTenant ?? custoReal

    let restante = saldo
    if (!isAdmin && !isAssinante) {
      const d = await debitarSaldo(service, { email, tenantId: perfil?.tenant_id ?? null, valor: aDebitar })
      restante = d.restante
    }

    // Extrair descrição do veículo para o histórico
    const pDesc = resultado.placa?.resposta?.descricao ?? resultado.placa?.resposta ?? {}
    const marca = pDesc.marcaModelo ?? pDesc.marca ?? ''
    const descricao = marca || input

    const saved = await salvarConsulta({
      email,
      tipo:      'veiculo',
      documento: doc,
      descricao,
      resultado,
    })

    // Marca a empresa e o custo real. Sem isso a próxima consulta da mesma
    // placa não encontra esta e paga a API de novo.
    if (saved?.id) {
      await service
        .from('consultas')
        .update({
          tenant_id: perfil?.tenant_id ?? null,
          custo:     isAdmin ? 0 : (resultado as any)._custoTotal ?? custo,
        })
        .eq('id', saved.id)
    }

    // Fire-and-forget: cache e audit log não bloqueiam a resposta
    if (placa) salvarCacheDeResultado(input.toUpperCase(), resultado)
    registrarAuditoria({ email, acao: 'consulta_placa', documento: input.toUpperCase(), custo: isAdmin ? 0 : custo })

    return NextResponse.json({
      success: true,
      token: saved?.token ?? null,
      ...resultado,
      _debitado:       isAdmin || isAssinante ? 0 : aDebitar,
      _saldoRestante:  restante,
      // Avisa antes de travar no meio de um atendimento.
      _saldoAcabando:  !isAdmin && !isAssinante && saldoAcabando(restante, aDebitar),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
