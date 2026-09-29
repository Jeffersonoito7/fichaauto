'use client'
import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { Loader2, Eye, EyeOff, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react'
import { TenantLogo, useTenant } from '@/components/TenantProvider'

const MINIMO = 8

function Conteudo() {
  const tenant = useTenant()
  const router = useRouter()
  const token = useSearchParams().get('token') ?? ''
  const cor = tenant.cor_primaria

  const [checando, setChecando] = useState(true)
  const [valido, setValido]     = useState(false)
  const [motivo, setMotivo]     = useState('')
  const [emailMasc, setEmail]   = useState('')

  const [senha, setSenha]       = useState('')
  const [repete, setRepete]     = useState('')
  const [show, setShow]         = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro]         = useState('')
  const [pronto, setPronto]     = useState(false)

  // Confere o link ANTES de mostrar o formulário, para a pessoa não digitar
  // a senha duas vezes e só então descobrir que o link expirou.
  useEffect(() => {
    if (!token) { setChecando(false); setMotivo('Link inválido.'); return }
    fetch(`/api/auth/redefinir-senha?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(d => {
        setValido(!!d.valido)
        setMotivo(d.motivo ?? '')
        setEmail(d.email ?? '')
      })
      .catch(() => setMotivo('Não foi possível validar o link.'))
      .finally(() => setChecando(false))
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    if (senha.length < MINIMO) { setErro(`A senha precisa ter ao menos ${MINIMO} caracteres.`); return }
    if (senha !== repete)      { setErro('As duas senhas não são iguais.'); return }

    setSalvando(true)
    try {
      const res = await fetch('/api/auth/redefinir-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, senha }),
      })
      const d = await res.json()
      if (!res.ok) { setErro(d.erro ?? 'Não foi possível redefinir.'); return }
      setPronto(true)
      setTimeout(() => router.push('/login'), 2500)
    } catch {
      setErro('Erro de conexão. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  const Caixa = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen bg-brand-off-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-brand-border rounded-2xl shadow-sm p-8">
        <div className="mb-7"><TenantLogo height={36} /></div>
        {children}
      </div>
    </div>
  )

  if (checando) return (
    <Caixa>
      <div className="flex items-center gap-3 text-sm text-brand-gray py-4">
        <Loader2 className="w-4 h-4 animate-spin" /> Verificando o link...
      </div>
    </Caixa>
  )

  if (pronto) return (
    <Caixa>
      <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
           style={{ backgroundColor: `${cor}1A`, color: cor }}>
        <CheckCircle2 className="w-5 h-5" />
      </div>
      <h1 className="text-xl font-bold text-brand-dark mb-2">Senha alterada</h1>
      <p className="text-sm text-brand-gray">
        Pronto. Estamos te levando para o login para você entrar com a senha nova.
      </p>
    </Caixa>
  )

  if (!valido) return (
    <Caixa>
      <div className="w-11 h-11 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mb-4">
        <XCircle className="w-5 h-5" />
      </div>
      <h1 className="text-xl font-bold text-brand-dark mb-2">{motivo || 'Link inválido'}</h1>
      <p className="text-sm text-brand-gray mb-6">
        Links de recuperação valem por 30 minutos e só funcionam uma vez.
        Peça um novo para continuar.
      </p>
      <Link
        href="/esqueci-senha"
        className="inline-block w-full text-center py-3 text-white font-bold rounded-xl transition-opacity hover:opacity-90"
        style={{ backgroundColor: cor }}
      >
        Pedir um novo link
      </Link>
      <div className="mt-6 pt-5 border-t border-brand-border">
        <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-brand-gray hover:text-brand-dark transition-colors">
          <ArrowLeft className="w-4 h-4" /> Voltar para o login
        </Link>
      </div>
    </Caixa>
  )

  return (
    <Caixa>
      <h1 className="text-xl font-bold text-brand-dark mb-1">Criar nova senha</h1>
      <p className="text-sm text-brand-gray mb-7">
        Para a conta <strong className="text-brand-dark">{emailMasc}</strong>.
      </p>

      {erro && (
        <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{erro}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="senha" className="block text-xs font-semibold text-brand-dark mb-1.5">
            Nova senha
          </label>
          <div className="relative">
            <input
              id="senha"
              type={show ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder={`Ao menos ${MINIMO} caracteres`}
              className="input-base pr-12"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              required
              autoFocus
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

        <div>
          <label htmlFor="repete" className="block text-xs font-semibold text-brand-dark mb-1.5">
            Repita a nova senha
          </label>
          <input
            id="repete"
            type={show ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Digite de novo"
            className="input-base"
            value={repete}
            onChange={e => setRepete(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          disabled={salvando}
          className="w-full flex items-center justify-center gap-2 py-3 text-white font-bold rounded-xl transition-opacity hover:opacity-90 disabled:opacity-40"
          style={{ backgroundColor: cor }}
        >
          {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar nova senha'}
        </button>
      </form>
    </Caixa>
  )
}

export default function RedefinirSenhaPage() {
  return (
    <Suspense fallback={null}>
      <Conteudo />
    </Suspense>
  )
}
