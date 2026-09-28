'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, Loader2, ShieldCheck, FileText, Landmark } from 'lucide-react'
import { TenantLogo, useTenant } from '@/components/TenantProvider'

const PROVAS = [
  {
    icon: ShieldCheck,
    titulo: 'Indício de sinistro e adulteração',
    texto: 'Cruzamento de leilão, precificador e BIN Federal',
  },
  {
    icon: Landmark,
    titulo: 'Gravame e restrições em tempo real',
    texto: 'Situação financeira e judicial na hora da consulta',
  },
  {
    icon: FileText,
    titulo: 'Relatório em PDF com a sua marca',
    texto: 'Logo e cores da empresa em cada laudo emitido',
  },
]

const NUMEROS = [
  { valor: '7',    rotulo: 'bases consultadas'  },
  { valor: '~8s',  rotulo: 'tempo do relatório' },
  { valor: '100%', rotulo: 'fontes oficiais'    },
]

export default function LoginPage() {
  const tenant = useTenant()
  const [show, setShow]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [erro, setErro]       = useState('')
  const [form, setForm]       = useState({ email: '', senha: '' })

  // Num subdomínio de cliente a tela é DELE: marca, cor e nome da empresa.
  // O slug 'ficha-auto' é o tenant padrão, ou seja, o domínio principal.
  const ehCliente  = tenant.slug !== 'ficha-auto'
  const nomeEmpresa = tenant.nome_fantasia ?? tenant.nome
  const cor = tenant.cor_primaria

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, senha: form.senha }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErro(data.erro ?? 'Erro ao fazer login.')
        setLoading(false)
        return
      }
      window.location.href = '/dashboard'
    } catch {
      setErro('Erro de conexão. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-brand-off-white flex items-center justify-center p-4 lg:p-10">
      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">

        {/* ── Cartão de login ── */}
        <div className="w-full max-w-md mx-auto lg:mx-0 bg-white border border-brand-border rounded-2xl shadow-sm p-8 lg:p-9">
          <div className="mb-7">
            <TenantLogo height={38} />
          </div>

          <h1 className="text-xl font-bold text-brand-dark mb-1">
            {ehCliente ? `Painel ${nomeEmpresa}` : 'Acessar o painel'}
          </h1>
          <p className="text-sm text-brand-gray mb-7">
            {ehCliente
              ? 'Consulta veicular para a sua equipe. Entre com seu acesso.'
              : 'Entre com as credenciais da sua empresa.'}
          </p>

          {erro && (
            <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {erro}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-brand-dark mb-1.5">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="seu@email.com.br"
                className="input-base"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                required
              />
            </div>

            <div>
              <div className="flex items-baseline justify-between mb-1.5">
                <label htmlFor="senha" className="block text-xs font-semibold text-brand-dark">
                  Senha
                </label>
                <Link
                  href="/esqueci-senha"
                  className="text-xs font-semibold hover:underline"
                  style={{ color: cor }}
                >
                  Esqueci minha senha
                </Link>
              </div>
              <div className="relative">
                <input
                  id="senha"
                  type={show ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••••"
                  className="input-base pr-12"
                  value={form.senha}
                  onChange={e => setForm(p => ({ ...p, senha: e.target.value }))}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShow(s => !s)}
                  aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-gray hover:text-brand-dark transition-colors"
                >
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 text-white font-bold rounded-xl transition-opacity hover:opacity-90 disabled:opacity-40"
              style={{ backgroundColor: cor }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Entrar'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-brand-border text-center text-xs text-brand-gray">
            {ehCliente ? (
              <>Problemas para entrar? Fale com o administrador da {nomeEmpresa}.</>
            ) : (
              <>
                Sua empresa ainda não tem conta?{' '}
                <Link href="/planos" className="font-semibold hover:underline" style={{ color: cor }}>
                  Falar com o comercial
                </Link>
              </>
            )}
          </div>
        </div>

        {/* ── Painel de apoio ── */}
        <div className="hidden lg:block max-w-md">
          <h2 className="text-3xl font-extrabold text-brand-dark leading-tight tracking-tight mb-3 text-balance">
            Consulta veicular com{' '}
            <span style={{ color: cor }}>histórico completo</span>{' '}
            {ehCliente ? 'para a sua operação.' : 'para sua operação.'}
          </h2>
          <p className="text-sm text-brand-gray leading-relaxed mb-7">
            Dados oficiais de gravame, leilão, roubo e sinistro em uma única consulta,
            com relatório pronto para anexar ao processo.
          </p>

          <div className="space-y-2.5 mb-7">
            {PROVAS.map(p => (
              <div
                key={p.titulo}
                className="flex gap-3 bg-white border border-brand-border rounded-xl p-3.5"
                style={{ borderLeftWidth: 3, borderLeftColor: cor }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${cor}1A`, color: cor }}
                >
                  <p.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-brand-dark leading-snug">{p.titulo}</p>
                  <p className="text-xs text-brand-gray leading-snug mt-0.5">{p.texto}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-px bg-brand-border border border-brand-border rounded-xl overflow-hidden">
            {NUMEROS.map(n => (
              <div key={n.rotulo} className="bg-white px-3 py-3.5 text-center">
                <p className="text-lg font-extrabold tabular-nums tracking-tight" style={{ color: cor }}>
                  {n.valor}
                </p>
                <p className="text-[10px] text-brand-gray leading-tight mt-0.5">{n.rotulo}</p>
              </div>
            ))}
          </div>

          {ehCliente && (
            <p className="text-[11px] text-brand-gray/70 mt-5 text-center">
              Plataforma fornecida por Ficha Auto
            </p>
          )}
        </div>

      </div>
    </div>
  )
}
