'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Car, Hash, Loader2, History, Zap } from 'lucide-react'

const recentes = [
  { placa: 'PKG5A23', modelo: 'Honda Civic Sport', ano: '2016/2017', score: 78 },
  { placa: 'ABC1D23', modelo: 'Toyota Corolla', ano: '2020/2021', score: 92 },
  { placa: 'XYZ9B87', modelo: 'Volkswagen Gol', ano: '2018/2018', score: 65 },
]

export default function ConsultarPage() {
  const router = useRouter()
  const [tipo, setTipo] = useState<'placa' | 'chassi'>('placa')
  const [valor, setValor] = useState('')
  const [loading, setLoading] = useState(false)

  function formatPlaca(v: string) {
    return v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!valor.trim()) return
    setLoading(true)
    await new Promise(r => setTimeout(r, 800))
    router.push(`/dashboard/relatorio/${valor.trim().toUpperCase()}`)
  }

  function scoreColor(s: number) {
    if (s >= 80) return 'text-brand-green'
    if (s >= 60) return 'text-brand-warning'
    return 'text-brand-danger'
  }

  function scoreBg(s: number) {
    if (s >= 80) return 'bg-brand-green-light'
    if (s >= 60) return 'bg-yellow-50'
    return 'bg-red-50'
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-brand-dark mb-1">Nova Consulta</h1>
        <p className="text-brand-gray text-sm">Digite a placa ou chassi do veículo para consultar</p>
      </div>

      {/* Card principal */}
      <div className="card p-8 mb-6">
        {/* Tipo */}
        <div className="flex gap-2 p-1 bg-brand-gray-light rounded-xl mb-6">
          <button
            onClick={() => setTipo('placa')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              tipo === 'placa' ? 'bg-white text-brand-blue shadow-card' : 'text-brand-gray hover:text-brand-dark'
            }`}
          >
            <Car className="w-4 h-4" /> Por Placa
          </button>
          <button
            onClick={() => setTipo('chassi')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              tipo === 'chassi' ? 'bg-white text-brand-blue shadow-card' : 'text-brand-gray hover:text-brand-dark'
            }`}
          >
            <Hash className="w-4 h-4" /> Por Chassi
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-brand-dark mb-2">
              {tipo === 'placa' ? 'Placa do veículo' : 'Número do chassi'}
            </label>
            <input
              type="text"
              value={valor}
              onChange={e => setValor(tipo === 'placa' ? formatPlaca(e.target.value) : e.target.value.toUpperCase())}
              placeholder={tipo === 'placa' ? 'ABC1D23 ou ABC1234' : 'Ex: 93HFC2630HZ104454'}
              className="input-base text-xl font-mono tracking-widest text-center h-14"
              maxLength={tipo === 'placa' ? 7 : 17}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || valor.length < (tipo === 'placa' ? 7 : 17)}
            className="btn-primary w-full h-12 text-base"
          >
            {loading
              ? <><Loader2 className="w-5 h-5 animate-spin" /> Consultando...</>
              : <><Search className="w-5 h-5" /> Consultar agora</>
            }
          </button>
        </form>

        {/* Info custo */}
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
        <h3 className="text-sm font-semibold text-brand-dark mb-4">O que está incluído na consulta</h3>
        <div className="grid grid-cols-2 gap-2">
          {[
            '✅ Identificação completa',
            '✅ Restrições DETRAN',
            '✅ RENAJUD (bloqueio judicial)',
            '✅ Histórico de Roubo/Furto',
            '✅ Gravame / Alienação',
            '✅ Histórico de Leilão (3 bases)',
            '✅ Indício de Sinistro',
            '✅ Tabela FIPE + histórico',
            '✅ Decodificador de Chassi',
            '✅ Score de Risco (0-100)',
            '✅ Relatório em PDF',
            '✅ Link compartilhável',
          ].map(item => (
            <p key={item} className="text-xs text-brand-dark">{item}</p>
          ))}
        </div>
      </div>

      {/* Consultas recentes */}
      {recentes.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <History className="w-4 h-4 text-brand-gray" />
            <h3 className="text-sm font-semibold text-brand-dark">Consultas recentes</h3>
          </div>
          <div className="space-y-2">
            {recentes.map(r => (
              <button
                key={r.placa}
                onClick={() => router.push(`/dashboard/relatorio/${r.placa}`)}
                className="w-full card card-hover p-4 flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-blue-light rounded-xl flex items-center justify-center">
                    <Car className="w-5 h-5 text-brand-blue" />
                  </div>
                  <div>
                    <p className="font-mono font-bold text-brand-dark text-sm">{r.placa}</p>
                    <p className="text-xs text-brand-gray">{r.modelo} · {r.ano}</p>
                  </div>
                </div>
                <div className={`${scoreBg(r.score)} px-3 py-1 rounded-full`}>
                  <span className={`text-sm font-bold ${scoreColor(r.score)}`}>{r.score}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
