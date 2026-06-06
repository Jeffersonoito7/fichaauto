'use client'
import { useEffect } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Ficha Auto Error]', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-red-100">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Erro na página</h2>
        <p className="text-sm text-gray-500 mb-4">
          Ocorreu um erro inesperado. Detalhes abaixo:
        </p>
        <pre className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-left text-xs text-red-700 overflow-auto max-h-48 mb-6 whitespace-pre-wrap break-all">
          {error?.message || 'Erro desconhecido'}
          {error?.stack ? '\n\n' + error.stack : ''}
        </pre>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-green text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <RefreshCw className="w-4 h-4" /> Tentar novamente
          </button>
          <a
            href="/dashboard"
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
          >
            Ir ao início
          </a>
        </div>
      </div>
    </div>
  )
}
