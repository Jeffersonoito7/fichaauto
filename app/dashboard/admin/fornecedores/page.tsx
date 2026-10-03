'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, Loader2, AlertCircle } from 'lucide-react'

type Opcao = {
  fornecedor: string
  nome: string
  custo: number
  disponivel: boolean
  motivo: string | null
}

type Linha = {
  modulo: string
  rotulo: string
  escolhido: string | null
  emUso: string | null
  opcoes: Opcao[]
}

const real = (v: number) =>
  v === 0 ? 'sem custo' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function FornecedoresPage() {
  const [linhas, setLinhas]   = useState<Linha[]>([])
  const [custo, setCusto]     = useState(0)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando]     = useState<string | null>(null)
  const [erro, setErro]             = useState('')

  async function carregar() {
    setErro('')
    try {
      const res = await fetch('/api/admin/fornecedores')
      const d = await res.json()
      if (!res.ok) { setErro(d.erro ?? 'Não foi possível carregar.'); return }
      setLinhas(d.modulos ?? [])
      setCusto(d.custoAtual ?? 0)
    } catch {
      setErro('Erro de conexão.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregar() }, [])

  async function escolher(modulo: string, fornecedor: string) {
    setSalvando(modulo)
    setErro('')
    try {
      const res = await fetch('/api/admin/fornecedores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modulo, fornecedor }),
      })
      const d = await res.json()
      if (!res.ok) { setErro(d.erro ?? 'Não foi possível salvar.'); return }
      await carregar()
    } catch {
      setErro('Erro de conexão.')
    } finally {
      setSalvando(null)
    }
  }

  if (carregando) {
    return (
      <div className="flex items-center gap-3 text-sm text-brand-gray p-6">
        <Loader2 className="w-4 h-4 animate-spin" /> Carregando fornecedores...
      </div>
    )
  }

  return (
    <div>
      <Link
        href="/dashboard/admin"
        className="inline-flex items-center gap-1.5 text-sm text-brand-gray hover:text-brand-dark transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar ao painel
      </Link>

      <h1 className="text-2xl font-bold text-brand-dark">Fornecedores de dados</h1>
      <p className="text-sm text-brand-gray mt-1 mb-6 max-w-2xl">
        Escolha de qual API vem cada parte da consulta veicular. A troca vale para
        todas as empresas clientes e passa a valer na próxima consulta, sem precisar
        de deploy.
      </p>

      {erro && (
        <div className="p-3 mb-5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {erro}
        </div>
      )}

      <div className="mb-6 p-4 bg-white border border-brand-border rounded-xl inline-block">
        <p className="text-xs text-brand-gray">Custo da consulta completa, como está hoje</p>
        <p className="text-2xl font-bold text-brand-dark tabular-nums mt-0.5">{real(custo)}</p>
      </div>

      <div className="space-y-4">
        {linhas.map(l => (
          <div key={l.modulo} className="bg-white border border-brand-border rounded-xl p-5">
            <div className="flex items-baseline justify-between gap-3 mb-3 flex-wrap">
              <h2 className="font-semibold text-brand-dark">{l.rotulo}</h2>
              {!l.emUso && (
                <span className="text-xs font-semibold text-red-600">
                  Nenhum fornecedor disponível
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {l.opcoes.map(o => {
                const ativo = l.emUso === o.fornecedor
                const bloqueado = !o.disponivel
                return (
                  <button
                    key={o.fornecedor}
                    type="button"
                    disabled={bloqueado || salvando === l.modulo}
                    onClick={() => escolher(l.modulo, o.fornecedor)}
                    title={o.motivo ?? undefined}
                    className={[
                      'text-left px-4 py-3 rounded-xl border transition-colors min-w-[190px]',
                      ativo
                        ? 'border-brand-green bg-green-50'
                        : 'border-brand-border hover:border-brand-gray',
                      bloqueado ? 'opacity-50 cursor-not-allowed' : '',
                    ].join(' ')}
                  >
                    <span className="flex items-center gap-1.5 font-semibold text-sm text-brand-dark">
                      {ativo && <Check className="w-3.5 h-3.5 text-brand-green" />}
                      {o.nome}
                    </span>
                    <span className="block text-xs text-brand-gray mt-0.5 tabular-nums">
                      {o.custo > 0 ? `${real(o.custo)} por consulta` : 'sem custo'}
                    </span>
                    {o.motivo && (
                      <span className="block text-[11px] text-amber-700 mt-1 leading-snug">
                        {o.motivo}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-brand-gray mt-6 max-w-2xl leading-relaxed">
        Fornecedor sem chave configurada no servidor aparece desabilitado de propósito:
        deixar escolher algo que não responde quebraria a consulta com o cliente
        esperando. Para liberar um deles, a chave precisa ser cadastrada nas variáveis
        de ambiente do servidor.
      </p>
    </div>
  )
}
