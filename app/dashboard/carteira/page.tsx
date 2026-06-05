'use client'
import { useState, useEffect, useRef } from 'react'
import {
  Wallet, Zap, Copy, CheckCircle2, Clock,
  ArrowUpRight, ArrowDownLeft, Loader2, QrCode, RefreshCw
} from 'lucide-react'
import { createClient } from '@/lib/supabase-client'

const RECARGAS = [
  { id: 'r5',  consultas: 5,  preco: 129.90, destaque: false, economia: null },
  { id: 'r10', consultas: 10, preco: 197.00, destaque: true,  economia: 'Economize R$ 62,90' },
  { id: 'r20', consultas: 20, preco: 347.00, destaque: false, economia: 'Economize R$ 151,00' },
]

const HISTORICO = [
  { tipo: 'debito',  desc: 'Consulta PKG5A23', valor: '-1 consulta',  data: '06/05/2026 14:33', badge: 'Completa' },
  { tipo: 'credito', desc: 'Recarga via Pix',  valor: '+10 consultas', data: '01/05/2026 09:10', badge: 'Pix' },
  { tipo: 'debito',  desc: 'Consulta ABC1D23', valor: '-1 consulta',  data: '29/04/2026 16:45', badge: 'Completa' },
]

interface PixData {
  txid: string
  valor: number
  consultas: number
  qrCode: string
  copiaECola: string
  expira: string
}

