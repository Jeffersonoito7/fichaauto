'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Car, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react'

export default function LoginPage() {
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ email: '', password: '' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    // TODO: integrar Supabase Auth
    await new Promise(r => setTimeout(r, 1000))
    setLoading(false)
    window.location.href = '/dashboard/consultar'
  }

  return (
    <div className="min-h-screen bg-brand-off-white flex">

      {/* Left - visual */}
      <div className="hidden lg:flex lg:w-1/2 gradient-brand flex-col justify-between p-12 text-white">
        <Link href="/" className="flex items-center gap-2 w-fit">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
            <Car className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg">Ficha Auto</span>
        </Link>

        <div>
          <h2 className="text-4xl font-extrabold mb-4 leading-tight">
            Consulta veicular<br />profissional e segura
          </h2>
          <p className="text-white/70 text-lg mb-8">
            Acesse sua conta e consulte placas com relatório completo em segundos.
          </p>
          <div className="space-y-3">
            {[
              'Score de risco automático',
              'Leilão verificado em 3 bases',
              'RENAJUD e Gravame em tempo real',
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm text-white/80">
                <div className="w-5 h-5 rounded-full bg-brand-green flex items-center justify-center shrink-0">
                  <span className="text-white text-xs">✓</span>
                </div>
                {item}
              </div>
            ))}
          </div>
        </div>

        <p className="text-white/40 text-xs">© 2026 Ficha Auto</p>
      </div>

      {/* Right - form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-brand-gray hover:text-brand-blue mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Voltar ao início
          </Link>

          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg gradient-hero flex items-center justify-center">
              <Car className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-brand-dark">Ficha Auto</span>
          </div>

          <h1 className="text-2xl font-bold text-brand-dark mb-1">Bem-vindo de volta</h1>
          <p className="text-brand-gray text-sm mb-8">Entre com sua conta para continuar</p>

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
                <Link href="/esqueci-senha" className="text-xs text-brand-blue hover:text-brand-blue-dark transition-colors">
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

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Entrar'}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-brand-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-brand-off-white px-3 text-xs text-brand-gray">ou</span>
            </div>
          </div>

          <button className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-brand-border rounded-lg text-sm font-medium text-brand-dark hover:bg-brand-gray-light transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Entrar com Google
          </button>

          <p className="text-center text-sm text-brand-gray mt-6">
            Não tem conta?{' '}
            <Link href="/cadastro" className="text-brand-blue font-semibold hover:text-brand-blue-dark transition-colors">
              Criar conta grátis
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
