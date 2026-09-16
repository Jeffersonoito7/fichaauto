import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function GET(req: NextRequest) {
  const txid = req.nextUrl.searchParams.get('txid')
  if (!txid) return NextResponse.json({ erro: 'txid obrigatório' }, { status: 400 })

  const { data } = await svc()
    .from('transacoes_pix')
    .select('status, resultado_token')
    .eq('txid', txid)
    .eq('produto', 'avulsa')
    .maybeSingle()

  if (!data) return NextResponse.json({ erro: 'Transação não encontrada' }, { status: 404 })

  return NextResponse.json({
    status: data.status,
    token:  (data as any).resultado_token ?? null,
  })
}
