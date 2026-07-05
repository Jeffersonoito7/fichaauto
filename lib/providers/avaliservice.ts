// AvaliService — Consulta veicular completa
// Docs: https://avaliservice.com.br
// Configurar AVALISERVICE_API_KEY no Vercel quando fechar contrato

const BASE_URL = process.env.AVALISERVICE_BASE_URL ?? 'https://api.avaliservice.com.br'
const API_KEY  = process.env.AVALISERVICE_API_KEY  ?? ''

function headers() {
  return {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  }
}

// Consulta completa por placa — retorna todos os dados do veículo
export async function consultarPorPlaca(placa: string) {
  if (!API_KEY) return mockVeiculo(placa)  // retorna mock em dev

  const res = await fetch(`${BASE_URL}/veiculo/placa/${placa}`, {
    headers: headers(),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`AvaliService erro ${res.status}`)
  return res.json()
}

// Consulta por chassi
export async function consultarPorChassi(chassi: string) {
  if (!API_KEY) return mockVeiculo(chassi)

  const res = await fetch(`${BASE_URL}/veiculo/chassi/${chassi}`, {
    headers: headers(),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`AvaliService erro ${res.status}`)
  return res.json()
}

// Score de risco calculado pelo provider
export async function getScoreRisco(placa: string) {
  if (!API_KEY) return { score: 72, nivel: 'medio', detalhes: [] }

  const res = await fetch(`${BASE_URL}/veiculo/score/${placa}`, {
    headers: headers(),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`AvaliService erro ${res.status}`)
  return res.json()
}

// Mock para desenvolvimento (sem API_KEY)
function mockVeiculo(identificador: string) {
  return {
    _mock: true,
    placa: identificador.toUpperCase(),
    marcaModelo: 'HONDA/CIVIC SPORT CVT',
    ano: '2016/2017',
    cor: 'PRATA',
    renavam: '01106508014',
    chassi: '93HFC2630HZ104454',
    motor: 'R20Z57303191',
    municipio: 'PETROLINA/PE',
    situacao: 'EM CIRCULAÇÃO',
    restricoes: {
      renajud: true,
      alienacao: true,
      rouboFurto: false,
      leilao: false,
      sinistro: false,
    },
    score: 72,
    fipe: { valor: 98993.00, codigo: '014092-9' },
  }
}
