import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ txid: string }> }
) {
  const { txid } = await params

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data } = await supabase
    .from('transacoes_pix')
    .select('status, saldo_creditado, valor')
    .eq('txid', txid)
    .single()

  if (!data) return NextResponse.json({ status: 'nao_encontrado' })

  return NextResponse.json({
    status:         data.status,
    saldoCreditado: data.saldo_creditado,
    valor:          data.valor,
  })
}
