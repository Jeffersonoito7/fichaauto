'use client'
import { useState, useEffect, useRef } from 'react'
import { Wallet, Copy, CheckCircle2, Loader2, QrCode, Car, User, Building2 } from 'lucide-react'
import { PRECO, PACK_QUANTIDADE, calcularPack, type TipoConsulta } from '@/lib/products'

type Opcao = { tipo: TipoConsulta; quantidade: 1 | 10 }

interface PixData {
  txid:           string
  valorPago:      number
  saldoCreditado: number
  qrCode:         string
  copiaECola:     string
}

const TIPOS: { id: TipoConsulta; label: string; icon: any; cor: string }[] = [
  { id: 'placa', label: 'Veículo (Placa)', icon: Car,       cor: 'bg-green-50 border-green-300 text-green-700'  },
  { id: 'cpf',   label: 'Pessoa (CPF)',    icon: User,      cor: 'bg-blue-50 border-blue-300 text-blue-700'     },
  { id: 'cnpj',  label: 'Empresa (CNPJ)', icon: Building2, cor: 'bg-purple-50 border-purple-300 text-purple-700'},
]

function moeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function CarteiraPage() {
  const [saldo, setSaldo]       = useState<number | null>(null)
  const [opcao, setOpcao]       = useState<Opcao | null>(null)
  const [step, setStep]         = useState<'escolha' | 'pix' | 'confirmado'>('escolha')
  const [pixData, setPixData]   = useState<PixData | null>(null)
  const [loading, setLoading]   = useState(false)
  const [copiado, setCopiado]   = useState(false)
  const [erro, setErro]         = useState<string | null>(null)
  const pollRef                 = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => { if (typeof d?.saldo === 'number') setSaldo(d.saldo) })
      .catch(() => {})
  }, [])

  // Polling após gerar PIX
  useEffect(() => {
    if (step !== 'pix' || !pixData?.txid) return
    pollRef.current = setInterval(async () => {
      try {
        const res  = await fetch(`/api/pix/status/${pixData.txid}`)
        const data = await res.json()
        if (data.status === 'pago') {
          clearInterval(pollRef.current!)
          setStep('confirmado')
          fetch('/api/auth/me').then(r => r.json()).then(d => { if (typeof d?.saldo === 'number') setSaldo(d.saldo) })
        }
      } catch { /* ignora */ }
    }, 5000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [step, pixData])

  async function gerarPix() {
    if (!opcao) return
    setLoading(true)
    setErro(null)
    try {
      const res  = await fetch('/api/pix/gerar', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ tipo: opcao.tipo, quantidade: opcao.quantidade }),
      })
      const data = await res.json()
      if (!res.ok) { setErro(data.erro ?? 'Erro ao gerar PIX'); return }
      setPixData(data)
      setStep('pix')
    } catch {
      setErro('Falha ao conectar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  function copiar() {
    if (!pixData?.copiaECola) return
    navigator.clipboard.writeText(pixData.copiaECola)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 3000)
  }

  // ── Tela de confirmação ────────────────────────────────────────────────────
  if (step === 'confirmado') return (
    <div className="max-w-md mx-auto text-center mt-16">
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
        <CheckCircle2 className="w-8 h-8 text-green-600" />
      </div>
      <h2 className="text-xl font-bold text-brand-dark mb-2">Pagamento confirmado!</h2>
      <p className="text-brand-gray mb-1">
        {moeda(pixData?.saldoCreditado ?? 0)} adicionados ao seu saldo.
      </p>
      <p className="text-2xl font-black text-brand-green mb-6">
        Saldo atual: {saldo !== null ? moeda(saldo) : '—'}
      </p>
      <button onClick={() => { setStep('escolha'); setOpcao(null); setPixData(null) }} className="btn-primary">
        Recarregar novamente
      </button>
    </div>
  )

  // ── Tela do QR Code ────────────────────────────────────────────────────────
  if (step === 'pix' && pixData) return (
    <div className="max-w-md mx-auto">
      <div className="card p-6 text-center">
        <QrCode className="w-8 h-8 text-brand-green mx-auto mb-3" />
        <h2 className="text-lg font-bold text-brand-dark mb-1">Pague via PIX</h2>
        <p className="text-brand-gray text-sm mb-4">
          Valor: <strong className="text-brand-dark">{moeda(pixData.valorPago)}</strong>
          {pixData.saldoCreditado > pixData.valorPago && (
            <span className="ml-2 text-green-600 font-semibold">
              ({moeda(pixData.saldoCreditado)} em saldo — 10% de bônus)
            </span>
          )}
        </p>

        {pixData.qrCode && (
          <img src={pixData.qrCode} alt="QR Code PIX" className="w-48 h-48 mx-auto mb-4 rounded-xl border" />
        )}

        <div className="bg-brand-off-white rounded-xl p-3 mb-4">
          <p className="text-xs text-brand-gray mb-1">Copia e Cola</p>
          <p className="text-xs font-mono text-brand-dark break-all line-clamp-2">{pixData.copiaECola}</p>
        </div>

        <button
          onClick={copiar}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all ${
            copiado ? 'bg-green-600 text-white' : 'btn-primary'
          }`}
        >
          {copiado ? <><CheckCircle2 className="w-4 h-4" /> Copiado!</> : <><Copy className="w-4 h-4" /> Copiar código PIX</>}
        </button>

        <p className="text-xs text-brand-gray mt-4 flex items-center justify-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" /> Aguardando confirmação do pagamento...
        </p>
        <button onClick={() => { setStep('escolha'); setOpcao(null) }} className="text-xs text-brand-gray hover:underline mt-3 block mx-auto">
          Cancelar e voltar
        </button>
      </div>
    </div>
  )

  // ── Tela de escolha ────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto">
      {/* Saldo atual */}
      <div className="rounded-2xl p-6 mb-6 text-white" style={{ background: 'linear-gradient(135deg, #00703C, #00A651)' }}>
        <div className="flex items-center gap-3 mb-1">
          <Wallet className="w-5 h-5 text-white/70" />
          <p className="text-white/80 text-sm">Saldo disponível</p>
        </div>
        <p className="text-4xl font-black">{saldo !== null ? moeda(saldo) : '—'}</p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-white/70">
          <span>Placa: {moeda(PRECO.placa)}/consulta</span>
          <span>CPF: {moeda(PRECO.cpf)}/consulta</span>
          <span>CNPJ: {moeda(PRECO.cnpj)}/consulta</span>
        </div>
      </div>

      <h2 className="text-lg font-bold text-brand-dark mb-4">Escolha o que deseja comprar</h2>

      {/* Grade de opções */}
      <div className="space-y-3 mb-6">
        {TIPOS.map(({ id, label, icon: Icon, cor }) => {
          const pack = calcularPack(id)
          return (
            <div key={id} className="card p-4">
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold mb-3 ${cor}`}>
                <Icon className="w-3.5 h-3.5" />
                {label}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {/* Avulso */}
                <button
                  onClick={() => setOpcao({ tipo: id, quantidade: 1 })}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    opcao?.tipo === id && opcao?.quantidade === 1
                      ? 'border-brand-green bg-brand-green-light'
                      : 'border-brand-border hover:border-brand-green/50'
                  }`}
                >
                  <p className="text-xs text-brand-gray mb-1">1 consulta</p>
                  <p className="text-xl font-black text-brand-dark">{moeda(PRECO[id])}</p>
                  <p className="text-xs text-brand-gray mt-0.5">Avulso</p>
                </button>

                {/* Pack 10 */}
                <button
                  onClick={() => setOpcao({ tipo: id, quantidade: 10 })}
                  className={`p-3 rounded-xl border-2 text-left relative transition-all ${
                    opcao?.tipo === id && opcao?.quantidade === 10
                      ? 'border-brand-green bg-brand-green-light'
                      : 'border-brand-border hover:border-brand-green/50'
                  }`}
                >
                  <span className="absolute -top-2 right-2 bg-brand-green text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    10% OFF
                  </span>
                  <p className="text-xs text-brand-gray mb-1">{PACK_QUANTIDADE} consultas</p>
                  <p className="text-xl font-black text-brand-dark">{moeda(pack.comDesconto)}</p>
                  <p className="text-xs text-brand-gray line-through mt-0.5">{moeda(pack.total)}</p>
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {erro && <p className="text-red-600 text-sm mb-3 text-center">{erro}</p>}

      <button
        onClick={gerarPix}
        disabled={!opcao || loading}
        className="w-full btn-primary flex items-center justify-center gap-2 py-4 text-base disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando PIX...</>
          : opcao
            ? <>Gerar PIX — {moeda(opcao.quantidade === 1 ? PRECO[opcao.tipo] : calcularPack(opcao.tipo).comDesconto)}</>
            : 'Selecione uma opção acima'
        }
      </button>
    </div>
  )
}
