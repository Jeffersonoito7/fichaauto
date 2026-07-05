import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const { nome, email, cpfCnpj, modulos_liberados } = await req.json()

    if (!nome || !email) {
      return NextResponse.json({ erro: 'Nome e e-mail são obrigatórios.' }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json({ erro: 'E-mail inválido.' }, { status: 400 })
    }

    if (nome.trim().length < 3) {
      return NextResponse.json({ erro: 'Nome deve ter pelo menos 3 caracteres.' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Verifica se já existe
    const { data: existente } = await (supabase as any)
      .from('perfis')
      .select('email')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle()

    if (existente) {
      return NextResponse.json({ erro: 'Este e-mail já está cadastrado.' }, { status: 409 })
    }

    // Salva solicitação na tabela de perfis (inativo até aprovação manual)
    const { error } = await (supabase as any)
      .from('perfis')
      .insert({
        nome:              nome.trim(),
        email:             email.toLowerCase().trim(),
        cpf_cnpj:          cpfCnpj ?? null,
        saldo_consultas:   0,
        ativo:             false,
        pode_placa:        false,
        pode_cpf:          false,
        pode_cnpj:         false,
        pode_lote:         false,
        modulos_liberados: Array.isArray(modulos_liberados) ? modulos_liberados : [],
        obs_admin:         `Aguardando aprovação — cadastro via site${modulos_liberados?.length ? ` — ${modulos_liberados.length} módulo(s) solicitado(s)` : ''}`,
      })

    if (error) {
      console.error('[cadastro]', error)
      return NextResponse.json({ erro: 'Erro ao salvar. Tente novamente.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[cadastro]', e)
    return NextResponse.json({ erro: 'Erro interno.' }, { status: 500 })
  }
}
