'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  History, Search, Car, User, Building2,
  Loader2, ChevronRight, AlertCircle
} from 'lucide-react'

interface Consulta {
  id: string
  tipo: 'veiculo' | 'cpf' | 'cnpj'
  documento: string
  descricao: string
  data: string
  status: string
  plano: string
}

const TIPO_CONFIG = {
  veiculo: { icon: Car,       label: 'Veículo',  cor: 'bg-brand-green-light text-brand-green' },
  cpf:     { icon: User,      label: 'CPF',      cor: 'bg-blue-50 text-blue-600'              },
  cnpj:    { icon: Building2, label: 'CNPJ',     cor: 'bg-purple-50 text-purple-600'          },
}

function fmtData(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function HistoricoPage() {
  const router = useRouter()
  const [consultas, setConsultas] = useState<Consulta[]>([])
  const [loading, setLoading]     = useState(true)
  const [busca, setBusca]         = useState('')

  useEffect(() => {
    fetch('/api/historico')
      .then(r => r.json())
      .then(d => { setConsultas(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  function abrirRelatorio(c: Consulta) {
    if (c.tipo === 'cpf')   { router.push(`/dashboard/relatorio/cpf/${c.documento.replace(/\D/g, '')}`);  return }
    if (c.tipo === 'cnpj')  { router.push(`/dashboard/relatorio/cnpj/${c.documento.replace(/\D/g, '')}`); return }
    router.push(`/dashboard/relatorio/${c.documento}`)
  }

  const filtradas = consultas.filter(c =>
    !busca || (c.documento + c.descricao).toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-dark">Histórico de Consultas</h1>
        <p className="text-brand-gray text-sm mt-1">Todas as suas consultas realizadas</p>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-gray" />
        <input
          className="input-base pl-9"
          placeholder="Buscar por placa, CPF ou CNPJ..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-brand-green" />
        </div>
      ) : filtradas.length === 0 ? (
        <div className="card p-12 text-center">
          <History className="w-10 h-10 text-brand-gray/30 mx-auto mb-3" />
          <p className="text-brand-gray font-medium">
            {busca ? 'Nenhuma consulta encontrada' : 'Nenhuma consulta realizada ainda'}
          </p>
          {!busca && (
            <button
              onClick={() => router.push('/dashboard/consultar')}
              className="btn-primary mt-4 px-6 py-2.5 text-sm inline-flex items-center gap-2"
            >
              <Search className="w-4 h-4" /> Fazer primeira consulta
            </button>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-brand-gray-light border-b border-brand-border">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-brand-gray uppercase tracking-wider">Consulta</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-brand-gray uppercase tracking-wider hidden sm:table-cell">Tipo</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-brand-gray uppercase tracking-wider hidden md:table-cell">Data</th>
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {filtradas.map(c => {
                const cfg = TIPO_CONFIG[c.tipo] ?? TIPO_CONFIG.veiculo
                const Icon = cfg.icon
                return (
                  <tr
                    key={c.id}
                    className="hover:bg-brand-gray-light/50 transition-colors cursor-pointer"
                    onClick={() => abrirRelatorio(c)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.cor}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-brand-dark font-mono">{c.documento}</p>
                          {c.descricao && <p className="text-xs text-brand-gray truncate max-w-[180px]">{c.descricao}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center hidden sm:table-cell">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.cor}`}>{cfg.label}</span>
                    </td>
                    <td className="px-3 py-3 hidden md:table-cell">
                      <p className="text-xs text-brand-gray">{fmtData(c.data)}</p>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <ChevronRight className="w-4 h-4 text-brand-gray ml-auto" />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && consultas.length > 0 && (
        <p className="text-xs text-brand-gray text-center mt-4">
          {consultas.length} consulta(s) no total · últimas 50 exibidas
        </p>
      )}
    </div>
  )
}
