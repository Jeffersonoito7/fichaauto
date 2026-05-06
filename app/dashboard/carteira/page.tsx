'use client'
import { useState } from 'react'
import { Wallet, Zap, CreditCard, Copy, CheckCircle2, Clock, ArrowUpRight, ArrowDownLeft, Loader2 } from 'lucide-react'

const RECARGAS = [
  { id: 'r5',  consultas: 5,  preco: 129.90, destaque: false, economia: null },
  { id: 'r10', consultas: 10, preco: 197.00, destaque: true,  economia: 'Economize R$ 62,90' },
  { id: 'r20', consultas: 20, preco: 347.00, destaque: false, economia: 'Economize R$ 151,00' },
]

const HISTORICO = [
  { tipo: 'debito',  desc: 'Consulta PKG5A23',  valor: '-1 consulta', data: '06/05/2026 14:33', badge: 'Completa' },
  { tipo: 'credito', desc: 'Recarga via Pix',   valor: '+10 consultas',data: '01/05/2026 09:10', badge: 'Plano' },
  { tipo: 'debito',  desc: 'Consulta ABC1D23',  valor: '-1 consulta', data: '29/04/2026 16:45', badge: 'Completa' },
  { tipo: 'debito',  desc: 'Consulta XYZ9B87',  valor: '-1 consulta', data: '25/04/2026 11:20', badge: 'Completa' },
]

const PIX_MOCK = {
  qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  copiaCola: '00020126580014br.gov.bcb.pix0136a629532e-7693-4846-b028-f142882cf65452040000530398654071297.005802BR5913Ficha Auto BR6008Petrolina62070503***6304D2BB',
  expira: '30 minutos',
}

