import { NextRequest, NextResponse } from 'next/server'
import { exigirAdmin } from '@/lib/admin-guard'

export async function GET() {
  const auth = await exigirAdmin()
  if (!auth.ok) return auth.resposta
  const placafipeAtivo = !!process.env.PLACAFIPE_TOKEN
  return NextResponse.json({ placafipeAtivo })
}

export async function POST(req: NextRequest) {
  const auth = await exigirAdmin()
  if (!auth.ok) return auth.resposta

  const { placafipeToken } = await req.json()
  if (!placafipeToken || typeof placafipeToken !== 'string') {
    return NextResponse.json({ error: 'Token invalido' }, { status: 400 })
  }

  // Em producao o token deve ser adicionado nas variaveis de ambiente do Vercel.
  // Esta rota retorna instrucoes claras para o admin.
  return NextResponse.json({
    ok: true,
    instrucao: 'Adicione PLACAFIPE_TOKEN nas variaveis de ambiente do Vercel (Settings > Environment Variables) e faca um redeploy.',
    token_preview: placafipeToken.slice(0, 6) + '...',
  })
}
