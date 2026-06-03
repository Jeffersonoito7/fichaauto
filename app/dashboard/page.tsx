'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Car, FileText, BarChart2, History, Loader2,
  Search, ChevronRight, CheckCircle2, XCircle, AlertTriangle
} from 'lucide-react'

const ultimas = [
  { placa: 'PKG5A23', modelo: 'Honda Civic Sport CVT', ano: '2016/2017', tipo: 'Completa', status: 'ok' },
  { placa: 'ABC1D23', modelo: 'Toyota Corolla XEI', ano: '2020/2021', tipo: 'Completa', status: 'alert' },
  { placa: 'NZC0E14', modelo: 'Hyundai I30 2.0', ano: '2011/2012', tipo: 'Completa', status: 'ok' },
]

const atalhos = [
  { label: 'Meus Veículos',    href: '/dashboard/historico',     icon: Car },
  { label: 'Histórico FIPE',   href: '/dashboard/historico',     icon: BarChart2 },
  { label: 'Ficha Técnica',    href: '/dashboard/historico',     icon: FileText },
  { label: 'Consultas',        href: '/dashboard/historico',     icon: History },
]

function StatusBadge({ status }: { status: string }) {
  if (status === 'ok')    return <span className="text-xs font-semibold text-brand-green bg-brand-green-light px-2 py-0.5 rounded-full">REALIZADA</span>
  if (status === 'alert') return <span className="text-xs font-semibold text-brand-danger bg-red-50 px-2 py-0.5 rounded-full">PENDÊNCIA</span>
  return <span className="text-xs font-semibold text-brand-warning bg-yellow-50 px-2 py-0.5 rounded-full">ATENÇÃO</span>
}

export default function DashboardHome() {
  const router  = useRouter()
  const [placa, setPlaca]     = useState('')
  const [loading, setLoading] = useState(false)

  function formatPlaca(v: string) {
    return v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7)
  }

  async function handleConsultar(e: React.FormEvent) {
    e.preventDefault()
    if (placa.length < 7) return
    setLoading(true)
    router.push(`/dashboard/relatorio/${placa}`)
  }

  return (
    <div className="max-w-5xl mx-auto">

      {/* Saudação */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-dark">Olá, Jefferson!</h1>
        <p className="text-brand-gray text-sm">Bem-vindo(a) novamente</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">

        {/* Coluna principal */}
        <div className="lg:col-span-2 space-y-5">

          {/* Card consultar */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-brand-dark text-lg">Consultar veículo</h2>
              <Link href="/dashboard/historico" className="text-xs text-brand-green font-medium flex items-center gap-1 hover:underline">
                Tipos de consultas <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <form onSubmit={handleConsultar} className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-brand-gray mb-1.5">Tipo da consulta</label>
                  <select className="input-base text-sm bg-white">
                    <option>Consulta completa — R$ 35,99</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-brand-gray mb-1.5">Placa do veículo</label>
                  <input
                    type="text"
                    value={placa}
                    onChange={e => setPlaca(formatPlaca(e.target.value))}
                    placeholder="XXX-XXXX"
                    className="input-base font-mono tracking-widest text-center text-sm"
                    maxLength={7}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || placa.length < 7}
                className="w-full flex items-center justify-center gap-2 py-3 bg-brand-green hover:bg-brand-green-dark disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Consultando...</>
                  : <><Search className="w-4 h-4" /> Continuar</>
                }
              </button>
            </form>

            {/* Atalhos */}
            <div className="grid grid-cols-4 gap-3 mt-5 pt-5 border-t border-brand-border">
              {atalhos.map(a => (
                <Link key={a.label} href={a.href}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-brand-gray-light transition-colors text-center"
                >
                  <div className="w-10 h-10 rounded-xl bg-brand-green-light flex items-center justify-center">
                    <a.icon className="w-5 h-5 text-brand-green" />
                  </div>
                  <span className="text-xs text-brand-dark font-medium leading-tight">{a.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Últimas consultas */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-brand-dark">Últimas consultas</h2>
              <Link href="/dashboard/historico" className="text-xs text-brand-green font-medium flex items-center gap-1 hover:underline">
                Listar todos <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {ultimas.map(c => (
                <button
                  key={c.placa}
                  onClick={() => router.push(`/dashboard/relatorio/${c.placa}`)}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-brand-gray-light transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-green-light flex items-center justify-center shrink-0">
                      <Car className="w-5 h-5 text-brand-green" />
                    </div>
                    <div>
                      <p className="text-xs text-brand-gray">Hoje às 16h20</p>
                      <p className="font-mono font-bold text-brand-dark text-sm">{c.placa}</p>
                      <p className="text-xs text-brand-gray">{c.modelo} {c.ano}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs text-brand-gray">Tipo <strong>{c.tipo}</strong></span>
                    <StatusBadge status={c.status} />
                  </div>
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Coluna lateral */}
        <div className="space-y-5">

          {/* Saldo */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-brand-gray">Saldo em conta</p>
              <Link href="/dashboard/carteira" className="text-xs text-brand-green font-medium hover:underline">
                Minha carteira
              </Link>
            </div>
            <p className="text-3xl font-extrabold text-brand-dark">R$ 11,20</p>
            <div className="mt-3 pt-3 border-t border-brand-border">
              <p className="text-xs text-brand-gray mb-2">Consultas disponíveis</p>
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold text-brand-green">7</span>
                <Link href="/dashboard/carteira"
                  className="text-xs font-semibold text-white bg-brand-green hover:bg-brand-green-dark px-3 py-1.5 rounded-lg transition-colors">
                  Recarregar
                </Link>
              </div>
            </div>
          </div>

          {/* Banner */}
          <div className="rounded-2xl overflow-hidden"
               style={{ background: 'linear-gradient(135deg, #007A3D 0%, #00A651 100%)' }}>
            <div className="p-5">
              <p className="text-white font-bold text-sm mb-1">Ficha Auto</p>
              <p className="text-white/80 text-xs mb-3">
                Consulte o histórico completo antes de fechar negócio.
              </p>
              <Link href="/dashboard/consultar"
                className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white text-brand-green px-3 py-1.5 rounded-lg hover:bg-brand-green-light transition-colors">
                <Search className="w-3.5 h-3.5" /> Nova consulta
              </Link>
            </div>
          </div>

          {/* O que inclui */}
          <div className="card p-5">
            <p className="text-xs font-semibold text-brand-dark mb-3">Consulta inclui</p>
            <div className="space-y-2">
              {[
                'Identificação completa',
                'Restrições e débitos',
                'Roubo e furto',
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
