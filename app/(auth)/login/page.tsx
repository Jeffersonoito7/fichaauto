'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { LogoHorizontal } from '@/components/LogoFichaAuto'

export default function LoginPage() {
  const [show, setShow]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [erro, setErro]       = useState('')
  const [form, setForm]       = useState({ email: '', password: '' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, senha: form.password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErro(data.erro ?? 'Erro ao fazer login.')
        setLoading(false)
        return
      }
      window.location.href = '/dashboard/consultar'
    } catch {
      setErro('Erro de conexão. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Esquerda: formulário ── */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm">

          {/* Logo */}
          <div className="mb-10">
            <LogoHorizontal height={40} theme="light" />
          </div>

          <h1 className="text-2xl font-bold text-brand-dark mb-1">Fazer Login</h1>
          <p className="text-brand-gray text-sm mb-8">Acesse sua conta para continuar</p>

          {/* Botão Google */}
          <button
            type="button"
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-brand-border rounded-lg text-sm font-medium text-brand-dark hover:bg-brand-gray-light transition-colors mb-4"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Conectar com o Google
          </button>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-brand-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs text-brand-gray">Ou acesse com seu e-mail</span>
            </div>
          </div>

          {erro && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-2">
              {erro}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-brand-dark mb-1.5">E-mail</label>
              <input
                type="email"
                placeholder="seu@email.com"
                className="input-base"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-brand-dark">Senha</label>
                <Link href="/esqueci-senha" className="text-xs text-brand-green hover:text-brand-green-dark transition-colors">
                  Esqueci minha senha
                </Link>
              </div>
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="input-base pr-12"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-gray hover:text-brand-dark transition-colors"
                >
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-brand-green hover:bg-brand-green-dark text-white font-semibold rounded-lg transition-colors mt-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Entrar'}
            </button>
          </form>

          <p className="text-center text-sm text-brand-gray mt-6">
            Ainda não tenho conta!{' '}
            <Link href="/cadastro" className="text-brand-green font-semibold hover:text-brand-green-dark transition-colors">
              Criar uma conta
            </Link>
          </p>
        </div>
      </div>

      {/* ── Direita: painel verde com decoração ── */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden flex-col justify-between p-14"
           style={{ background: 'linear-gradient(135deg, #007A3D 0%, #00A651 40%, #005C2E 100%)' }}>

        {/* Círculos decorativos */}
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/5" />
        <div className="absolute top-1/4 -right-10 w-56 h-56 rounded-full bg-white/5" />
        <div className="absolute -bottom-16 -left-16 w-72 h-72 rounded-full bg-white/5" />
        <div className="absolute bottom-1/3 right-10 w-40 h-40 rounded-full bg-brand-green/40" />
        <div className="absolute top-1/2 left-1/4 w-24 h-24 rounded-full bg-white/10" />
        {/* Círculos coloridos estilo MTix */}
        <div className="absolute bottom-16 left-16 w-20 h-20 rounded-full" style={{ background: '#F59E0B', opacity: 0.7 }} />
        <div className="absolute bottom-28 right-24 w-14 h-14 rounded-full" style={{ background: '#3B82F6', opacity: 0.7 }} />
        <div className="absolute bottom-8 right-52 w-10 h-10 rounded-full" style={{ background: '#EF4444', opacity: 0.8 }} />

        {/* Logo no topo */}
        <div className="relative z-10">
          <LogoHorizontal height={36} theme="dark" />
        </div>

        {/* Conteúdo central */}
        <div className="relative z-10">
          <h2 className="text-4xl font-extrabold text-white leading-tight mb-5">
            Proteja-se contra<br />fraudes e sinistros<br />veiculares.
          </h2>
          <p className="text-white/75 text-lg mb-8 max-w-sm">
            Consulte histórico completo do veículo — leilão, gravame, roubo e sinistros — antes de comprar ou aprovar qualquer indenização.
          </p>
          <div className="space-y-3">
            {[
              'Detecção de sinistro e adulteração',
              'BIN Federal + RENAJUD em tempo real',
              'Histórico de leilão em 3 bases',
            ].map(item => (
              <div key={item} className="flex items-center gap-3 text-sm text-white/85">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <span className="text-white text-xs font-bold">✓</span>
                </div>
                {item}
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-white/40 text-xs">© 2026 Ficha Auto — Todos os direitos reservados</p>
      </div>

    </div>
  )
}
