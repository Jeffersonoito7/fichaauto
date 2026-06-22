'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Car, User, ArrowLeft, Loader2, CheckCircle2,
  Copy, ChevronRight, Wallet, Zap,
} from 'lucide-react'
import Image from 'next/image'

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const PACOTES = [
  {
    id: 'veiculo_10',
    produto: 'veiculo',
    label: 'Veicular',
    qtd: 10,
    valorPago: 319.00,
    saldoCreditado: 369.00,
    economiza: 50.00,
    cor: 'green',
    icon: Car,
  },
  {
    id: 'veiculo_50',
    produto: 'veiculo',
    label: 'Veicular',
    qtd: 50,
    valorPago: 1390.00,
    saldoCreditado: 1845.00,
    economiza: 455.00,
    cor: 'green',
    icon: Car,
  },
  {
    id: 'veiculo_100',
    produto: 'veiculo',
    label: 'Veicular',
    qtd: 100,
    valorPago: 2490.00,
    saldoCreditado: 3690.00,
    economiza: 1200.00,
    cor: 'green',
    icon: Car,
  },
  {
    id: 'cpf_10',
    produto: 'cpf',
    label: 'CPF',
    qtd: 10,
    valorPago: 129.00,
    saldoCreditado: 149.00,
    economiza: 20.00,
    cor: 'blue',
    icon: User,
  },
  {
    id: 'cpf_50',
    produto: 'cpf',
    label: 'CPF',
    qtd: 50,
    valorPago: 549.00,
    saldoCreditado: 745.00,
    economiza: 196.00,
    cor: 'blue',
    icon: User,
  },
  {
    id: 'cpf_100',
    produto: 'cpf',
    label: 'CPF',
    qtd: 100,
    valorPago: 990.00,
    saldoCreditado: 1490.00,
    economiza: 500.00,
    cor: 'blue',
    icon: User,
  },
]

interface PagamentoGerado {
  txid: string
  pacote: string
  valorPago: number
  saldoCreditado: number
  qtd: number
  produto: string
  qrCode: string
  copiaECola: string
}

type Filtro = 'todos' | 'veiculo' | 'cpf'

export default function RecargaTenantPage() {
  const router = useRouter()
  const [filtro,    setFiltro]    = useState<Filtro>('todos')
  const [selecionado, setSelecionado] = useState<string | null>(null)
  const [loading,   setLoading]   = useState(false)
  const [erro,      setErro]      = useState('')
  const [pagamento, setPagamento] = useState<PagamentoGerado | null>(null)
  const [copiado,   setCopiado]   = useState(false)
  const [pago,      setPago]      = useState(false)
  const [polling,   setPolling]   = useState(false)

  const pacotesFiltrados = PACOTES.filter(p =>
    filtro === 'todos' ? true : p.produto === filtro
  )

  async function gerarPix() {
    if (!selecionado) return
    setLoading(true)
    setErro('')
    try {
      const res = await fetch('/api/tenant/recarga/gerar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pacote: selecionado }),
      })
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
    setPolling(true)
    const intervalo = setInterval(async () => {
      try {
        const res = await fetch(`/api/pix/status/${txid}`)
        const data = await res.json()
        if (data.status === 'pago') {
          clearInterval(intervalo)
          setPolling(false)
          setPago(true)
        }
      } catch { /* segue tentando */ }
    }, 4000)

    // Para de tentar depois de 65 minutos
    setTimeout(() => { clearInterval(intervalo); setPolling(false) }, 65 * 60 * 1000)
  }

  async function copiar() {
    if (!pagamento?.copiaECola) return
    await navigator.clipboard.writeText(pagamento.copiaECola)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 3000)
  }

  // Tela de confirmação de pagamento
  if (pago && pagamento) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-10 max-w-md w-full text-center shadow-sm border border-gray-100">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-2">Pagamento confirmado</h1>
          <p className="text-gray-500 text-sm mb-6">
            Saldo de <strong>{fmt(pagamento.saldoCreditado)}</strong> creditado na sua revenda.
          </p>
          <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 mb-6">
            {pagamento.qtd} consultas {pagamento.produto === 'veiculo' ? 'Veiculares' : 'CPF'} disponíveis para distribuir aos usuários.
          </div>
          <button
            onClick={() => router.push('/dashboard/tenant')}
            className="w-full h-12 rounded-xl bg-brand-green hover:bg-green-700 text-white font-bold flex items-center justify-center gap-2 transition-all"
          >
            Voltar ao painel <ChevronRight className="w-4 h-4" />
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
            <p className="text-xs text-gray-500 mt-1">
              {pagamento.qtd} consultas {pagamento.produto === 'veiculo' ? 'Veiculares' : 'CPF'} —
              saldo de {fmt(pagamento.saldoCreditado)}
            </p>
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

  // Tela de seleção de pacote
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-6 py-10">

        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => router.push('/dashboard/tenant')}
            className="w-9 h-9 rounded-xl hover:bg-white border border-gray-200 flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-gray-500" />
          </button>
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-brand-green" />
            <h1 className="text-xl font-black text-gray-900">Recarregar Saldo</h1>
          </div>
        </div>

        <p className="text-sm text-gray-500 mb-6">
          Selecione o pacote desejado. O saldo é creditado na revenda e pode ser distribuído aos usuários.
        </p>

        {/* Filtros */}
        <div className="flex gap-2 mb-6">
          {(['todos', 'veiculo', 'cpf'] as Filtro[]).map(f => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                filtro === f
                  ? 'bg-brand-green text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
              }`}
            >
              {f === 'todos' ? 'Todos' : f === 'veiculo' ? 'Veicular' : 'CPF'}
            </button>
          ))}
        </div>

        {/* Grid de pacotes */}
        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          {pacotesFiltrados.map(p => {
            const Icon = p.icon
            const selecionando = selecionado === p.id
            const corBorda = p.cor === 'green'
              ? selecionando ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300'
              : selecionando ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
            const corIcone = p.cor === 'green' ? 'text-green-600 bg-green-100' : 'text-blue-600 bg-blue-100'
            const corBadge = p.cor === 'green' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'

            return (
              <button
                key={p.id}
                onClick={() => setSelecionado(selecionando ? null : p.id)}
                className={`text-left p-5 rounded-2xl border-2 transition-all ${corBorda}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${corIcone}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-lg ${corBadge}`}>
                    {p.qtd} consultas
                  </span>
                </div>

                <p className="font-bold text-gray-900 mb-0.5">{p.label}</p>
                <p className="text-2xl font-black text-gray-900">{fmt(p.valorPago)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Saldo creditado: <span className="font-semibold text-gray-700">{fmt(p.saldoCreditado)}</span>
                </p>

                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-1.5">
                  <Zap className="w-3 h-3 text-amber-500" />
                  <span className="text-xs text-amber-600 font-semibold">
                    Economia de {fmt(p.economiza)}
                  </span>
                </div>
              </button>
            )
          })}
        </div>

        {erro && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 mb-4">
            {erro}
          </div>
        )}

        <button
          onClick={gerarPix}
          disabled={!selecionado || loading}
          className="w-full h-14 rounded-2xl bg-brand-green hover:bg-green-700 text-white font-bold text-base flex items-center justify-center gap-3 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
        >
          {loading
            ? <><Loader2 className="w-5 h-5 animate-spin" /> Gerando PIX...</>
            : <><Wallet className="w-5 h-5" /> Gerar PIX e pagar</>
          }
        </button>

        <p className="text-center text-xs text-gray-400 mt-4">
          Pagamento via Pix — confirmação em segundos — saldo não expira
        </p>
      </div>
    </div>
  )
}
