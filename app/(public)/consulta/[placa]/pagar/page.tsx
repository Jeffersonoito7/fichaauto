'use client'
import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle, Clock, Copy, Loader2, Lock, ShieldCheck } from 'lucide-react'

const ITENS_INCLUIDOS = [
  'Dados cadastrais completos (DETRAN)',
  'Gravame / Financiamento ativo',
  'Histórico de leilão',
  'Roubo e furto (BIN Federal)',
  'RENAJUD (restrições judiciais)',
  'Sinistro (indício)',
  'Multas e débitos',
  'Valor FIPE atualizado',
]

type Estado = 'gerando' | 'aguardando' | 'pago' | 'erro'

export default function PagarAvulsoPage() {
  const { placa: placaParam } = useParams<{ placa: string }>()
  const router = useRouter()
  const placa = (placaParam ?? '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()

  const [estado, setEstado]     = useState<Estado>('gerando')
  const [txid, setTxid]         = useState('')
  const [qrcode, setQrcode]     = useState('')
  const [copiaCola, setCopiaCola] = useState('')
  const [copiado, setCopiado]   = useState(false)
  const [erroMsg, setErroMsg]   = useState('')

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!placa || placa.length < 7) return

    fetch('/api/consulta/avulsa/gerar', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ placa }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.erro) { setErroMsg(d.erro); setEstado('erro'); return }
        setTxid(d.txid)
        setQrcode(d.qrcode)
        setCopiaCola(d.copiaCola)
        setEstado('aguardando')
      })
      .catch(() => { setErroMsg('Falha ao gerar PIX. Tente novamente.'); setEstado('erro') })
  }, [placa])

  useEffect(() => {
    if (estado !== 'aguardando' || !txid) return

    pollingRef.current = setInterval(() => {
      fetch(`/api/consulta/avulsa/status?txid=${txid}`)
        .then(r => r.json())
        .then(d => {
          if (d.status === 'pago') {
            clearInterval(pollingRef.current!)
            setEstado('pago')
            if (d.token) {
              setTimeout(() => router.push(`/r/${d.token}`), 2000)
            }
          }
        })
        .catch(() => {})
    }, 3000)

    return () => { if (pollingRef.current) clearInterval(pollingRef.current) }
  }, [estado, txid, router])

  function copiar() {
    navigator.clipboard.writeText(copiaCola).then(() => {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <p className="text-sm font-semibold text-gray-800">Consulta Completa</p>
          <p className="text-xs text-gray-400 font-mono">{placa}</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* Gerando PIX */}
        {estado === 'gerando' && (
          <div className="bg-white rounded-2xl p-10 flex flex-col items-center gap-3 shadow-sm">
            <Loader2 className="w-8 h-8 animate-spin text-green-600" />
            <p className="text-sm text-gray-500">Gerando cobrança PIX...</p>
          </div>
        )}

        {/* Erro */}
        {estado === 'erro' && (
          <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-3 shadow-sm text-center">
            <p className="font-semibold text-gray-700">Não foi possível gerar o PIX</p>
            <p className="text-sm text-gray-500">{erroMsg}</p>
            <button
              onClick={() => router.back()}
              className="mt-3 text-sm text-green-600 font-medium"
            >
              Voltar
            </button>
          </div>
        )}

        {/* QR Code aguardando */}
        {(estado === 'aguardando') && (
          <>
            {/* Valor */}
            <div className="bg-green-600 rounded-2xl p-5 text-white text-center shadow-md">
              <p className="text-sm font-medium opacity-80">Valor da consulta</p>
              <p className="text-4xl font-bold mt-1">R$ 34,00</p>
              <p className="text-xs opacity-70 mt-1">PIX — pagamento único, sem cadastro</p>
            </div>

            {/* QR Code */}
            <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col items-center gap-4">
              <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                Aguardando pagamento...
              </p>
              {qrcode && (
                <img src={qrcode} alt="QR Code PIX" className="w-52 h-52 rounded-xl border border-gray-100" />
              )}
              <button
                onClick={copiar}
                className="w-full flex items-center justify-center gap-2 border border-gray-200 rounded-xl py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Copy className="w-4 h-4" />
                {copiado ? 'Copiado!' : 'Copiar código Pix Copia e Cola'}
              </button>
            </div>

            {/* O que inclui */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Inclui na consulta</p>
              <div className="space-y-2">
                {ITENS_INCLUIDOS.map(item => (
                  <div key={item} className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-green-500 shrink-0" />
                    <span className="text-sm text-gray-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 justify-center">
              <Lock className="w-3.5 h-3.5 text-gray-400" />
              <p className="text-xs text-gray-400">Pagamento seguro via PIX. Resultado disponível em instantes.</p>
            </div>
          </>
        )}

        {/* Pago */}
        {estado === 'pago' && (
          <div className="bg-white rounded-2xl p-10 flex flex-col items-center gap-3 shadow-sm text-center">
            <CheckCircle className="w-14 h-14 text-green-500" />
            <p className="text-lg font-bold text-gray-800">Pagamento confirmado!</p>
            <p className="text-sm text-gray-500">Abrindo seu relatório...</p>
            <Loader2 className="w-5 h-5 animate-spin text-green-500 mt-2" />
          </div>
        )}
      </div>
    </div>
  )
}
