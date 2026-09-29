'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Loader2, MailCheck, ArrowLeft } from 'lucide-react'
import { TenantLogo, useTenant } from '@/components/TenantProvider'

export default function EsqueciSenhaPage() {
  const tenant = useTenant()
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro]       = useState('')

  const cor = tenant.cor_primaria
  const ehCliente = tenant.slug !== 'ficha-auto'
  const nomeEmpresa = tenant.nome_fantasia ?? tenant.nome

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/esqueci-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const d = await res.json()
      if (!res.ok) { setErro(d.erro ?? 'Erro ao enviar.'); return }
      setEnviado(true)
    } catch {
      setErro('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-brand-off-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-brand-border rounded-2xl shadow-sm p-8">
        <div className="mb-7">
          <TenantLogo height={36} />
        </div>

        {enviado ? (
          <>
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
              style={{ backgroundColor: `${cor}1A`, color: cor }}
            >
              <MailCheck className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-brand-dark mb-2">Verifique seu e-mail</h1>
            <p className="text-sm text-brand-gray leading-relaxed mb-1">
              Se <strong className="text-brand-dark">{email}</strong> estiver cadastrado,
              enviamos um link para criar uma nova senha.
            </p>
            <p className="text-sm text-brand-gray leading-relaxed">
              O link vale por 30 minutos e só pode ser usado uma vez.
            </p>

            <div className="mt-6 pt-5 border-t border-brand-border">
              <p className="text-xs text-brand-gray mb-3">
                Não chegou? Confira a caixa de spam. Se ainda assim não vier,
                {ehCliente
                  ? ` fale com o administrador da ${nomeEmpresa}, que pode redefinir sua senha.`
                  : ' verifique se digitou o e-mail correto.'}
              </p>
              <button
                onClick={() => { setEnviado(false); setEmail('') }}
                className="text-sm font-semibold hover:underline"
                style={{ color: cor }}
              >
                Tentar com outro e-mail
              </button>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-brand-dark mb-1">Esqueci minha senha</h1>
            <p className="text-sm text-brand-gray mb-7">
              Informe seu e-mail e enviaremos um link para criar uma nova senha.
            </p>

            {erro && (
              <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                {erro}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-brand-dark mb-1.5">
                  E-mail cadastrado
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  placeholder="seu@email.com.br"
                  className="input-base"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 text-white font-bold rounded-xl transition-opacity hover:opacity-90 disabled:opacity-40"
                style={{ backgroundColor: cor }}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar link de recuperação'}
              </button>
            </form>
          </>
        )}

        <div className="mt-6 pt-5 border-t border-brand-border">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm text-brand-gray hover:text-brand-dark transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar para o login
          </Link>
        </div>
      </div>
    </div>
  )
}
