'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, Loader2, ArrowLeft, CheckCircle2, ArrowRight } from 'lucide-react'
import ModulosSelector from '@/components/ModulosSelector'
import { LogoHorizontal } from '@/components/LogoFichaAuto'
import type { ModuloId } from '@/lib/products'

type Step = 'dados' | 'modulos' | 'sucesso'

export default function CadastroPage() {
  const [show, setShow]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [step, setStep]       = useState<Step>('dados')
  const [erro, setErro]       = useState('')
  const [form, setForm]       = useState({ nome: '', email: '', cpfCnpj: '', password: '' })
  const [modulos, setModulos]  = useState<ModuloId[]>([])

  function avancarParaModulos(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    if (!form.nome || !form.email || !form.cpfCnpj || !form.password) {
      setErro('Preencha todos os campos.')
      return
    }
    if (form.password.length < 8) {
      setErro('A senha deve ter pelo menos 8 caracteres.')
      return
    }
    setStep('modulos')
  }

  async function handleSubmit() {
    setLoading(true)
    setErro('')
    try {
      const res = await fetch('/api/auth/cadastro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, modulos_liberados: modulos }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.erro ?? 'Erro ao criar conta.')
      setStep('sucesso')
    } catch (err: any) {
      setErro(err.message)
      setStep('dados')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'sucesso') {
    return (
      <div className="min-h-screen bg-brand-off-white flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-brand-green-light rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-brand-green" />
          </div>
          <h1 className="text-2xl font-bold text-brand-dark mb-2">Solicitação recebida!</h1>
          <p className="text-brand-gray mb-6">Recebemos seus dados. Nossa equipe entrará em contato em até 24 horas para ativar seu acesso.</p>
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
          <LogoHorizontal height={36} theme="dark" />
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
            <LogoHorizontal height={36} theme="light" />
          </div>

          {/* Indicador de etapas */}
          <div className="flex items-center gap-2 mb-6">
            {(['dados', 'modulos'] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step === s ? 'bg-brand-green text-white' :
                  (step === 'modulos' && s === 'dados') || (step as string) === 'sucesso' ? 'bg-brand-green-light text-brand-green' :
                  'bg-brand-gray-light text-brand-gray'
                }`}>{i + 1}</div>
                <span className={`text-xs font-medium hidden sm:block ${step === s ? 'text-brand-dark' : 'text-brand-gray'}`}>
                  {s === 'dados' ? 'Seus dados' : 'Módulos de interesse'}
                </span>
                {i < 1 && <div className={`flex-1 h-0.5 w-8 ${step === 'modulos' || (step as string) === 'sucesso' ? 'bg-brand-green' : 'bg-brand-border'}`} />}
              </div>
            ))}
          </div>

          {/* ETAPA 1 — Dados */}
          {step === 'dados' && (
            <>
              <h1 className="text-2xl font-bold text-brand-dark mb-1">Criar conta</h1>
              <p className="text-brand-gray text-sm mb-6">Comece gratuitamente, sem cartão de crédito</p>

              {erro && <p className="text-xs text-brand-danger bg-red-50 px-3 py-2 rounded-xl mb-4">{erro}</p>}

              <form onSubmit={avancarParaModulos} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-brand-dark mb-1.5">Nome completo</label>
                  <input type="text" placeholder="Seu nome" className="input-base"
                    value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-brand-dark mb-1.5">E-mail</label>
                  <input type="email" placeholder="seu@email.com" className="input-base"
                    value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-brand-dark mb-1.5">CPF ou CNPJ</label>
                  <input type="text" placeholder="000.000.000-00 ou 00.000.000/0001-00" className="input-base"
                    value={form.cpfCnpj} onChange={e => setForm(p => ({ ...p, cpfCnpj: e.target.value }))} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-brand-dark mb-1.5">Senha</label>
                  <div className="relative">
                    <input type={show ? 'text' : 'password'} placeholder="Mínimo 8 caracteres"
                      className="input-base pr-12" value={form.password} minLength={8}
                      onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required />
                    <button type="button" onClick={() => setShow(!show)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-gray hover:text-brand-dark transition-colors">
                      {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-brand-gray">
                  Ao criar sua conta você concorda com os{' '}
                  <Link href="#" className="text-brand-blue underline">Termos de Uso</Link> e{' '}
                  <Link href="#" className="text-brand-blue underline">Política de Privacidade</Link>.
                </p>
                <button type="submit" className="btn-green w-full flex items-center justify-center gap-2">
                  Próximo <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <p className="text-center text-sm text-brand-gray mt-6">
                Já tem conta?{' '}
                <Link href="/login" className="text-brand-blue font-semibold hover:text-brand-blue-dark transition-colors">
                  Entrar
                </Link>
              </p>
            </>
          )}

          {/* ETAPA 2 — Módulos de interesse */}
          {step === 'modulos' && (
            <>
              <button onClick={() => setStep('dados')} className="flex items-center gap-1.5 text-sm text-brand-gray hover:text-brand-blue mb-4 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Voltar
              </button>

              <h1 className="text-2xl font-bold text-brand-dark mb-1">O que você precisa consultar?</h1>
              <p className="text-brand-gray text-sm mb-5">
                Selecione os módulos de interesse. Nossa equipe usará isso para configurar seu acesso corretamente.
              </p>

              {erro && <p className="text-xs text-brand-danger bg-red-50 px-3 py-2 rounded-xl mb-4">{erro}</p>}

              <div className="max-h-[380px] overflow-y-auto mb-5 pr-1">
                <ModulosSelector
                  selecionados={modulos}
                  onChange={setModulos}
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="btn-green w-full flex items-center justify-center gap-2"
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
                  : <><CheckCircle2 className="w-4 h-4" /> Enviar solicitação</>
                }
              </button>

              <p className="text-xs text-brand-gray text-center mt-3">
                {modulos.length > 0
                  ? `${modulos.length} módulo${modulos.length > 1 ? 's' : ''} selecionado${modulos.length > 1 ? 's' : ''} — nossa equipe configurará seu acesso`
                  : 'Você pode pular esta etapa e configurar depois'}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
