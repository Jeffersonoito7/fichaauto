'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, AlertCircle, CheckCircle, AlertTriangle, TrendingUp, FileText } from 'lucide-react'

function maskCnpj(c: string) {
  const d = c.replace(/\D/g, '')
  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12,14)}`
}
function moeda(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }
function val(x: any, fb = 'Não informado'): string {
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

export default function CreditoCnpjPage() {
  const params = useParams<{ documento: string }>()
  const router = useRouter()
  const cnpj   = (params?.documento ?? '').replace(/\D/g, '')
  const [data, setData]       = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro]       = useState('')

  useEffect(() => {
    fetch(`/api/consulta/credito/cnpj/${cnpj}`)
      .then(async r => {
        const d = await r.json()
        if (!r.ok || d?.error) { setErro(d?.error ?? 'Erro ao consultar.'); setLoading(false); return }
        setData(d); setLoading(false)
      })
      .catch(() => { setErro('Erro ao consultar.'); setLoading(false) })
  }, [cnpj])

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

  const sc         = data?.score     ?? {}
  const pt         = data?.protestos ?? {}
  const proc       = data?.processos ?? {}
  const scoreVal   = Number(sc.score ?? sc.pontuacao ?? 0)
  const totalNegat = Number(sc.totalDebitos ?? 0)
  const valorNegat = Number(sc.valorTotalDebitos ?? 0)
  const totalProt  = Number(pt.total ?? 0)
  const totalProc  = Number(proc.total ?? 0)
  const negativacoes: any[] = Array.isArray(sc.negativacoes) ? sc.negativacoes : []

  const scoreColor = scoreVal >= 700 ? 'text-green-600' : scoreVal >= 400 ? 'text-yellow-600' : 'text-red-600'
  const scoreLabel = scoreVal >= 700 ? 'Baixo Risco' : scoreVal >= 400 ? 'Risco Moderado' : 'Alto Risco'

  const statusGrid: { label: string; status: S; detalhe: string }[] = [
    { label: 'Score Empresarial', status: scoreVal >= 700 ? 'ok' : scoreVal >= 400 ? 'warn' : 'error', detalhe: scoreVal > 0 ? `${scoreVal} / 1000 — ${scoreLabel}` : 'Não informado' },
    { label: 'Negativações',     status: totalNegat > 0 ? 'error' : 'ok', detalhe: totalNegat > 0 ? `${totalNegat} reg. — ${moeda(valorNegat)}` : 'Nada consta' },
    { label: 'Protestos',        status: totalProt > 0 ? 'error' : 'ok', detalhe: totalProt > 0 ? `${totalProt} protesto(s)` : 'Nada consta' },
    { label: 'Processos',        status: totalProc > 0 ? 'warn' : 'ok', detalhe: totalProc > 0 ? `${totalProc} processo(s)` : 'Nada consta' },
  ]

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-brand-gray-light">
          <ArrowLeft className="w-5 h-5 text-brand-gray" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-brand-dark">Análise de Crédito — CNPJ</h1>
          <p className="text-brand-gray text-sm font-mono">{maskCnpj(cnpj)}</p>
        </div>
        <div className="ml-auto">
          <a href={`/api/pdf/cnpj/${cnpj}`} target="_blank" className="btn-primary flex items-center gap-2 text-sm">
            <FileText className="w-4 h-4" /> PDF
          </a>
        </div>
      </div>

      <div className="rounded-2xl p-6 mb-6 text-white" style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)' }}>
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex-1">
            <p className="text-white/70 text-sm mb-1">Score Empresarial</p>
            <p className={`text-6xl font-black ${scoreVal > 0 ? 'text-white' : 'text-white/40'}`}>{scoreVal > 0 ? scoreVal : '—'}</p>
            <p className="text-white/80 text-sm mt-1">{scoreVal > 0 ? `${scoreLabel} · de 1.000` : 'Não disponível'}</p>
          </div>
          <div className="text-right">
            <p className="text-white/60 text-xs">Débitos totais</p>
            <p className={`font-bold text-lg ${valorNegat > 0 ? 'text-red-300' : 'text-green-300'}`}>
              {valorNegat > 0 ? moeda(valorNegat) : 'Nada consta'}
            </p>
          </div>
        </div>
        {scoreVal > 0 && (
          <div className="mt-4">
            <div className="w-full bg-white/20 rounded-full h-2">
              <div className={`h-2 rounded-full ${scoreVal >= 700 ? 'bg-green-400' : scoreVal >= 400 ? 'bg-yellow-400' : 'bg-red-400'}`}
                style={{ width: `${Math.min(100, scoreVal / 10)}%` }} />
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {statusGrid.map(s => <StatusBadge key={s.label} {...s} />)}
      </div>

      {negativacoes.length > 0 && (
        <div className="card p-5 mb-4 border border-red-200 bg-red-50">
          <h3 className="text-sm font-bold text-red-700 mb-3 uppercase tracking-wide flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> Negativações
            <span className="ml-1 bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">{negativacoes.length}</span>
          </h3>
          <div className="space-y-2">
            {negativacoes.slice(0, 10).map((n: any, i: number) => (
              <div key={i} className="flex items-start justify-between py-2 border-b border-red-200 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-red-800 truncate">{val(n.credor ?? n.nomeCredor, '—')}</p>
                  {n.tipo && <p className="text-xs text-red-600">{val(n.tipo)}</p>}
                </div>
                {Number(n.valor ?? 0) > 0 && <p className="text-sm font-bold text-red-700 ml-3 shrink-0">{moeda(Number(n.valor))}</p>}
              </div>
            ))}
          </div>
          {valorNegat > 0 && (
            <div className="mt-3 pt-2 border-t border-red-200 flex justify-between">
              <p className="text-xs font-semibold text-red-700">Total</p>
              <p className="text-sm font-bold text-red-700">{moeda(valorNegat)}</p>
            </div>
          )}
        </div>
      )}

      {totalNegat === 0 && totalProt === 0 && scoreVal >= 700 && (
        <div className="card p-6 mb-4 border border-green-200 bg-green-50 text-center">
          <CheckCircle className="w-10 h-10 text-green-600 mx-auto mb-2" />
          <p className="text-green-800 font-bold">Empresa com perfil financeiro saudável</p>
          <p className="text-green-700 text-sm mt-1">Sem negativações, sem protestos e score acima de 700.</p>
        </div>
      )}

      <p className="text-xs text-brand-gray text-center mt-4 mb-6">
        Análise de Crédito realizada em {new Date().toLocaleString('pt-BR')} · Produto 3 — Ficha Auto
      </p>
    </div>
  )
}
