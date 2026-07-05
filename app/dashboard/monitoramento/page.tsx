'use client'
import { useState, useEffect, useCallback } from 'react'
import { Bell, BellOff, Car, Plus, Trash2, Loader2, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react'

interface Monitor {
  id: string
  documento: string
  descricao: string | null
  ativo: boolean
  ultimo_check: string | null
  created_at: string
}

interface Alerta {
  id: string
  documento: string
  campo_alterado: string
  valor_atual: string
  lido: boolean
  created_at: string
}

const CAMPO_LABEL: Record<string, string> = {
  restricaoRouboFurto:  'Roubo / Furto',
  restricaoRENAJUD:     'Restrição RENAJUD',
  indicioSinistro:      'Indício de Sinistro',
  restricaoFinanceira:  'Gravame / Alienação',
  leilao:               'Histórico de Leilão',
  situacaoVeiculo:      'Situação do Veículo',
}

function fmtData(iso: string | null) {
  if (!iso) return 'Nunca verificado'
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function MonitoramentoPage() {
  const [monitores, setMonitores]   = useState<Monitor[]>([])
  const [alertas, setAlertas]       = useState<Alerta[]>([])
  const [loading, setLoading]       = useState(true)
  const [placa, setPlaca]           = useState('')
  const [adicionando, setAdicionando] = useState(false)
  const [erroForm, setErroForm]     = useState('')
  const [tab, setTab]               = useState<'placas' | 'alertas'>('placas')

  const carregar = useCallback(async () => {
    setLoading(true)
    const [m, a] = await Promise.all([
      fetch('/api/monitoramento').then(r => r.json()).catch(() => []),
      fetch('/api/monitoramento/alertas').then(r => r.json()).catch(() => []),
    ])
    setMonitores(Array.isArray(m) ? m : [])
    setAlertas(Array.isArray(a) ? a : [])
    setLoading(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  async function adicionar(e: React.FormEvent) {
    e.preventDefault()
    setErroForm('')
    const p = placa.toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (!p || p.length < 7) { setErroForm('Placa inválida'); return }
    setAdicionando(true)
    const res = await fetch('/api/monitoramento', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ placa: p }),
    })
    const d = await res.json()
    if (!res.ok) { setErroForm(d.error ?? 'Erro ao adicionar'); setAdicionando(false); return }
    setPlaca('')
    setAdicionando(false)
    await carregar()
  }

  async function remover(id: string) {
    if (!confirm('Remover esta placa do monitoramento?')) return
    await fetch(`/api/monitoramento/${id}`, { method: 'DELETE' })
    setMonitores(prev => prev.filter(m => m.id !== id))
  }

  async function marcarLidos() {
    const ids = alertas.filter(a => !a.lido).map(a => a.id)
    if (!ids.length) return
    await fetch('/api/monitoramento/alertas', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    })
    setAlertas(prev => prev.map(a => ({ ...a, lido: true })))
  }

  const naoLidos = alertas.filter(a => !a.lido).length

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">Monitoramento de Placas</h1>
          <p className="text-brand-gray text-sm mt-1">Seja alertado quando alguma restrição mudar</p>
        </div>
        <button onClick={carregar} className="p-2 rounded-lg hover:bg-brand-gray-light transition-colors">
          <RefreshCw className="w-4 h-4 text-brand-gray" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-brand-gray-light p-1 rounded-xl w-fit">
        <button
          onClick={() => setTab('placas')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'placas' ? 'bg-white text-brand-dark shadow-sm' : 'text-brand-gray hover:text-brand-dark'}`}
        >
          <span className="flex items-center gap-2"><Car className="w-4 h-4" /> Placas ({monitores.length})</span>
        </button>
        <button
          onClick={() => setTab('alertas')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'alertas' ? 'bg-white text-brand-dark shadow-sm' : 'text-brand-gray hover:text-brand-dark'}`}
        >
          <span className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Alertas
            {naoLidos > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{naoLidos}</span>}
          </span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand-green" /></div>
      ) : tab === 'placas' ? (
        <>
          {/* Formulário */}
          <form onSubmit={adicionar} className="card p-4 mb-4 flex gap-3 items-end flex-wrap">
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs font-medium text-brand-gray mb-1.5">Placa para monitorar</label>
              <input
                className="input-base font-mono uppercase"
                placeholder="ABC1D23"
                value={placa}
                onChange={e => setPlaca(e.target.value.toUpperCase())}
                maxLength={8}
              />
              {erroForm && <p className="text-xs text-red-500 mt-1">{erroForm}</p>}
            </div>
            <button
              type="submit"
              disabled={adicionando}
              className="btn-primary flex items-center gap-2 px-5 py-2.5 text-sm whitespace-nowrap disabled:opacity-50"
            >
              {adicionando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Adicionar
            </button>
          </form>

          {monitores.length === 0 ? (
            <div className="card p-12 text-center">
              <BellOff className="w-10 h-10 text-brand-gray/30 mx-auto mb-3" />
              <p className="text-brand-gray font-medium">Nenhuma placa monitorada</p>
              <p className="text-xs text-brand-gray/60 mt-1">Adicione uma placa acima para receber alertas de mudança</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="divide-y divide-brand-border">
                {monitores.map(m => (
                  <div key={m.id} className="flex items-center gap-4 px-4 py-3.5">
                    <div className="w-9 h-9 rounded-lg bg-brand-green-light flex items-center justify-center shrink-0">
                      <Car className="w-4 h-4 text-brand-green" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-brand-dark font-mono">{m.documento}</p>
                      {m.descricao && <p className="text-xs text-brand-gray truncate">{m.descricao}</p>}
                      <p className="text-[10px] text-brand-gray/60 mt-0.5">Última verificação: {fmtData(m.ultimo_check)}</p>
                    </div>
                    <button
                      onClick={() => remover(m.id)}
                      className="p-2 rounded-lg hover:bg-red-50 hover:text-red-500 text-brand-gray transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-brand-gray/60 text-center mt-4">
            Placas são verificadas automaticamente a cada 12 horas. Máximo de 10 placas.
          </p>
        </>
      ) : (
        <>
          {naoLidos > 0 && (
            <div className="flex justify-end mb-3">
              <button onClick={marcarLidos} className="text-xs text-brand-blue font-medium hover:underline flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Marcar todos como lidos
              </button>
            </div>
          )}

          {alertas.length === 0 ? (
            <div className="card p-12 text-center">
              <Bell className="w-10 h-10 text-brand-gray/30 mx-auto mb-3" />
              <p className="text-brand-gray font-medium">Nenhum alerta ainda</p>
              <p className="text-xs text-brand-gray/60 mt-1">Quando uma placa monitorada tiver mudança, o alerta aparece aqui</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="divide-y divide-brand-border">
                {alertas.map(a => (
                  <div key={a.id} className={`flex items-start gap-4 px-4 py-3.5 ${!a.lido ? 'bg-amber-50' : ''}`}>
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${!a.lido ? 'bg-amber-100' : 'bg-gray-100'}`}>
                      <AlertTriangle className={`w-4 h-4 ${!a.lido ? 'text-amber-600' : 'text-brand-gray'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-brand-dark font-mono text-sm">{a.documento}</p>
                        {!a.lido && <span className="text-[9px] bg-amber-500 text-white px-1.5 py-0.5 rounded-full font-bold">NOVO</span>}
                      </div>
                      <p className="text-sm text-brand-dark mt-0.5">
                        <span className="font-medium">{CAMPO_LABEL[a.campo_alterado] ?? a.campo_alterado}</span> foi alterado
                      </p>
                      {a.valor_atual && !a.valor_atual.startsWith('hash:') && (
                        <p className="text-xs text-brand-gray mt-0.5">Novo valor: <span className="font-medium">{a.valor_atual}</span></p>
                      )}
                      <p className="text-[10px] text-brand-gray/60 mt-1">{fmtData(a.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
