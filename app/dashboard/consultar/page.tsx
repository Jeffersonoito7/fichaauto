'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Car, Hash, User, Building2, Loader2, History, Zap } from 'lucide-react'

const recentesVeiculo = [
  { valor: 'PKG5A23', descricao: 'Honda Civic Sport · 2016/2017' },
  { valor: 'ABC1D23', descricao: 'Toyota Corolla · 2020/2021' },
]

type Aba = 'veiculo' | 'cpf' | 'cnpj'

function formatPlaca(v: string)  { return v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7) }
function formatCpf(v: string)    { return v.replace(/\D/g, '').slice(0, 11) }
function formatCnpj(v: string)   { return v.replace(/\D/g, '').slice(0, 14) }

function maskCpf(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0,3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`
}

function maskCnpj(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 14)
  if (d.length <= 2) return d
  if (d.length <= 5) return `${d.slice(0,2)}.${d.slice(2)}`
  if (d.length <= 8) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5)}`
  if (d.length <= 12) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8)}`
  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`
}

export default function ConsultarPage() {
  const router  = useRouter()
  const [aba, setAba]         = useState<Aba>('veiculo')
  const [subTipo, setSubTipo] = useState<'placa' | 'chassi'>('placa')
  const [valor, setValor]     = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(v: string) {
    if (aba === 'veiculo')  setValor(subTipo === 'placa' ? formatPlaca(v) : v.toUpperCase().slice(0, 17))
    if (aba === 'cpf')      setValor(formatCpf(v))
    if (aba === 'cnpj')     setValor(formatCnpj(v))
  }

  function isValido() {
    if (aba === 'veiculo') return subTipo === 'placa' ? valor.length === 7 : valor.length === 17
    if (aba === 'cpf')     return valor.length === 11
    if (aba === 'cnpj')    return valor.length === 14
    return false
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValido()) return
    setLoading(true)
    if (aba === 'veiculo') router.push(`/dashboard/relatorio/${valor}`)
    if (aba === 'cpf')     router.push(`/dashboard/relatorio/cpf/${valor}`)
    if (aba === 'cnpj')    router.push(`/dashboard/relatorio/cnpj/${valor}`)
  }

  function displayValor() {
    if (aba === 'cpf')  return maskCpf(valor)
    if (aba === 'cnpj') return maskCnpj(valor)
    return valor
  }

  const abas = [
    { id: 'veiculo' as Aba, icon: Car,       label: 'Veículo'    },
    { id: 'cpf'    as Aba, icon: User,      label: 'CPF'        },
    { id: 'cnpj'   as Aba, icon: Building2, label: 'CNPJ'       },
  ]

  const inclusos: Record<Aba, string[]> = {
    veiculo: [
      'Identificação completa',
      'Restrições DETRAN',
      'RENAJUD (bloqueio judicial)',
      'Histórico de Roubo/Furto',
      'Gravame / Alienação',
      'Histórico de Leilão (3 bases)',
      'Indício de Sinistro',
      'Tabela FIPE + histórico',
      'Decodificador de Chassi',
      'Score de Risco',
      'Relatório em PDF',
    ],
    cpf: [
      'Dados cadastrais completos',
      'Score de crédito',
      'Processos judiciais (federal, estadual, trabalhista)',
      'Protestos em cartório',
      'Histórico de endereços',
      'Telefones vinculados',
      'Renda presumida',
      'PEP (Pessoa Politicamente Exposta)',
      'Participação societária',
      'Relacionamentos e vínculos',
      'Relatório em PDF',
    ],
    cnpj: [
      'Dados cadastrais (Receita Federal)',
      'Situação cadastral atualizada',
      'Quadro Societário (QSA)',
      'Score de crédito empresarial',
      'Processos judiciais PJ',
      'Protestos em cartório PJ',
      'Empresas relacionadas',
      'Relatório em PDF',
    ],
  }

  const placeholders: Record<Aba, string> = {
    veiculo: subTipo === 'placa' ? 'ABC1D23 ou ABC1234' : 'Ex: 93HFC2630HZ104454',
    cpf:     '000.000.000-00',
    cnpj:    '00.000.000/0001-00',
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-brand-dark mb-1">Nova Consulta</h1>
        <p className="text-brand-gray text-sm">Consulte veículo, CPF ou CNPJ com um único clique</p>
      </div>

      <div className="card p-8 mb-6">
        {/* Abas principais */}
        <div className="flex gap-2 p-1 bg-brand-gray-light rounded-xl mb-6">
          {abas.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => { setAba(id); setValor('') }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                aba === id ? 'bg-white text-brand-blue shadow-card' : 'text-brand-gray hover:text-brand-dark'
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {/* Sub-abas veículo */}
        {aba === 'veiculo' && (
          <div className="flex gap-2 mb-5">
            {(['placa', 'chassi'] as const).map(t => (
              <button
                key={t}
                onClick={() => { setSubTipo(t); setValor('') }}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  subTipo === t
                    ? 'border-brand-green bg-brand-green-light text-brand-green'
                    : 'border-brand-border text-brand-gray hover:border-brand-green/40'
                }`}
              >
                {t === 'placa' ? <Car className="w-3.5 h-3.5" /> : <Hash className="w-3.5 h-3.5" />}
                {t === 'placa' ? 'Por Placa' : 'Por Chassi'}
              </button>
            ))}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-brand-dark mb-2">
              {aba === 'veiculo' && (subTipo === 'placa' ? 'Placa do veículo' : 'Número do chassi')}
              {aba === 'cpf'  && 'CPF da pessoa física'}
              {aba === 'cnpj' && 'CNPJ da empresa'}
            </label>
            <input
              type="text"
              value={displayValor()}
              onChange={e => handleChange(e.target.value)}
              placeholder={placeholders[aba]}
              className="input-base text-xl font-mono tracking-widest text-center h-14"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !isValido()}
            className="btn-primary w-full h-12 text-base"
          >
            {loading
              ? <><Loader2 className="w-5 h-5 animate-spin" /> Consultando...</>
              : <><Search className="w-5 h-5" /> Consultar agora</>
            }
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between text-xs text-brand-gray">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-brand-green" />
            Resposta em menos de 5 segundos
          </div>
          <span className="font-medium text-brand-dark">1 consulta será debitada</span>
        </div>
      </div>

      {/* O que está incluído */}
      <div className="card p-6 mb-6">
        <h3 className="text-sm font-semibold text-brand-dark mb-4">O que está incluído</h3>
        <div className="grid grid-cols-2 gap-2">
          {inclusos[aba].map(item => (
            <p key={item} className="text-xs text-brand-dark flex items-start gap-1.5">
              <span className="text-brand-green font-bold mt-0.5">✓</span>
              {item}
            </p>
          ))}
        </div>
      </div>

      {/* Recentes (só veículo por enquanto) */}
      {aba === 'veiculo' && recentesVeiculo.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <History className="w-4 h-4 text-brand-gray" />
            <h3 className="text-sm font-semibold text-brand-dark">Consultas recentes</h3>
          </div>
          <div className="space-y-2">
            {recentesVeiculo.map(r => (
              <button
                key={r.valor}
                onClick={() => router.push(`/dashboard/relatorio/${r.valor}`)}
                className="w-full card card-hover p-4 flex items-center gap-3 text-left"
              >
                <div className="w-10 h-10 bg-brand-blue-light rounded-xl flex items-center justify-center shrink-0">
                  <Car className="w-5 h-5 text-brand-blue" />
                </div>
                <div>
                  <p className="font-mono font-bold text-brand-dark text-sm">{r.valor}</p>
                  <p className="text-xs text-brand-gray">{r.descricao}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
