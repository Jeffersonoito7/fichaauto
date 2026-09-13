'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Loader2, CheckCircle2, Copy, ChevronRight,
  Wallet, Infinity as InfinityIcon, Shield, Zap,
} from 'lucide-react'
import Image from 'next/image'

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

interface PagamentoGerado {
  txid: string
  valorPago: number
  descricao: string
  qrCode: string
  copiaECola: string
}

export default function RecargaTenantPage() {
  const router = useRouter()
  const [loading,   setLoading]   = useState(false)
  const [erro,      setErro]      = useState('')
  const [pagamento, setPagamento] = useState<PagamentoGerado | null>(null)
  const [copiado,   setCopiado]   = useState(false)
  const [pago,      setPago]      = useState(false)
  const [polling,   setPolling]   = useState(false)
  const intervaloRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef   = useRef<ReturnType<typeof setTimeout>  | null>(null)

  // Limpa timers quando o componente desmonta
  useEffect(() => {
    return () => {
      if (intervaloRef.current) clearInterval(intervaloRef.current)
      if (timeoutRef.current)   clearTimeout(timeoutRef.current)
    }
  }, [])

  async function gerarPix() {
    setLoading(true)
    setErro('')
    try {
      const res = await fetch('/api/tenant/recarga/gerar', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setErro(data.erro ?? 'Erro ao gerar PIX.'); return }
      setPagamento(data)
      iniciarPolling(data.txid)
    } catch {
      setErro('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  function iniciarPolling(txid: string) {
    if (intervaloRef.current) clearInterval(intervaloRef.current)
    if (timeoutRef.current)   clearTimeout(timeoutRef.current)

    setPolling(true)
    intervaloRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/pix/status/${txid}`)
        const data = await res.json()
        if (data.status === 'pago') {
          clearInterval(intervaloRef.current!)
          intervaloRef.current = null
          setPolling(false)
          setPago(true)
        }
      } catch { /* segue tentando */ }
    }, 4000)

    timeoutRef.current = setTimeout(() => {
      clearInterval(intervaloRef.current!)
      intervaloRef.current = null
      setPolling(false)
    }, 65 * 60 * 1000)
  }

  async function copiar() {
    if (!pagamento?.copiaECola) return
    await navigator.clipboard.writeText(pagamento.copiaECola)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 3000)
  }

  // Confirmacao de pagamento
  if (pago) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-10 max-w-md w-full text-center shadow-sm border border-gray-100">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-2">Assinatura ativada</h1>
          <p className="text-gray-500 text-sm mb-6">
            Sua revenda tem acesso completo por <strong>30 dias</strong>. Todos os módulos liberados.
          </p>
          <button
            onClick={() => router.push('/dashboard/tenant')}
            className="w-full h-12 rounded-xl bg-brand-green hover:bg-green-700 text-white font-bold flex items-center justify-center gap-2 transition-all"
          >
            Ir para o painel <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  // Tela de pagamento Pix
  if (pagamento) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => setPagamento(null)}
              className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-gray-500" />
            </button>
            <div>
              <h1 className="font-bold text-gray-900 text-sm">Pagar via Pix</h1>
              <p className="text-xs text-gray-500">Válido por 60 minutos</p>
            </div>
          </div>

          <div className="text-center mb-5">
            <p className="text-3xl font-black text-gray-900">{fmt(pagamento.valorPago)}</p>
            <p className="text-xs text-gray-500 mt-1">Assinatura mensal — acesso completo por 30 dias</p>
          </div>

          {pagamento.qrCode && (
            <div className="flex justify-center mb-5">
              <div className="border-2 border-gray-200 rounded-xl p-2">
                <Image
                  src={`data:image/png;base64,${pagamento.qrCode}`}
                  alt="QR Code Pix"
                  width={200}
                  height={200}
                  className="rounded-lg"
                />
              </div>
            </div>
          )}

          <button
            onClick={copiar}
            className={`w-full h-12 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all mb-3 ${
              copiado
                ? 'bg-green-100 text-green-700 border border-green-200'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200'
            }`}
          >
            <Copy className="w-4 h-4" />
            {copiado ? 'Copiado!' : 'Copiar código Pix'}
          </button>

          {polling && (
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500 mt-4">
              <Loader2 className="w-3 h-3 animate-spin" />
              Aguardando confirmação do pagamento...
            </div>
          )}
        </div>
      </div>
    )
  }

  // Tela principal
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-6 py-10">

        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => router.push('/dashboard/tenant')}
            className="w-9 h-9 rounded-xl hover:bg-white border border-gray-200 flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-gray-500" />
          </button>
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-brand-green" />
            <h1 className="text-xl font-black text-gray-900">Renovar Assinatura</h1>
          </div>
        </div>

        {/* Card da assinatura */}
        <div className="bg-white rounded-2xl border-2 border-brand-green p-8 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm font-semibold text-brand-green uppercase tracking-wide">Plano Único</p>
              <h2 className="text-2xl font-black text-gray-900 mt-1">Acesso Completo</h2>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center">
              <Shield className="w-6 h-6 text-brand-green" />
            </div>
          </div>

          <div className="space-y-3 mb-8">
            <div className="flex items-center gap-3">
              <InfinityIcon className="w-4 h-4 text-brand-green flex-shrink-0" />
              <span className="text-sm text-gray-700">Consultas ilimitadas — veicular, CPF e CNPJ</span>
            </div>
            <div className="flex items-center gap-3">
              <Zap className="w-4 h-4 text-brand-green flex-shrink-0" />
              <span className="text-sm text-gray-700">Todos os módulos liberados desde o primeiro dia</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-brand-green flex-shrink-0" />
              <span className="text-sm text-gray-700">Validade de 30 dias após o pagamento</span>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-6 flex items-end justify-between">
            <div>
              <p className="text-xs text-gray-400">por empresa / mês</p>
              <p className="text-4xl font-black text-gray-900">R$ 1.500</p>
            </div>
            <p className="text-xs text-gray-400">pago via Pix</p>
          </div>
        </div>

        {erro && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 mb-4">
            {erro}
          </div>
        )}

        <button
          onClick={gerarPix}
          disabled={loading}
          className="w-full h-14 rounded-2xl bg-brand-green hover:bg-green-700 text-white font-bold text-base flex items-center justify-center gap-3 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
        >
          {loading
            ? <><Loader2 className="w-5 h-5 animate-spin" /> Gerando PIX...</>
            : <><Wallet className="w-5 h-5" /> Gerar PIX e ativar</>
          }
        </button>

        <p className="text-center text-xs text-gray-400 mt-4">
          Confirmação em segundos — assinatura ativa imediatamente após o pagamento
        </p>
      </div>
    </div>
  )
}
