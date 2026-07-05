import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params
  if (!token || token.length < 10) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 400 })
  }

  try {
    const svc = createServiceRoleClient() as any
    const { data, error } = await svc
      .from('consultas')
      .select('id, tipo, documento, descricao, resultado, expires_at, created_at')
      .eq('token', token)
      .maybeSingle()

    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Link não encontrado' }, { status: 404 })

    const expirado = data.expires_at && new Date(data.expires_at) < new Date()
    if (expirado) return NextResponse.json({ error: 'Link expirado' }, { status: 410 })

    let resultado = data.resultado
    if (typeof resultado === 'string') {
      try { resultado = JSON.parse(resultado) } catch { resultado = null }
    }

    return NextResponse.json({
      tipo:       data.tipo,
      documento:  data.documento,
      descricao:  data.descricao,
      resultado,
      expires_at: data.expires_at,
      created_at: data.created_at,
    })
  } catch (e: any) {
    console.error('[/api/r/token]', e?.message ?? e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