export default function CarteiraPage() {
  const [step, setStep]           = useState<'escolha' | 'pix' | 'confirmado'>('escolha')
  const [selecionado, setSel]     = useState<string | null>(null)
  const [copiado, setCopiado]     = useState(false)
  const [loading, setLoading]     = useState(false)
  const [pixData, setPixData]     = useState<PixData | null>(null)
  const [erro, setErro]           = useState<string | null>(null)
  const [verificando, setVerif]   = useState(false)
  const [consultasAtual, setSaldo] = useState<number | null>(null)
  const pollRef                   = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from('perfis' as any)
        .select('saldo_consultas')
        .eq('user_id', user.id)
        .single()
        .then(({ data }: { data: any }) => {
          setSaldo(data?.saldo_consultas ?? 0)
        })
    })
  }, [])

  // Polling para detectar pagamento confirmado
  useEffect(() => {
    if (step !== 'pix' || !pixData?.txid) return
    pollRef.current = setInterval(async () => {
      try {
        const res  = await fetch(`/api/pix/status/${pixData.txid}`)
        const data = await res.json()
        if (data.status === 'pago') {
          clearInterval(pollRef.current!)
          setStep('confirmado')
          const supabase = createClient()
          supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) return
            supabase.from('perfis' as any).select('saldo_consultas').eq('user_id', user.id).single()
              .then(({ data: p }: { data: any }) => setSaldo(p?.saldo_consultas ?? 0))
          })
        }
      } catch { /* ignora erros de rede no poll */ }
    }, 5000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [step, pixData?.txid])

  function copiarPix() {
    if (!pixData) return
    navigator.clipboard.writeText(pixData.copiaECola)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 3000)
  }

  async function gerarPix() {
    if (!selecionado) return
    setLoading(true)
    setErro(null)
    try {
      const res  = await fetch('/api/pix/gerar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planoId: selecionado, userId: null }),
      })
      const data = await res.json()
      if (!res.ok || data.erro) throw new Error(data.erro ?? 'Falha ao gerar PIX')
      setPixData(data)
      setStep('pix')
    } catch (e: any) {
      setErro(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function verificarManual() {
    if (!pixData?.txid) return
    setVerif(true)
    try {
      const res  = await fetch(`/api/pix/status/${pixData.txid}`)
      const data = await res.json()
      if (data.status === 'pago') {
        setStep('confirmado')
        const supabase = createClient()
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (!user) return
          supabase.from('perfis').select('saldo_consultas').eq('user_id', user.id).single()
            .then(({ data: p }) => setSaldo(p?.saldo_consultas ?? 0))
        })
      } else setErro('Pagamento ainda não identificado. Aguarde alguns instantes.')
    } catch { setErro('Erro ao verificar. Tente novamente.') }
    finally { setVerif(false) }
  }

  // ─── Tela confirmado ──────────────────────────────────────────────────────
  if (step === 'confirmado') {
    return (
      <div className="max-w-md mx-auto py-12 text-center">
        <div className="w-20 h-20 bg-brand-green-light rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-10 h-10 text-brand-green" />
        </div>
        <h2 className="text-2xl font-bold text-brand-dark mb-2">Pagamento confirmado!</h2>
        <p className="text-brand-gray mb-1">
          <span className="font-bold text-brand-green">{pixData?.consultas} consultas</span> adicionadas à sua conta.
        </p>
        <p className="text-brand-gray text-sm mb-8">Você já pode fazer novas consultas completas.</p>
        <button onClick={() => { setStep('escolha'); setPixData(null); setSel(null) }} className="btn-primary">
          Voltar à carteira
        </button>
      </div>
    )
  }

  // ─── Tela PIX ─────────────────────────────────────────────────────────────
  if (step === 'pix' && pixData) {
    const recarga = RECARGAS.find(r => r.id === selecionado)!
    return (
      <div className="max-w-md mx-auto">
        <h1 className="text-xl font-bold text-brand-dark mb-6">Pagamento via Pix</h1>

        <div className="card p-6 text-center mb-4">
          {/* Valor */}
          <div className="gradient-brand rounded-xl p-4 mb-5 text-white">
            <p className="text-sm opacity-75">Valor a pagar</p>
            <p className="text-4xl font-extrabold">
              R$ {pixData.valor.toFixed(2).replace('.', ',')}
            </p>
            <p className="text-sm opacity-75 mt-1">{pixData.consultas} consultas completas</p>
          </div>

          {/* QR Code */}
          {pixData.qrCode ? (
            <img
              src={pixData.qrCode}
              alt="QR Code Pix"
              className="w-52 h-52 mx-auto mb-4 rounded-2xl border-4 border-brand-blue"
            />
          ) : (
            <div className="w-52 h-52 bg-brand-gray-light rounded-2xl flex items-center justify-center mx-auto mb-4 border-4 border-brand-blue">
              <QrCode className="w-16 h-16 text-brand-blue opacity-40" />
            </div>
          )}

          <p className="text-xs text-brand-gray mb-4 flex items-center justify-center gap-1">
            <Clock className="w-3 h-3" /> Expira em {pixData.expira}
          </p>

          {/* Copia e cola */}
          <div className="bg-brand-gray-light rounded-xl p-3 mb-4 text-left">
            <p className="text-xs text-brand-gray mb-1 font-medium">Pix Copia e Cola</p>
            <p className="text-xs font-mono text-brand-dark break-all line-clamp-3 leading-relaxed">
              {pixData.copiaECola}
            </p>
          </div>

          <button
            onClick={copiarPix}
            className={`w-full h-11 rounded-xl font-semibold text-sm mb-3 flex items-center justify-center gap-2 transition-all ${
              copiado
                ? 'bg-brand-green text-white'
                : 'bg-brand-blue-light text-brand-blue border border-brand-blue/30 hover:bg-brand-blue hover:text-white'
            }`}
          >
            {copiado
              ? <><CheckCircle2 className="w-4 h-4" /> Copiado!</>
              : <><Copy className="w-4 h-4" /> Copiar código Pix</>
            }
          </button>

          {erro && <p className="text-xs text-brand-danger mb-3">{erro}</p>}

          <button
            onClick={verificarManual}
            disabled={verificando}
            className="btn-primary w-full h-11 mb-2"
          >
            {verificando
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Verificando...</>
              : <><RefreshCw className="w-4 h-4" /> Já paguei — verificar</>
            }
          </button>
        </div>

        <p className="text-center text-xs text-brand-gray mb-2">
          O pagamento é detectado automaticamente em até 1 minuto.
        </p>
        <button
          onClick={() => { setStep('escolha'); setPixData(null) }}
          className="w-full text-sm text-brand-gray hover:text-brand-dark transition-colors py-2"
        >
          Voltar e escolher outro pacote
        </button>
      </div>
    )
  }

  // ─── Tela escolha ─────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-dark mb-1">Carteira</h1>
        <p className="text-brand-gray text-sm">Recarregue via Pix e receba créditos instantaneamente</p>
      </div>

      {/* Saldo */}
      <div className="gradient-brand rounded-2xl p-6 text-white mb-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-white/60 text-sm">Consultas disponíveis</p>
            <p className="text-5xl font-extrabold mt-1">
              {consultasAtual === null ? <Loader2 className="w-8 h-8 animate-spin opacity-60" /> : consultasAtual}
            </p>
            <p className="text-white/60 text-sm mt-1">créditos restantes</p>
          </div>
          <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center">
            <Wallet className="w-7 h-7 text-white" />
          </div>
        </div>
      </div>

      {/* Pacotes */}
      <div className="card p-6 mb-6">
        <h2 className="font-bold text-brand-dark mb-1">Escolha um pacote</h2>
        <p className="text-brand-gray text-sm mb-4">Pague via Pix e receba as consultas na hora</p>

        <div className="space-y-3 mb-4">
          {RECARGAS.map(r => (
            <button
              key={r.id}
              onClick={() => setSel(r.id === selecionado ? null : r.id)}
              className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left ${
                selecionado === r.id
                  ? 'border-brand-blue bg-brand-blue-light'
                  : 'border-brand-border hover:border-brand-blue/40 bg-white'
              } ${r.destaque ? 'ring-2 ring-brand-green ring-offset-1' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  r.destaque ? 'bg-brand-green' : 'bg-brand-blue-light'
                }`}>
                  <Zap className={`w-5 h-5 ${r.destaque ? 'text-white' : 'text-brand-blue'}`} />
                </div>
                <div>
                  <p className="font-semibold text-brand-dark">{r.consultas} consultas completas</p>
                  {r.destaque && <p className="text-xs text-brand-green font-medium">Mais popular</p>}
                  {r.economia  && <p className="text-xs text-brand-green">{r.economia}</p>}
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-extrabold text-brand-blue">
                  R$ {r.preco.toFixed(2).replace('.', ',')}
                </p>
                <p className="text-xs text-brand-gray">
                  R$ {(r.preco / r.consultas).toFixed(2).replace('.', ',')} / consulta
                </p>
              </div>
            </button>
          ))}
        </div>

        {erro && <p className="text-xs text-brand-danger mb-3 text-center">{erro}</p>}

        <button
          disabled={!selecionado || loading}
          onClick={gerarPix}
          className="btn-green w-full h-12 text-base disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading
            ? <><Loader2 className="w-5 h-5 animate-spin" /> Gerando Pix...</>
            : <><QrCode className="w-5 h-5" /> Gerar QR Code Pix</>
          }
        </button>
      </div>

      {/* Histórico */}
      <div className="card p-6">
        <h2 className="font-semibold text-brand-dark mb-4">Histórico de transações</h2>
        <div className="space-y-3">
          {HISTORICO.map((h, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-brand-border last:border-0">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  h.tipo === 'credito' ? 'bg-brand-green-light' : 'bg-brand-blue-light'
                }`}>
                  {h.tipo === 'credito'
                    ? <ArrowDownLeft className="w-4 h-4 text-brand-green" />
                    : <ArrowUpRight  className="w-4 h-4 text-brand-blue"  />
                  }
                </div>
                <div>
                  <p className="text-sm font-medium text-brand-dark">{h.desc}</p>
                  <p className="text-xs text-brand-gray">{h.data}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm font-bold ${h.tipo === 'credito' ? 'text-brand-green' : 'text-brand-dark'}`}>
                  {h.valor}
                </p>
                <span className="text-[10px] bg-brand-blue-light text-brand-blue px-2 py-0.5 rounded-full font-medium">
                  {h.badge}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
