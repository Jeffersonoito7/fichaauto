import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

export async function POST(req: NextRequest) {
  try {
    const { nome, email, whatsapp, razao_social, cnpj, nome_fantasia, tipo_uso } = await req.json()

    if (!nome || !email || !razao_social) {
      return NextResponse.json({ erro: 'Nome, e-mail e razao social sao obrigatorios.' }, { status: 400 })
    }

    const db = createServiceRoleClient() as any
    const emailNorm = email.toLowerCase().trim()

    // Verificar se email ja existe
    const { data: existente } = await db
      .from('perfis')
      .select('email')
      .eq('email', emailNorm)
      .maybeSingle()

    if (existente) {
      return NextResponse.json({ erro: 'Este e-mail ja esta cadastrado.' }, { status: 409 })
    }

    // Gerar slug unico para o tenant
    const baseSlug = slugify(nome_fantasia || razao_social)
    let slug = baseSlug
    let tentativa = 0
    while (true) {
      const { data: slugExiste } = await db
        .from('tenants')
        .select('slug')
        .eq('slug', slug)
        .maybeSingle()
      if (!slugExiste) break
      tentativa++
      slug = `${baseSlug}-${tentativa}`
    }

    // Criar tenant (inativo ate aprovacao)
    const { data: tenant, error: errTenant } = await db
      .from('tenants')
      .insert({
        slug,
        nome:          razao_social.trim(),
        nome_fantasia: nome_fantasia?.trim() || null,
        email_contato: emailNorm,
        telefone:      whatsapp?.trim() || null,
        ativo:         false,
        saldo_veiculo: 0,
        saldo_cpf:     0,
      })
      .select()
      .single()

    if (errTenant) {
      return NextResponse.json({ erro: 'Erro ao criar empresa.' }, { status: 500 })
    }

    // Criar perfil do admin da empresa
    const { error: errPerfil } = await db
      .from('perfis')
      .insert({
        nome:        nome.trim(),
        email:       emailNorm,
        cpf_cnpj:    cnpj?.replace(/\D/g, '') || null,
        tenant_id:   tenant.id,
        tenant_role: 'admin',
        ativo:       false,
        pode_placa:  false,
        pode_cpf:    false,
        saldo_veiculo: 0,
        saldo_cpf:   0,
        obs_admin:   `Empresa: ${razao_social} | WhatsApp: ${whatsapp || 'nao informado'} | Uso: ${tipo_uso || 'nao informado'} | Aguardando ativacao`,
      })

    if (errPerfil) {
      // Rollback: apagar tenant criado
      await db.from('tenants').delete().eq('id', tenant.id)
      return NextResponse.json({ erro: 'Erro ao criar usuario.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, slug })
  } catch (e: any) {
    return NextResponse.json({ erro: 'Erro interno.' }, { status: 500 })
  }
}
