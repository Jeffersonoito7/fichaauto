import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

function service() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

async function getEmailFromCookie(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('ficha-auth')?.value
    if (!token) return null
    const payload = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'))
    return payload.email ?? null
  } catch { return null }
}

export async function GET() {
  const email = await getEmailFromCookie()
  if (!email) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })

  const db = service()

  const { data: perfil } = await db
    .from('perfis')
    .select('tenant_id, tenant_role')
    .eq('email', email)
    .maybeSingle()

  if (!perfil?.tenant_id || perfil.tenant_role !== 'admin') {
    return NextResponse.json({ erro: 'Sem acesso ao painel de revenda' }, { status: 403 })
  }

  const tenantId = perfil.tenant_id

  const { data: tenant } = await db
    .from('tenants')
    .select('*')
    .eq('id', tenantId)
    .single()

  if (!tenant) return NextResponse.json({ erro: 'Tenant não encontrado' }, { status: 404 })

  const { count: totalUsuarios } = await db
    .from('perfis')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)

  const inicioMes = new Date()
  inicioMes.setDate(1)
  inicioMes.setHours(0, 0, 0, 0)

  const { count: consultasMes } = await db
    .from('consultas')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('created_at', inicioMes.toISOString())

  const { count: totalConsultas } = await db
    .from('consultas')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)

  // Gasto total do mes
  const { data: gastoData } = await db
    .from('consultas')
    .select('custo')
    .eq('tenant_id', tenantId)
    .gte('created_at', inicioMes.toISOString())

  const gastoMes = (gastoData ?? []).reduce((acc, r) => acc + parseFloat(r.custo ?? '0'), 0)

  return NextResponse.json({
    tenant,
    stats: {
      totalUsuarios:  totalUsuarios  ?? 0,
      consultasMes:   consultasMes   ?? 0,
      totalConsultas: totalConsultas ?? 0,
      gastoMes:       parseFloat(gastoMes.toFixed(2)),
    }
  })
}
