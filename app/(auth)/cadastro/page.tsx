'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Car, Eye, EyeOff, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react'

export default function CadastroPage() {
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'form' | 'success'>('form')
  const [form, setForm] = useState({ nome: '', email: '', cpfCnpj: '', password: '' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    // TODO: integrar Supabase Auth
    await new Promise(r => setTimeout(r, 1200))
    setLoading(false)
    setStep('success')
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-brand-off-white flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-brand-green-light rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-brand-green" />
          </div>
          <h1 className="text-2xl font-bold text-brand-dark mb-2">Conta criada!</h1>
          <p className="text-brand-gray mb-6">Verifique seu e-mail para confirmar o cadastro e começar a consultar.</p>
          <Link href="/login" className="btn-primary">Ir para o login</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-off-white flex">

      {/* Left */}
      <div className="hidden lg:flex lg:w-1/2 gradient-brand flex-col justify-between p-12 text-white">
        <Link href="/" className="flex items-center w-fit">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-horizontal.png" alt="Ficha Auto" style={{ height: 38, objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
        </Link>
        <div>
          <h2 className="text-4xl font-extrabold mb-4 leading-tight">
            Crie sua conta<br />e consulte agora
          </h2>
          <p className="text-white/70 text-lg mb-8">
            Cadastre-se gratuitamente e tenha acesso a relatórios veiculares completos.
          </p>
          <div className="bg-white/10 rounded-2xl p-6 backdrop-blur-sm">
            <p className="font-semibold mb-3">O que você recebe:</p>
            <div className="space-y-2">
              {[
                'Dados completos do veículo',
                'Score de risco automático',
                'RENAJUD, Gravame e Leilão',
                'PDF profissional para download',
                'Link compartilhável',
              ].map(item => (
                <div key={item} className="flex items-center gap-2 text-sm text-white/80">
                  <span className="text-brand-green">✓</span> {item}
                </div>
              ))}
            </div>
          </div>
        </div>
        <p className="text-white/40 text-xs">© 2026 Ficha Auto</p>
      </div>

      {/* Right */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-brand-gray hover:text-brand-blue mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Link>

          <div className="lg:hidden mb-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-horizontal.png" alt="Ficha Auto" style={{ height: 36, objectFit: 'contain' }} />
          </div>

          <h1 className="text-2xl font-bold text-brand-dark mb-1">Criar conta</h1>
          <p className="text-brand-gray text-sm mb-8">Comece gratuitamente, sem cartão de crédito</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-brand-dark mb-1.5">Nome completo</label>
              <input
                type="text"
                placeholder="Seu nome"
                className="input-base"
                value={form.nome}
                onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                required
              />
            </div>
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
              <label className="block text-sm font-medium text-brand-dark mb-1.5">CPF ou CNPJ</label>
              <input
                type="text"
                placeholder="000.000.000-00 ou 00.000.000/0001-00"
                className="input-base"
                value={form.cpfCnpj}
                onChange={e => setForm(p => ({ ...p, cpfCnpj: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-dark mb-1.5">Senha</label>
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  placeholder="Mínimo 8 caracteres"
                  className="input-base pr-12"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  minLength={8}
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

            <p className="text-xs text-brand-gray">
              Ao criar sua conta você concorda com os{' '}
              <Link href="#" className="text-brand-blue underline">Termos de Uso</Link> e{' '}
              <Link href="#" className="text-brand-blue underline">Política de Privacidade</Link>.
            </p>

            <button type="submit" disabled={loading} className="btn-green w-full mt-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar conta grátis'}
            </button>
          </form>

          <p className="text-center text-sm text-brand-gray mt-6">
            Já tem conta?{' '}
            <Link href="/login" className="text-brand-blue font-semibold hover:text-brand-blue-dark transition-colors">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
