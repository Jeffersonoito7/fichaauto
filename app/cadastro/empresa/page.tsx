'use client'
import { useState } from 'react'
import Link from 'next/link'
import {
  Building2, User, Mail, Phone, FileText,
  Loader2, CheckCircle2, ChevronRight, Car,
} from 'lucide-react'

function maskCnpj(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 14)
  if (d.length <= 2) return d
  if (d.length <= 5) return `${d.slice(0,2)}.${d.slice(2)}`
  if (d.length <= 8) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5)}`
  if (d.length <= 12) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8)}`
  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`
}

function maskPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return `(${d}`
  if (d.length <= 7) return `(${d.slice(0,2)}) ${d.slice(2)}`
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
}

const USOS = [
  'Revenda de veiculos',
  'Associacao de protecao veicular (APV)',
  'Despachante / Cartorio',
  'Financeira / Fintech',
  'Empresa de logistica / frota',
  'Seguradora / corretora',
  'Outro',
]

export default function CadastroEmpresaPage() {
  const [form, setForm] = useState({
    razao_social: '',
    nome_fantasia: '',
    cnpj: '',
    nome: '',
    email: '',
    whatsapp: '',
    tipo_uso: '',
  })
  const [loading, setLoading]   = useState(false)
  const [erro, setErro]         = useState('')
  const [concluido, setConcluido] = useState(false)

  function campo(k: keyof typeof form, v: string) {
    setForm(p => ({ ...p, [k]: v }))
  }

  function isValido() {
    return (
      form.razao_social.trim().length >= 3 &&
      form.nome.trim().length >= 2 &&
      form.email.includes('@') &&
      form.whatsapp.replace(/\D/g, '').length >= 10 &&
      form.tipo_uso !== ''
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValido()) return
    setLoading(true)
    setErro('')

    const res = await fetch('/api/auth/cadastro-empresa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setErro(data.erro ?? 'Erro ao enviar. Tente novamente.')
      return
    }

    setConcluido(true)
  }

  if (concluido) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-10 max-w-md w-full text-center shadow-sm border border-gray-100">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-brand-green" />
          </div>
          <h1 className="text-2xl font-black text-brand-dark mb-3">Solicitacao enviada</h1>
          <p className="text-brand-gray text-sm leading-relaxed mb-6">
            Recebemos os dados da sua empresa. Nossa equipe vai entrar em contato em ate <strong>1 dia util</strong> pelo WhatsApp informado para ativar seu acesso.
          </p>
          <div className="bg-gray-50 rounded-xl p-4 text-sm text-brand-gray mb-6">
            Qualquer duvida, fale diretamente com a gente pelo WhatsApp.
          </div>
          <Link href="/" className="btn-primary inline-flex items-center gap-2">
            Voltar ao inicio <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-green flex items-center justify-center">
              <Car className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-brand-dark">Ficha <span className="text-brand-green">Auto</span></span>
          </Link>
          <Link href="/login" className="text-sm text-brand-gray hover:text-brand-dark transition-colors">
            Ja tenho conta
          </Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-12">

        {/* Titulo */}
        <div className="text-center mb-10">
          <div className="w-14 h-14 rounded-2xl bg-brand-green-light flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-7 h-7 text-brand-green" />
          </div>
          <h1 className="text-3xl font-black text-brand-dark mb-2">Cadastro de Empresa</h1>
          <p className="text-brand-gray">Preencha os dados abaixo. Nossa equipe ativa seu acesso em ate 1 dia util.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Dados da empresa */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <Building2 className="w-4 h-4 text-brand-green" />
              <h2 className="text-sm font-bold text-brand-dark uppercase tracking-wide">Dados da Empresa</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-brand-gray mb-1.5">Razao Social *</label>
                <input
                  type="text"
                  value={form.razao_social}
                  onChange={e => campo('razao_social', e.target.value)}
                  placeholder="Ex: Comercial Joao Silva Ltda"
                  className="input-base"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-gray mb-1.5">Nome Fantasia</label>
                <input
                  type="text"
                  value={form.nome_fantasia}
                  onChange={e => campo('nome_fantasia', e.target.value)}
                  placeholder="Como a empresa e conhecida (opcional)"
                  className="input-base"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-gray mb-1.5">CNPJ</label>
                <input
                  type="text"
                  value={maskCnpj(form.cnpj)}
                  onChange={e => campo('cnpj', e.target.value.replace(/\D/g, ''))}
                  placeholder="00.000.000/0001-00"
                  className="input-base font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-gray mb-1.5">Tipo de uso *</label>
                <select
                  value={form.tipo_uso}
                  onChange={e => campo('tipo_uso', e.target.value)}
                  className="input-base bg-white"
                  required
                >
                  <option value="">Selecione como vai usar o Ficha Auto</option>
                  {USOS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Dados do responsavel */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <User className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-brand-dark uppercase tracking-wide">Responsavel pelo Acesso</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-brand-gray mb-1.5">Nome completo *</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={e => campo('nome', e.target.value)}
                  placeholder="Nome do responsavel"
                  className="input-base"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-gray mb-1.5">E-mail *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-gray" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => campo('email', e.target.value)}
                    placeholder="email@empresa.com.br"
                    className="input-base pl-10"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-gray mb-1.5">WhatsApp *</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-gray" />
                  <input
                    type="text"
                    value={maskPhone(form.whatsapp)}
                    onChange={e => campo('whatsapp', e.target.value.replace(/\D/g, ''))}
                    placeholder="(81) 99999-9999"
                    className="input-base pl-10 font-mono"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* O que acontece depois */}
          <div className="bg-brand-green-light border border-brand-green/20 rounded-2xl p-5">
            <p className="text-xs font-bold text-brand-dark mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-green" />
              O que acontece apos o envio
            </p>
            <div className="space-y-2">
              {[
                'Nossa equipe recebe seus dados e valida as informacoes',
                'Entramos em contato pelo WhatsApp em ate 1 dia util',
                'Voce recebe o acesso ao painel com saldo inicial para testar',
                'Recarregue o saldo quando quiser via Pix e comece a consultar',
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-brand-gray">
                  <span className="w-4 h-4 rounded-full bg-brand-green text-white flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {item}
                </div>
              ))}
            </div>
          </div>

          {erro && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
              {erro}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !isValido()}
            className="w-full h-14 rounded-2xl bg-brand-green hover:bg-green-700 text-white font-bold text-base flex items-center justify-center gap-3 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
          >
            {loading
              ? <><Loader2 className="w-5 h-5 animate-spin" /> Enviando...</>
              : <><Building2 className="w-5 h-5" /> Solicitar acesso</>
            }
          </button>

          <p className="text-center text-xs text-brand-gray">
            Sem mensalidade. Sem compromisso. Pague so o que usar.
          </p>
        </form>
      </div>
    </div>
  )
}
