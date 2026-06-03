import { ModuloId } from './providers/assertiva'

export interface Plano {
  id:        string
  nome:      string
  descricao: string
  cor:       string
  icone:     string
  preco:     string           // referência de preço para o cliente
  modelos:   string[]         // modelos de negócio sugeridos
  modulos:   ModuloId[]       // módulos habilitados por padrão
}

export const PLANOS: Plano[] = [
  {
    id:        'veicular',
    nome:      'Ficha Veicular',
    descricao: 'Consulta completa do histórico do veículo por placa.',
    cor:       '#00A651',
    icone:     'Car',
    preco:     'A partir de R$ 35,99 / consulta',
    modelos:   ['Crédito por consulta', 'Mensalidade com pacote de créditos', 'White-label para revendas'],
    modulos:   [
      'placa',
      'binFederal',
      'sinistro',
      'gravame',
      'leilao',
      'chassi',
    ],
  },
  {
    id:        'pessoa',
    nome:      'Ficha Pessoa (CPF)',
    descricao: 'Background check completo de pessoa física por CPF.',
    cor:       '#2563EB',
    icone:     'User',
    preco:     'A partir de R$ 29,90 / consulta',
    modelos:   ['Mensalidade por volume', 'Crédito por consulta', 'API para integração'],
    modulos:   [
      'cpfBasico',
      'cpfScore',
      'cpfProcessos',
      'cpfProtestos',
      'cpfEnderecos',
      'cpfTelefones',
      'cpfRenda',
      'cpfPep',
      'cpfSocietario',
      'cpfRelacionamentos',
    ],
  },
  {
    id:        'empresa',
    nome:      'Ficha Empresa (CNPJ)',
    descricao: 'Due diligence completa de pessoa jurídica por CNPJ.',
    cor:       '#7C3AED',
    icone:     'Building2',
    preco:     'A partir de R$ 39,90 / consulta',
    modelos:   ['Mensalidade por volume', 'Crédito por consulta', 'API para integração'],
    modulos:   [
      'cnpjBasico',
      'cnpjQsa',
      'cnpjScore',
      'cnpjProcessos',
      'cnpjProtestos',
      'cnpjRelacionadas',
    ],
  },
  {
    id:        'protecao',
    nome:      'Ficha Proteção (Completo)',
    descricao: 'Anti-fraude completo para associações de proteção veicular: veículo + pessoa + empresa.',
    cor:       '#DC2626',
    icone:     'Shield',
    preco:     'SaaS — a partir de R$ 990 / mês',
    modelos:   ['SaaS mensal com cota de consultas', 'Plano enterprise por volume'],
    modulos:   [
      // Veículos
      'placa',
      'binFederal',
      'sinistro',
      'gravame',
      'leilao',
      'chassi',
      'historicoVeiculosCpf',
      // CPF
      'cpfBasico',
      'cpfScore',
      'cpfProcessos',
      'cpfProtestos',
      'cpfEnderecos',
      'cpfTelefones',
      'cpfRenda',
      'cpfPep',
      'cpfSocietario',
      'cpfRelacionamentos',
      // CNPJ
      'cnpjBasico',
      'cnpjQsa',
      'cnpjScore',
      'cnpjProcessos',
      'cnpjProtestos',
      'cnpjRelacionadas',
    ],
  },
]

export function getPlano(id: string) {
  return PLANOS.find(p => p.id === id) ?? null
}
