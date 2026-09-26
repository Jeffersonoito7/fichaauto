'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ExcluirConta() {
  const router = useRouter()
  const [confirmacao, setConfirmacao] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  async function handleExcluir(e: React.FormEvent) {
    e.preventDefault()
    if (confirmacao !== 'EXCLUIR') return
    setLoading(true)
    setErro('')
    try {
      const res = await fetch('/api/conta/excluir', { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json()
        setErro(d.erro ?? 'Erro ao excluir conta.')
        return
      }
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/?conta=excluida')
    } catch {
      setErro('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto py-10">
      <h1 className="text-2xl font-bold text-red-600 mb-2">Excluir minha conta</h1>
      <p className="text-sm text-gray-600 mb-6">
        Esta ação é irreversível. Seus dados pessoais (nome, e-mail, senha) serão removidos.
        O histórico de consultas será anonimizado por exigência legal (5 anos para fins fiscais).
      </p>

      <form onSubmit={handleExcluir} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Digite <strong>EXCLUIR</strong> para confirmar
          </label>
          <input
            type="text"
            value={confirmacao}
            onChange={e => setConfirmacao(e.target.value.toUpperCase())}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            placeholder="EXCLUIR"
            required
          />
        </div>

        {erro && <p className="text-sm text-red-600">{erro}</p>}

        <button
          type="submit"
          disabled={confirmacao !== 'EXCLUIR' || loading}
          className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
        >
          {loading ? 'Excluindo...' : 'Excluir minha conta permanentemente'}
        </button>

        <button
          type="button"
          onClick={() => router.back()}
          className="w-full text-sm text-gray-500 hover:text-gray-700 py-2"
        >
          Cancelar
        </button>
      </form>
    </div>
  )
}
