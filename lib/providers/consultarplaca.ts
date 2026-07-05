// ConsultarPlaca — Alternativa ao AvaliService
// Docs: https://docs.consultarplaca.com.br
// Configurar CONSULTARPLACA_API_KEY no Vercel quando fechar contrato

const BASE_URL = process.env.CONSULTARPLACA_BASE_URL ?? 'https://api.consultarplaca.com.br'
const API_KEY  = process.env.CONSULTARPLACA_API_KEY  ?? ''

function headers() {
  return {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  }
}

export async function consultarVeiculo(placa: string) {
  if (!API_KEY) return null  // fallback para AvaliService

  const res = await fetch(`${BASE_URL}/v1/veiculo/${placa}`, {
    headers: headers(),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`ConsultarPlaca erro ${res.status}`)
  return res.json()
}

export async function consultarHistoricoCompleto(placa: string) {
  if (!API_KEY) return null

  const res = await fetch(`${BASE_URL}/v1/historico/${placa}`, {
    headers: headers(),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`ConsultarPlaca erro ${res.status}`)
  return res.json()
}
