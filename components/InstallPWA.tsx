'use client'
import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

export default function InstallPWA() {
  const [prompt, setPrompt] = useState<any>(null)
  const [dismissed, setDismissed] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    // Já está instalado como PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true)
      return
    }
    // Já dispensou antes nesta sessão
    if (sessionStorage.getItem('pwa-dismissed')) {
      setDismissed(true)
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function instalar() {
    if (!prompt) return
    prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setPrompt(null)
  }

  function dispensar() {
    sessionStorage.setItem('pwa-dismissed', '1')
    setDismissed(true)
  }

  if (installed || dismissed || !prompt) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-sm mx-auto">
      <div className="bg-white border border-brand-border rounded-2xl shadow-xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-green flex items-center justify-center shrink-0">
          <Download className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-brand-dark">Instalar Ficha Auto</p>
          <p className="text-xs text-brand-gray">Acesse direto da tela inicial, sem navegador</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={instalar}
            className="text-xs font-bold bg-brand-green text-white px-3 py-1.5 rounded-lg hover:bg-brand-green-dark transition-colors"
          >
            Instalar
          </button>
          <button onClick={dispensar} className="text-brand-gray hover:text-brand-dark transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
