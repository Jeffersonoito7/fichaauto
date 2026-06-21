'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Loader2, AlertCircle, CheckCircle,
  AlertTriangle, TrendingUp, FileText, Download
} from 'lucide-react'

function maskCpf(c: string) {
  const d = c.replace(/\D/g, '')
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9,11)}`
}

function moeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function v(x: any, fb = 'Não informado'): string {
  if (x === null || x === undefined || x === '') return fb
  if (typeof x === 'object') return x.titulo ?? x.descricao ?? x.nome ?? String(x)
  return String(x)
}

type S = 'ok' | 'warn' | 'error'
function StatusBadge({ status, label, detalhe }: { status: S; label: string; detalhe?: string }) {
  const cfg = {
    ok:    { bg: 'bg-green-50',  border: 'border-green-200', text: 'text-green-700',  Icon: CheckCircle },
    warn:  { bg: 'bg-yellow-50', border: 'border-yellow-200',text: 'text-yellow-700', Icon: AlertTriangle },
    error: { bg: 'bg-red-50',    border: 'border-red-200',   text: 'text-red-700',    Icon: AlertCircle },
  }[status]
  return (
    <div className={`${cfg.bg} ${cfg.border} border rounded-xl p-3 flex items-start gap-2`}>
      <cfg.Icon className={`w-4 h-4 ${cfg.text} shrink-0 mt-0.5`} />
      <div>
        <p className={`text-xs font-bold ${cfg.text}`}>{label}</p>
        {detalhe && <p className={`text-xs ${cfg.text} opacity-80 mt-0.5`}>{detalhe}</p>}
      </div>
    </div>
  )
}

export default function CreditoCpfPage() {
  const params = useParams<{ documento: string }>()
  const router = useRouter()
  const cpf    = (params?.documento ?? '').replace(/\D/g, '')

  const [data, setData]       = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro]       = useState('')

  useEffect(() => {
    fetch(`/api/consulta/credito/cpf/${cpf}`)
      .then(async r => {
        const d = await r.json()
        if (!r.ok || d?.error) { setErro(d?.error ?? 'Erro ao consultar.'); setLoading(false); return }
        setData(d)
        setLoading(false)
      })
      .catch(() => { setErro('Erro ao consultar.'); setLoading(false) })
  }, [cpf])

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <Loader2 className="w-10 h-10 animate-spin text-brand-green mx-auto mb-3" />
        <p className="text-brand-gray text-sm">Consultando SPC · Serasa · Banco Central...</p>
      </div>
    </div>
  )

  if (erro || !data) return (
    <div className="max-w-lg mx-auto text-center mt-20">
      <AlertCircle className="w-12 h-12 text-brand-danger mx-auto mb-4" />
      <p className="text-brand-dark font-semibold mb-2">{erro || 'Erro desconhecido'}</p>
      <button onClick={() => router.back()} className="btn-primary">Voltar</button>
    </div>
  )

  const sc           = data?.score     ?? {}
  const pt           = data?.protestos ?? {}
  const proc         = data?.processos ?? {}
  const scoreVal     = Number(sc.score ?? sc.pontuacao ?? 0)
  const totalNegat   = Number(sc.totalDebitos ?? 0)
  const valorNegat   = Number(sc.valorTotalDebitos ?? 0)
  const totalProt    = Number(pt.total ?? 0)
  const totalProc    = Number(proc.total ?? 0)
  const negativacoes: any[] = Array.isArray(sc.negativacoes) ? sc.negativacoes : []
  const protestosLista: any[] = Array.isArray(pt.lista) ? pt.lista : []

  const scoreColor = scoreVal >= 700 ? 'text-green-600' : scoreVal >= 400 ? 'text-yellow-600' : 'text-red-600'
  const scoreLabel = scoreVal >= 700 ? 'Baixo Risco' : scoreVal >= 400 ? 'Risco Moderado' : 'Alto Risco'
  const scoreFaixa = typeof sc.faixa === 'object' ? (sc.faixa?.descricao ?? '') : (sc.faixa ?? '')

  const statusGrid: { label: string; status: S; detalhe: string }[] = [
    { label: 'Score de Crédito',  status: scoreVal >= 700 ? 'ok' : scoreVal >= 400 ? 'warn' : 'error', detalhe: scoreVal > 0 ? `${scoreVal} / 1000 — ${scoreLabel}` : 'Não informado' },
    { label: 'Negativações',      status: totalNegat > 0 ? 'error' : 'ok', detalhe: totalNegat > 0 ? `${totalNegat} registro(s) — ${moeda(valorNegat)}` : 'Nada consta' },
    { label: 'Protestos',         status: totalProt > 0 ? 'error' : 'ok', detalhe: totalProt > 0 ? `${totalProt} protesto(s)` : 'Nada consta' },
    { label: 'Processos',         status: totalProc > 0 ? 'warn' : 'ok', detalhe: totalProc > 0 ? `${totalProc} processo(s)` : 'Nada consta' },
  ]

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-brand-gray-light transition-colors">
          <ArrowLeft className="w-5 h-5 text-brand-gray" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-brand-dark">Análise de Crédito — CPF</h1>
          <p className="text-brand-gray text-sm font-mono">{maskCpf(cpf)}</p>
        </div>
        <div className="ml-auto">
          <button
            onClick={async () => {
              const res = await fetch(`/api/pdf/credito/cpf/${cpf}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
              })
              if (!res.ok) { alert('Erro ao gerar PDF'); return }
              const blob = await res.blob()
              const url  = URL.createObjectURL(blob)
              const a    = document.createElement('a')
              a.href     = url
              a.download = `credito-${cpf}.pdf`
              a.click()
              URL.revokeObjectURL(url)
            }}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Download className="w-4 h-4" /> Baixar PDF
          </button>
        </div>
      </div>

      {/* Banner score */}
      <div className="rounded-2xl p-6 mb-6 text-white" style={{ background: 'linear-gradient(135deg, #1D4ED8, #3B82F6)' }}>
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex-1">
            <p className="text-white/70 text-sm mb-1">Score de Crédito</p>
            <p className={`text-6xl font-black ${scoreVal > 0 ? 'text-white' : 'text-white/40'}`}>{scoreVal > 0 ? scoreVal : '—'}</p>
            <p className="text-white/80 text-sm mt-1">{scoreVal > 0 ? `${scoreLabel} · de 1.000` : 'Não disponível'}</p>
            {scoreFaixa && <p className="text-white/60 text-xs mt-1">{scoreFaixa}</p>}
          </div>
          <div className="text-right">
            {sc.rendaPresumida && (
              <div className="mb-3">
                <p className="text-white/60 text-xs">Renda presumida</p>
                <p className="text-white font-bold">{v(sc.rendaPresumida)}</p>
              </div>
            )}
            <div>
              <p className="text-white/60 text-xs">Débitos totais</p>
              <p className={`font-bold text-lg ${valorNegat > 0 ? 'text-red-300' : 'text-green-300'}`}>
                {valorNegat > 0 ? moeda(valorNegat) : 'Nada consta'}
              </p>
            </div>
          </div>
        </div>
        {scoreVal > 0 && (
          <div className="mt-4">
            <div className="w-full bg-white/20 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${scoreVal >= 700 ? 'bg-green-400' : scoreVal >= 400 ? 'bg-yellow-400' : 'bg-red-400'}`}
                style={{ width: `${Math.min(100, scoreVal / 10)}%` }}
              />
            </div>
            <div className="flex justify-between text-white/40 text-xs mt-1">
              <span>0</span><span>300</span><span>700</span><span>1000</span>
            </div>
          </div>
        )}
      </div>

      {/* Status grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {statusGrid.map(s => <StatusBadge key={s.label} {...s} />)}
      </div>

      {/* Negativações */}
      {negativacoes.length > 0 && (
        <div className="card p-5 mb-4 border border-red-200 bg-red-50">
          <h3 className="text-sm font-bold text-red-700 mb-3 uppercase tracking-wide flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Negativações / Restrições de Crédito
            <span className="ml-1 bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">{negativacoes.length}</span>
          </h3>
          <div className="space-y-2">
            {negativacoes.slice(0, 10).map((n: any, i: number) => {
              const credor = v(n.credor ?? n.nomeCredor ?? n.cedente, '—')
              const valor  = Number(n.valor ?? n.valorDebito ?? 0)
              const datInc = v(n.dataInclusao ?? n.dataRegistro ?? '', '')
              const tipo   = v(n.tipoDebito ?? n.tipo ?? n.natureza ?? '', '')
              return (
                <div key={i} className="flex items-start justify-between py-2 border-b border-red-200 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-red-800 truncate">{credor}</p>
                    {tipo && <p className="text-xs text-red-600">{tipo}</p>}
                    {datInc && <p className="text-xs text-red-500">Inc.: {datInc}</p>}
                  </div>
                  {valor > 0 && <p className="text-sm font-bold text-red-700 ml-3 shrink-0">{moeda(valor)}</p>}
                </div>
              )
            })}
            {negativacoes.length > 10 && <p className="text-xs text-red-500 mt-1">+{negativacoes.length - 10} no PDF</p>}
          </div>
          {valorNegat > 0 && (
            <div className="mt-3 pt-2 border-t border-red-200 flex justify-between">
              <p className="text-xs font-semibold text-red-700">Total</p>
              <p className="text-sm font-bold text-red-700">{moeda(valorNegat)}</p>
            </div>
          )}
        </div>
      )}

      {/* Protestos */}
      {totalProt > 0 && (
        <div className="card p-5 mb-4 border border-orange-200 bg-orange-50">
          <h3 className="text-sm font-bold text-orange-700 mb-3 uppercase tracking-wide flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Protestos em Cartório
            <span className="ml-1 bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full">{totalProt}</span>
          </h3>
          {protestosLista.length > 0 ? (
            <div className="space-y-2">
              {protestosLista.map((p: any, i: number) => (
                <div key={i} className="flex items-start justify-between py-2 border-b border-orange-200 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-orange-800">{v(p.cartorio ?? p.nomeCartorio ?? p.orgao, '—')}</p>
                    {p.credor && <p className="text-xs text-orange-700">Credor: {v(p.credor)}</p>}
                    <p className="text-xs text-orange-500">{v(p.dataProtesto ?? p.data ?? '', '')}</p>
                  </div>
                  {Number(p.valor ?? 0) > 0 && <p className="text-sm font-bold text-orange-700 shrink-0">{moeda(Number(p.valor))}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-orange-600">{totalProt} protesto(s). Detalhes no PDF.</p>
          )}
        </div>
      )}

      {/* Score detalhe */}
      {scoreVal > 0 && (
        <div className="card p-5 mb-4">
          <h3 className="text-sm font-bold text-brand-dark mb-4 uppercase tracking-wide flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-brand-blue" /> Classificação de Risco
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { faixa: '0 – 300',   label: 'Alto Risco',      cor: 'bg-red-100 text-red-700',    ativo: scoreVal < 300 },
              { faixa: '300 – 700', label: 'Risco Moderado',  cor: 'bg-yellow-100 text-yellow-700', ativo: scoreVal >= 300 && scoreVal < 700 },
              { faixa: '700 – 1000',label: 'Baixo Risco',     cor: 'bg-green-100 text-green-700',ativo: scoreVal >= 700 },
            ].map(f => (
              <div key={f.faixa} className={`rounded-xl p-3 text-center border-2 ${f.ativo ? f.cor + ' border-current' : 'bg-gray-50 text-gray-400 border-transparent'}`}>
                <p className="text-xs font-bold">{f.faixa}</p>
                <p className="text-xs mt-0.5">{f.label}</p>
                {f.ativo && <p className="text-xl font-black mt-1">{scoreVal}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {totalNegat === 0 && totalProt === 0 && scoreVal >= 700 && (
        <div className="card p-6 mb-4 border border-green-200 bg-green-50 text-center">
          <CheckCircle className="w-10 h-10 text-green-600 mx-auto mb-2" />
          <p className="text-green-800 font-bold">Perfil financeiro saudável</p>
          <p className="text-green-700 text-sm mt-1">Sem negativações, sem protestos e score acima de 700.</p>
        </div>
      )}

      <p className="text-xs text-brand-gray text-center mt-4 mb-6">
        Análise de Crédito realizada em {new Date().toLocaleString('pt-BR')} · Produto 3 — Ficha Auto
      </p>
    </div>
  )
}
