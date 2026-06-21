'use client'
import { useState, useEffect } from 'react'
import { Key, CheckCircle2, AlertCircle, Loader2, ExternalLink } from 'lucide-react'

export default function IntegracaoPage() {
  const [token, setToken]     = useState('')
  const [status, setStatus]   = useState<'idle' | 'saving' | 'ok' | 'erro'>('idle')
  const [config, setConfig]   = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/integracao')
      .then(r => r.json())
      .then(d => { setConfig(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setStatus('saving')
    const res = await fetch('/api/admin/integracao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ placafipeToken: token }),
    })
    setStatus(res.ok ? 'ok' : 'erro')
    if (res.ok) setTimeout(() => setStatus('idle'), 3000)
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-dark">Integrações</h1>
        <p className="text-brand-gray text-sm mt-1">Configure tokens e chaves de APIs externas</p>
      </div>

      {/* PlacaFIPE */}
      <div className="card p-6 mb-4">
        <div className="flex items-start gap-4 mb-5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <Key className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="font-semibold text-brand-dark">API PlacaFIPE</h2>
            <p className="text-xs text-brand-gray mt-0.5">
              Consulta gratuita de placa com valor FIPE para usuarios sem custo.
              {' '}
              <a href="https://placafipe.com.br/planos" target="_blank" rel="noreferrer"
                className="text-blue-600 hover:underline inline-flex items-center gap-1">
                Contratar plano <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-brand-gray">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
          </div>
        ) : (
          <>
            {/* Status atual */}
            <div className={`flex items-center gap-2 text-sm mb-4 px-3 py-2 rounded-lg ${
              config?.placafipeAtivo
                ? 'bg-green-50 text-green-700'
                : 'bg-orange-50 text-orange-700'
            }`}>
              {config?.placafipeAtivo
                ? <><CheckCircle2 className="w-4 h-4" /> Token configurado — consultas ativas</>
                : <><AlertCircle className="w-4 h-4" /> Token nao configurado — usando fallback Assertiva</>
              }
            </div>

            <form onSubmit={salvar} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-brand-gray block mb-1">
                  Token PlacaFIPE
                </label>
                <input
                  type="password"
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  placeholder={config?.placafipeAtivo ? '••••••••••••••••' : 'Cole o token recebido por email'}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
                <p className="text-xs text-brand-gray mt-1">
                  Custo: R$ 0,03 por consulta. Fallback automatico para Assertiva (R$ 1,34) se limite atingido.
                </p>
              </div>

              <button
                type="submit"
                disabled={!token || status === 'saving'}
                className="btn-primary text-sm px-5 py-2.5 flex items-center gap-2 disabled:opacity-50"
              >
                {status === 'saving' && <Loader2 className="w-4 h-4 animate-spin" />}
                {status === 'ok'     && <CheckCircle2 className="w-4 h-4" />}
                {status === 'saving' ? 'Salvando...' : status === 'ok' ? 'Salvo!' : 'Salvar token'}
              </button>

              {status === 'erro' && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Erro ao salvar. Tente novamente.
                </p>
              )}
            </form>
          </>
        )}
      </div>

      {/* Info TRANSPARENCIA */}
      <div className="card p-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h2 className="font-semibold text-brand-dark">Portal da Transparencia (CEIS/CNEP)</h2>
            <p className="text-xs text-brand-gray mt-0.5">Configurado via variavel de ambiente. Sancoes governamentais no relatorio CPF/CNPJ.</p>
            <span className="inline-block mt-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
              Ativo — gratuito
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
