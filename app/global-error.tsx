'use client'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[FichaAuto GlobalError]', error)
  }, [error])

  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, fontFamily: 'sans-serif', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: 32, maxWidth: 560, width: '100%', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid #fecaca', textAlign: 'center' }}>
          <p style={{ fontSize: 40, margin: '0 0 12px' }}>⚠️</p>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111', margin: '0 0 8px' }}>Erro no sistema</h2>
          <p style={{ color: '#6b7280', fontSize: 14, margin: '0 0 16px' }}>Ocorreu um erro inesperado. Detalhes para suporte:</p>
          <pre style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 16, fontSize: 11, color: '#b91c1c', textAlign: 'left', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 200 }}>
            {error?.message || 'Erro desconhecido'}
            {'\n\n'}
            {error?.digest ? `digest: ${error.digest}` : ''}
            {error?.stack ? '\n\n' + error.stack : ''}
          </pre>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 20 }}>
            <button
              onClick={reset}
              style={{ background: '#00703C', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              Tentar novamente
            </button>
            <a
              href="/"
              style={{ background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
            >
              Ir ao início
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}
