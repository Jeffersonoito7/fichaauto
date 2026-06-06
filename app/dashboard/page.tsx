'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Car, FileText, History, Loader2,
  Search, ChevronRight, CheckCircle2, User, Building2
} from 'lucide-react'

interface Consulta {
  id: string; tipo: string; documento: string
  descricao: string; data: string; status: string
}

function fmtData(iso: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function formatPlaca(v: string) {
  return v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7)
}

export default function DashboardHome() {
  const router = useRouter()
  const [placa, setPlaca]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [nomeUsuario, setNome]    = useState('')
  const [saldo, setSaldo]         = useState<number | null>(null)
  const [recentes, setRecentes]   = useState<Consulta[]>([])

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        if (d?.nome) setNome(d.nome.split(' ')[0])
        if (d?.saldo !== undefined) setSaldo(d.saldo)
      })
      .catch(() => {})

    fetch('/api/historico')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setRecentes(d.slice(0, 3)) })
      .catch(() => {})
  }, [])

  async function handleConsultar(e: React.FormEvent) {
    e.preventDefault()
    if (placa.length < 7) return
    setLoading(true)
    router.push(`/dashboard/relatorio/${placa}`)
  }

  function abrirRelatorio(c: Consulta) {
    if (c.tipo === 'cpf')  { router.push(`/dashboard/relatorio/cpf/${c.documento.replace(/\D/g, '')}`);  return }
    if (c.tipo === 'cnpj') { router.push(`/dashboard/relatorio/cnpj/${c.documento.replace(/\D/g, '')}`); return }
    router.push(`/dashboard/relatorio/${c.documento}`)
  }

  const TIPO_ICON: Record<string, React.ElementType> = { veiculo: Car, cpf: User, cnpj: Building2 }

  return (
    <div className="max-w-5xl mx-auto">

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-dark">
          {nomeUsuario ? `Olá, ${nomeUsuario}!` : 'Bem-vindo!'}
        </h1>
        <p className="text-brand-gray text-sm">O que você vai consultar hoje?</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">

        <div className="lg:col-span-2 space-y-5">

          {/* Consultar */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-brand-dark text-lg">Consulta rápida de placa</h2>
              <Link href="/dashboard/consultar" className="text-xs text-brand-green font-medium flex items-center gap-1 hover:underline">
                Consultar CPF / CNPJ <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <form onSubmit={handleConsultar} className="flex gap-3">
              <input
                type="text"
                value={placa}
                onChange={e => setPlaca(formatPlaca(e.target.value))}
                placeholder="ABC1D23"
                className="input-base flex-1 font-mono tracking-widest text-center text-lg"
                maxLength={7}
                required
              />
              <button
                type="submit"
                disabled={loading || placa.length < 7}
                className="flex items-center gap-2 px-5 py-2.5 bg-brand-green hover:opacity-90 disabled:opacity-40 text-white font-semibold rounded-xl transition-all"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Consultar
              </button>
            </form>

            <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-brand-border">
              {[
                { label: 'Nova consulta', href: '/dashboard/consultar',  icon: Search  },
                { label: 'Histórico',     href: '/dashboard/historico',  icon: History },
                { label: 'Relatórios',    href: '/dashboard/historico',  icon: FileText},
              ].map(a => (
                <Link key={a.label} href={a.href}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-brand-gray-light transition-colors text-center">
                  <div className="w-10 h-10 rounded-xl bg-brand-green-light flex items-center justify-center">
                    <a.icon className="w-5 h-5 text-brand-green" />
                  </div>
                  <span className="text-xs text-brand-dark font-medium">{a.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Últimas consultas */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-brand-dark">Últimas consultas</h2>
              <Link href="/dashboard/historico" className="text-xs text-brand-green font-medium flex items-center gap-1 hover:underline">
                Ver todas <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentes.length === 0 ? (
              <div className="text-center py-8">
                <History className="w-8 h-8 text-brand-gray/30 mx-auto mb-2" />
                <p className="text-sm text-brand-gray">Nenhuma consulta realizada ainda.</p>
                <Link href="/dashboard/consultar" className="text-xs text-brand-green font-semibold mt-2 inline-block hover:underline">
                  Fazer primeira consulta
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {recentes.map(c => {
                  const Icon = TIPO_ICON[c.tipo] ?? Car
                  return (
                    <button
                      key={c.id}
                      onClick={() => abrirRelatorio(c)}
                      className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-brand-gray-light transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-green-light flex items-center justify-center shrink-0">
                          <Icon className="w-5 h-5 text-brand-green" />
                        </div>
                        <div>
                          <p className="font-mono font-bold text-brand-dark text-sm">{c.documento}</p>
                          {c.descricao && <p className="text-xs text-brand-gray truncate max-w-[200px]">{c.descricao}</p>}
                          <p className="text-xs text-brand-gray">{fmtData(c.data)}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-brand-gray shrink-0" />
                    </button>
                  )
                })}
              </div>
            )}
          </div>

        </div>

        {/* Lateral */}
        <div className="space-y-5">

          {/* Saldo */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-brand-gray">Consultas disponíveis</p>
              <Link href="/dashboard/carteira" className="text-xs text-brand-green font-medium hover:underline">
                Recarregar
              </Link>
            </div>
            <p className="text-4xl font-extrabold text-brand-green">
              {saldo === null ? '—' : saldo}
            </p>
            <p className="text-xs text-brand-gray mt-1">créditos</p>
          </div>

          {/* O que inclui */}
          <div className="card p-5">
            <p className="text-xs font-semibold text-brand-dark mb-3">Consulta de placa inclui</p>
            <div className="space-y-2">
              {[
                'Identificação completa',
                'Restrições e débitos',
                'Roubo / Furto',
                'Histórico de leilão',
                'Indício de sinistro',
                'Gravame / Alienação',
                'Tabela FIPE',
                'Relatório em PDF',
              ].map(item => (
                <div key={item} className="flex items-center gap-2 text-xs text-brand-dark">
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-green shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