export default function CarteiraPage() {
  const [step, setStep] = useState<'escolha' | 'pix' | 'confirmado'>('escolha')
  const [selecionado, setSelecionado] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)
  const [loading, setLoading] = useState(false)

  const consultasAtual = 7
  const plano = 'Mensal'
  const renovacao = '01/06/2026'

  function copiarPix() {
    navigator.clipboard.writeText(PIX_MOCK.copiaCola)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 3000)
  }

  async function gerarPix() {
    setLoading(true)
    await new Promise(r => setTimeout(r, 1200))
    setLoading(false)
    setStep('pix')
  }

  if (step === 'confirmado') {
    return (
      <div className="max-w-md mx-auto py-12 text-center">
        <div className="w-16 h-16 bg-brand-green-light rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-brand-green" />
        </div>
        <h2 className="text-xl font-bold text-brand-dark mb-2">Recarga confirmada!</h2>
        <p className="text-brand-gray text-sm mb-6">Suas consultas foram adicionadas à sua conta.</p>
        <button onClick={() => setStep('escolha')} className="btn-primary">Voltar à carteira</button>
      </div>
    )
  }

  if (step === 'pix') {
    const recarga = RECARGAS.find(r => r.id === selecionado)!
    return (
      <div className="max-w-md mx-auto">
        <h1 className="text-xl font-bold text-brand-dark mb-6">Pagamento via Pix</h1>
        <div className="card p-6 text-center mb-4">
          <div className="bg-brand-blue text-white rounded-xl p-4 mb-4">
            <p className="text-sm opacity-80">Valor a pagar</p>
            <p className="text-3xl font-extrabold">R$ {recarga.preco.toFixed(2).replace('.', ',')}</p>
            <p className="text-sm opacity-80 mt-1">{recarga.consultas} consultas completas</p>
          </div>

          {/* QR Code placeholder */}
          <div className="w-48 h-48 bg-brand-gray-light rounded-2xl flex items-center justify-center mx-auto mb-4 border-4 border-brand-blue">
            <div className="text-center">
              <CreditCard className="w-12 h-12 text-brand-blue mx-auto mb-2" />
              <p className="text-xs text-brand-gray">QR Code Pix</p>
              <p className="text-xs text-brand-gray">(gerado pela API de pagamento)</p>
            </div>
          </div>

          <p className="text-xs text-brand-gray mb-3 flex items-center justify-center gap-1">
            <Clock className="w-3 h-3" /> Expira em {PIX_MOCK.expira}
          </p>

          <div className="bg-brand-gray-light rounded-xl p-3 mb-4">
            <p className="text-xs text-brand-gray mb-1">Pix Copia e Cola</p>
            <p className="text-xs font-mono text-brand-dark break-all line-clamp-2">{PIX_MOCK.copiaCola}</p>
          </div>

          <button onClick={copiarPix} className={`${copiado ? 'btn-green' : 'btn-outline'} w-full mb-3`}>
            {copiado ? <><CheckCircle2 className="w-4 h-4" /> Copiado!</> : <><Copy className="w-4 h-4" /> Copiar código Pix</>}
          </button>

          <button onClick={() => { setStep('confirmado') }} className="btn-primary w-full">
            Já paguei — confirmar
          </button>
        </div>

        <button onClick={() => setStep('escolha')} className="btn-ghost w-full text-sm">
          Voltar
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-dark mb-1">Carteira</h1>
        <p className="text-brand-gray text-sm">Gerencie seu saldo e recarregue via Pix</p>
      </div>

      {/* Saldo */}
      <div className="gradient-brand rounded-2xl p-6 text-white mb-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-white/60 text-sm">Consultas disponíveis</p>
            <p className="text-5xl font-extrabold mt-1">{consultasAtual}</p>
            <p className="text-white/60 text-sm mt-1">de 10 do plano mensal</p>
          </div>
          <div className="text-right">
            <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">
              Plano {plano}
            </span>
            <p className="text-white/60 text-xs mt-2">Renova em {renovacao}</p>
          </div>
        </div>
        <div className="mt-4 bg-white/10 rounded-full h-2">
          <div className="bg-brand-green h-2 rounded-full" style={{ width: `${(consultasAtual / 10) * 100}%` }} />
        </div>
        <p className="text-white/50 text-xs mt-1">{consultasAtual} de 10 consultas restantes</p>
      </div>

      {/* Recarregar */}
      <div className="card p-6 mb-6">
        <h2 className="font-semibold text-brand-dark mb-1">Recarregar consultas</h2>
        <p className="text-brand-gray text-sm mb-4">Pague via Pix e receba as consultas instantaneamente</p>

        <div className="space-y-3">
          {RECARGAS.map(r => (
            <button
              key={r.id}
              onClick={() => setSelecionado(r.id === selecionado ? null : r.id)}
              className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                selecionado === r.id
                  ? 'border-brand-blue bg-brand-blue-light'
                  : 'border-brand-border hover:border-brand-blue/40 bg-white'
              } ${r.destaque ? 'ring-2 ring-brand-green ring-offset-1' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${r.destaque ? 'bg-brand-green text-white' : 'bg-brand-blue-light'}`}>
                  <Zap className={`w-5 h-5 ${r.destaque ? 'text-white' : 'text-brand-blue'}`} />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-brand-dark">{r.consultas} consultas completas</p>
                  {r.economia && <p className="text-xs text-brand-green">{r.economia}</p>}
                  {r.destaque && <p className="text-xs text-brand-green font-medium">✦ Mais popular</p>}
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-extrabold text-brand-blue">R$ {r.preco.toFixed(2).replace('.', ',')}</p>
                <p className="text-xs text-brand-gray">R$ {(r.preco / r.consultas).toFixed(2).replace('.', ',')} / consulta</p>
              </div>
            </button>
          ))}
        </div>

        <button
          disabled={!selecionado || loading}
          onClick={gerarPix}
          className="btn-green w-full mt-4 h-12"
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando Pix...</>
            : <><CreditCard className="w-4 h-4" /> Gerar Pix para pagamento</>
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
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${h.tipo === 'credito' ? 'bg-brand-green-light' : 'bg-brand-blue-light'}`}>
                  {h.tipo === 'credito'
                    ? <ArrowDownLeft className="w-4 h-4 text-brand-green" />
                    : <ArrowUpRight className="w-4 h-4 text-brand-blue" />
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
                <span className="badge-info">{h.badge}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
