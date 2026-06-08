'use client'
import { useState, useEffect, useRef } from 'react'
import { Wallet, Copy, CheckCircle2, Loader2, QrCode, Car, User, Building2, CreditCard } from 'lucide-react'
import { PRECO, PACK_QUANTIDADE, calcularPack, CREDITO, type TipoConsulta } from '@/lib/products'

type Opcao =
  | { produto: 1 | 2; tipo: TipoConsulta; quantidade: 1 | 10 }
  | { produto: 3; tipo: 'credito_pack' | 'credito_cpf' | 'credito_cnpj' }

interface PixData {
  txid:               string
  valorPago:          number
  saldoCreditado:     number | null
  creditosCreditados: number | null
  qrCode:             string
  copiaECola:         string
}

const TIPOS_P12: { id: TipoConsulta; label: string; icon: any; cor: string }[] = [
  { id: 'placa', label: 'Produto 1 — Veículo (Placa)', icon: Car,       cor: 'bg-green-50 border-green-300 text-green-700'  },
  { id: 'cpf',   label: 'Produto 2 — Pessoa (CPF)',    icon: User,      cor: 'bg-blue-50 border-blue-300 text-blue-700'     },
  { id: 'cnpj',  label: 'Produto 2 — Empresa (CNPJ)', icon: Building2, cor: 'bg-purple-50 border-purple-300 text-purple-700'},
]

function moeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function CarteiraPage() {
  const [saldo, setSaldo]               = useState<number | null>(null)
  const [creditosCredito, setCreditosC] = useState<number | null>(null)
  const [podeCredito, setPodeCredito]   = useState(false)
  const [opcao, setOpcao]               = useState<Opcao | null>(null)
  const [step, setStep]                 = useState<'escolha' | 'pix' | 'confirmado'>('escolha')
  const [pixData, setPixData]           = useState<PixData | null>(null)
  const [loading, setLoading]           = useState(false)
  const [copiado, setCopiado]           = useState(false)
  const [erro, setErro]                 = useState<string | null>(null)
  const pollRef                         = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        if (typeof d?.saldo === 'number') setSaldo(d.saldo)
        if (typeof d?.creditos_credito === 'number') setCreditosC(d.creditos_credito)
        setPodeCredito(!!d?.pode_credito || d?.role === 'super_admin')
      })
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
          fetch('/api/auth/me').then(r => r.json()).then(d => {
            if (typeof d?.saldo === 'number') setSaldo(d.saldo)
            if (typeof d?.creditos_credito === 'number') setCreditosC(d.creditos_credito)
          })
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
      const body = opcao.produto === 3
        ? { tipo: opcao.tipo }
        : { tipo: (opcao as any).tipo, quantidade: (opcao as any).quantidade }
      const res  = await fetch('/api/pix/gerar', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
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
      {pixData?.creditosCreditados ? (
        <p className="text-brand-gray mb-1">{pixData.creditosCreditados} consulta(s) de crédito adicionadas.</p>
      ) : (
        <p className="text-brand-gray mb-1">{moeda(pixData?.saldoCreditado ?? 0)} adicionados ao seu saldo.</p>
      )}
      <p className="text-2xl font-black text-brand-green mb-6">
        Saldo: {saldo !== null ? moeda(saldo) : '—'}
        {creditosCredito !== null && creditosCredito > 0 && (
          <span className="block text-base text-brand-blue font-semibold mt-1">{creditosCredito} crédito(s) de análise</span>
        )}
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
          {pixData.creditosCreditados && (
            <span className="ml-2 text-blue-600 font-semibold">→ {pixData.creditosCreditados} consulta(s) de crédito</span>
          )}
          {!pixData.creditosCreditados && pixData.saldoCreditado && pixData.saldoCreditado > pixData.valorPago && (
            <span className="ml-2 text-green-600 font-semibold">({moeda(pixData.saldoCreditado)} em saldo — 10% off)</span>
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

  function valorOpcao(o: Opcao): number {
    if (o.produto === 3) {
      if (o.tipo === 'credito_pack') return CREDITO.packValor
      if (o.tipo === 'credito_cpf')  return CREDITO.avulsoCpf
      return CREDITO.avulsoCnpj
    }
    return o.quantidade === 1 ? PRECO[o.tipo] : calcularPack(o.tipo).comDesconto
  }

  function isSelected(o: Opcao): boolean {
    if (!opcao) return false
    if (o.produto !== opcao.produto) return false
    if (o.produto === 3 && opcao.produto === 3) return o.tipo === opcao.tipo
    if (o.produto !== 3 && opcao.produto !== 3) return o.tipo === opcao.tipo && o.quantidade === opcao.quantidade
    return false
  }

  // ── Tela de escolha ────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto">
      {/* Saldos */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="rounded-2xl p-5 text-white" style={{ background: 'linear-gradient(135deg, #00703C, #00A651)' }}>
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-4 h-4 text-white/70" />
            <p className="text-white/80 text-xs">Saldo Produtos 1 e 2</p>
          </div>
          <p className="text-3xl font-black">{saldo !== null ? moeda(saldo) : '—'}</p>
          <p className="text-white/60 text-xs mt-1">Placa · CPF · CNPJ</p>
        </div>
        {podeCredito && (
          <div className="rounded-2xl p-5 text-white" style={{ background: 'linear-gradient(135deg, #1D4ED8, #3B82F6)' }}>
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="w-4 h-4 text-white/70" />
              <p className="text-white/80 text-xs">Créditos Produto 3</p>
            </div>
            <p className="text-3xl font-black">{creditosCredito !== null ? creditosCredito : '—'}</p>
            <p className="text-white/60 text-xs mt-1">Análise de Crédito</p>
          </div>
        )}
      </div>

      <h2 className="text-lg font-bold text-brand-dark mb-4">Escolha o que deseja comprar</h2>

      {/* Produtos 1 e 2 */}
      <div className="space-y-3 mb-4">
        {TIPOS_P12.map(({ id, label, icon: Icon, cor }) => {
          const pack = calcularPack(id)
          return (
            <div key={id} className="card p-4">
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold mb-3 ${cor}`}>
                <Icon className="w-3.5 h-3.5" />{label}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setOpcao({ produto: id === 'placa' ? 1 : 2, tipo: id, quantidade: 1 })}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${isSelected({ produto: id === 'placa' ? 1 : 2, tipo: id, quantidade: 1 }) ? 'border-brand-green bg-brand-green-light' : 'border-brand-border hover:border-brand-green/50'}`}
                >
                  <p className="text-xs text-brand-gray mb-1">1 consulta</p>
                  <p className="text-xl font-black text-brand-dark">{moeda(PRECO[id])}</p>
                  <p className="text-xs text-brand-gray mt-0.5">Avulso</p>
                </button>
                <button
                  onClick={() => setOpcao({ produto: id === 'placa' ? 1 : 2, tipo: id, quantidade: 10 })}
                  className={`p-3 rounded-xl border-2 text-left relative transition-all ${isSelected({ produto: id === 'placa' ? 1 : 2, tipo: id, quantidade: 10 }) ? 'border-brand-green bg-brand-green-light' : 'border-brand-border hover:border-brand-green/50'}`}
                >
                  <span className="absolute -top-2 right-2 bg-brand-green text-white text-[10px] font-bold px-2 py-0.5 rounded-full">10% OFF</span>
                  <p className="text-xs text-brand-gray mb-1">{PACK_QUANTIDADE} consultas</p>
                  <p className="text-xl font-black text-brand-dark">{moeda(pack.comDesconto)}</p>
                  <p className="text-xs text-brand-gray line-through mt-0.5">{moeda(pack.total)}</p>
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Produto 3: Análise de Crédito */}
      {podeCredito && (
        <div className="card p-4 mb-6 border-2 border-brand-blue/20">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold mb-3 bg-blue-50 border-blue-300 text-blue-700">
            <CreditCard className="w-3.5 h-3.5" /> Produto 3 — Análise de Crédito (SPC/Serasa/Bancário)
          </div>
          <div className="grid grid-cols-3 gap-3">
            {/* Pack */}
            <button
              onClick={() => setOpcao({ produto: 3, tipo: 'credito_pack' })}
              className={`p-3 rounded-xl border-2 text-left relative transition-all ${isSelected({ produto: 3, tipo: 'credito_pack' }) ? 'border-brand-blue bg-blue-50' : 'border-brand-border hover:border-brand-blue/50'}`}
            >
              <span className="absolute -top-2 right-1 bg-brand-blue text-white text-[10px] font-bold px-2 py-0.5 rounded-full">PACK</span>
              <p className="text-xs text-brand-gray mb-1">{CREDITO.packQtd} consultas</p>
              <p className="text-lg font-black text-brand-dark">{moeda(CREDITO.packValor)}</p>
              <p className="text-xs text-brand-gray mt-0.5">{moeda(CREDITO.custoPorUso)}/consulta</p>
            </button>
            {/* Avulso CPF */}
            <button
              onClick={() => setOpcao({ produto: 3, tipo: 'credito_cpf' })}
              className={`p-3 rounded-xl border-2 text-left transition-all ${isSelected({ produto: 3, tipo: 'credito_cpf' }) ? 'border-brand-blue bg-blue-50' : 'border-brand-border hover:border-brand-blue/50'}`}
            >
              <p className="text-xs text-brand-gray mb-1">1 CPF avulso</p>
              <p className="text-lg font-black text-brand-dark">{moeda(CREDITO.avulsoCpf)}</p>
              <p className="text-xs text-brand-gray mt-0.5">sem pack</p>
            </button>
            {/* Avulso CNPJ */}
            <button
              onClick={() => setOpcao({ produto: 3, tipo: 'credito_cnpj' })}
              className={`p-3 rounded-xl border-2 text-left transition-all ${isSelected({ produto: 3, tipo: 'credito_cnpj' }) ? 'border-brand-blue bg-blue-50' : 'border-brand-border hover:border-brand-blue/50'}`}
            >
              <p className="text-xs text-brand-gray mb-1">1 CNPJ avulso</p>
              <p className="text-lg font-black text-brand-dark">{moeda(CREDITO.avulsoCnpj)}</p>
              <p className="text-xs text-brand-gray mt-0.5">sem pack</p>
            </button>
          </div>
        </div>
      )}

      {erro && <p className="text-red-600 text-sm mb-3 text-center">{erro}</p>}

      <button
        onClick={gerarPix}
        disabled={!opcao || loading}
        className="w-full btn-primary flex items-center justify-center gap-2 py-4 text-base disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando PIX...</>
          : opcao
            ? <>Gerar PIX — {moeda(valorOpcao(opcao))}</>
            : 'Selecione uma opção acima'
        }
      </button>
    </div>
  )
}
