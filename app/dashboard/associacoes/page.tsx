'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Shield, Upload, Search, User, Building2, Car,
  CheckCircle, AlertTriangle, AlertCircle, ChevronRight, FileSpreadsheet,
} from 'lucide-react'

type Tab = 'cpf' | 'cnpj' | 'placa'

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

function maskPlaca(v: string) {
  const r = v.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 7)
  return r.length > 3 ? r.slice(0, 3) + '-' + r.slice(3) : r
}

const tabCfg = {
  cpf:  { label: 'CPF',    icon: User,      mask: maskCpf,   maxLen: 14, placeholder: '000.000.000-00' },
  cnpj: { label: 'CNPJ',   icon: Building2, mask: maskCnpj,  maxLen: 18, placeholder: '00.000.000/0000-00' },
  placa:{ label: 'Placa',  icon: Car,       mask: maskPlaca, maxLen: 8,  placeholder: 'ABC-1234' },
}

const alertas = [
  { icon: AlertCircle,   cor: 'text-red-600',    bg: 'bg-red-50',    label: 'Óbito detectado',             desc: 'CPF cancelado por falecimento' },
  { icon: AlertTriangle, cor: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Processos judiciais',         desc: 'Ações federais, estaduais ou trabalhistas' },
  { icon: AlertCircle,   cor: 'text-red-600',    bg: 'bg-red-50',    label: 'Roubo / Furto',               desc: 'Veículos com ocorrência policial' },
  { icon: AlertTriangle, cor: 'text-yellow-600', bg: 'bg-yellow-50', label: 'PEP — Risco político',        desc: 'Pessoa Politicamente Exposta' },
  { icon: AlertCircle,   cor: 'text-red-600',    bg: 'bg-red-50',    label: 'Score baixo / Protestos',     desc: 'Indicadores de inadimplência' },
  { icon: CheckCircle,   cor: 'text-green-600',  bg: 'bg-green-50',  label: 'Situação regular',            desc: 'CPF/CNPJ ativo e sem restrições' },
]

export default function AssociacoesPage() {
  const router = useRouter()
  const [tab, setTab]     = useState<Tab>('cpf')
  const [valor, setValor] = useState('')

  const cfg = tabCfg[tab]
  const isValid = valor.replace(/\D/g, '').length >= (tab === 'cnpj' ? 14 : tab === 'cpf' ? 11 : 7)

  function handleChange(v: string) { setValor(cfg.mask(v)) }

  function handleConsultar() {
    if (!isValid) return
    const doc = valor.replace(/\D/g, '')
    if (tab === 'placa') {
      router.push(`/dashboard/relatorio/${doc}`)
    } else {
      router.push(`/dashboard/relatorio/${tab}/${doc}`)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-brand-green-light flex items-center justify-center">
          <Shield className="w-5 h-5 text-brand-green" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-brand-dark">Ficha Associações</h1>
          <p className="text-brand-gray text-sm">Blindagem antifraude para sua base de associados</p>
        </div>
        <button
          onClick={() => router.push('/dashboard/associacoes/lote')}
          className="ml-auto flex items-center gap-2 btn-primary text-sm"
        >
          <FileSpreadsheet className="w-4 h-4" /> Consulta em lote
        </button>
      </div>

      {/* Consulta individual */}
      <div className="card p-6 mb-6">
        <h2 className="text-sm font-bold text-brand-dark mb-4 uppercase tracking-wide">Consulta Individual</h2>

        {/* Tabs */}
        <div className="flex gap-2 mb-5 p-1 bg-brand-off-white rounded-xl w-fit">
          {(Object.keys(tabCfg) as Tab[]).map(t => {
            const Icon = tabCfg[t].icon
            return (
              <button
                key={t}
                onClick={() => { setTab(t); setValor('') }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === t ? 'bg-white text-brand-green shadow-sm' : 'text-brand-gray hover:text-brand-dark'
                }`}
              >
                <Icon className="w-4 h-4" /> {tabCfg[t].label}
              </button>
            )
          })}
        </div>

        <div className="flex gap-3">
          <div className="flex-1 relative">
            <cfg.icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-gray" />
            <input
              type="text"
              value={valor}
              onChange={e => handleChange(e.target.value)}
              placeholder={cfg.placeholder}
              maxLength={cfg.maxLen}
              className="w-full pl-10 pr-4 py-3 border border-brand-border rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green"
              onKeyDown={e => e.key === 'Enter' && handleConsultar()}
            />
          </div>
          <button
            onClick={handleConsultar}
            disabled={!isValid}
            className="btn-primary flex items-center gap-2 px-6 disabled:opacity-40"
          >
            <Search className="w-4 h-4" /> Consultar
          </button>
        </div>
      </div>

      {/* O que detectamos */}
      <div className="card p-6 mb-6">
        <h2 className="text-sm font-bold text-brand-dark mb-4 uppercase tracking-wide">O que detectamos</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {alertas.map((a, i) => (
            <div key={i} className={`${a.bg} rounded-xl p-3 flex items-start gap-3`}>
              <a.icon className={`w-4 h-4 ${a.cor} shrink-0 mt-0.5`} />
              <div>
                <p className="text-xs font-bold text-brand-dark">{a.label}</p>
                <p className="text-xs text-brand-gray mt-0.5">{a.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Consulta em lote */}
      <div
        onClick={() => router.push('/dashboard/associacoes/lote')}
        className="card p-6 cursor-pointer hover:shadow-md transition-shadow border-2 border-dashed border-brand-green/30 hover:border-brand-green/60"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-green-light flex items-center justify-center shrink-0">
            <Upload className="w-6 h-6 text-brand-green" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-brand-dark mb-1">Consulta em lote — Planilha de associados</h3>
            <p className="text-sm text-brand-gray">
              Faça upload de uma planilha <strong>.xlsx</strong> com sua base de CPFs.
              O sistema verifica todos automaticamente e devolve uma planilha colorida
              com os alertas por associado.
            </p>
            <div className="flex gap-3 mt-3">
              {['Óbito', 'Fraude / Roubo', 'Processos', 'PEP', 'Score', 'Veículos'].map(tag => (
                <span key={tag} className="text-xs bg-brand-green-light text-brand-green font-medium px-2 py-0.5 rounded-full">{tag}</span>
              ))}
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-brand-gray shrink-0" />
        </div>
      </div>
    </div>
  )
}
