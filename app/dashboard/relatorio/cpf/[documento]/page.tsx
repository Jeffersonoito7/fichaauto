'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { FileText, ArrowLeft, Loader2, User, AlertCircle, CheckCircle, AlertTriangle, Car } from 'lucide-react'

function maskCpf(c: string) {
  const d = c.replace(/\D/g, '')
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9,11)}`
}

function v(x: any, fb = 'Não Informado'): string {
  if (x === null || x === undefined || x === '') return fb
  return String(x)
}

type StatusIcon = { label: string; status: 'ok' | 'warn' | 'error'; detalhe?: string }

function StatusBadge({ status, label, detalhe }: StatusIcon) {
  const cfg = {
    ok:    { bg: 'bg-green-50',  border: 'border-green-200', text: 'text-green-700',  dot: 'bg-green-500',  icon: CheckCircle },
    warn:  { bg: 'bg-yellow-50', border: 'border-yellow-200',text: 'text-yellow-700', dot: 'bg-yellow-500', icon: AlertTriangle },
    error: { bg: 'bg-red-50',    border: 'border-red-200',   text: 'text-red-700',    dot: 'bg-red-500',    icon: AlertCircle },
  }[status]
  const Icon = cfg.icon
  return (
    <div className={`${cfg.bg} ${cfg.border} border rounded-xl p-3 flex items-start gap-2`}>
      <Icon className={`w-4 h-4 ${cfg.text} shrink-0 mt-0.5`} />
      <div>
        <p className={`text-xs font-bold ${cfg.text}`}>{label}</p>
        {detalhe && <p className={`text-xs ${cfg.text} opacity-80 mt-0.5`}>{detalhe}</p>}
      </div>
    </div>
  )
}

function Campo({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-2 border-b border-brand-border last:border-0">
      <p className="text-xs text-brand-gray mb-0.5">{label}</p>
      <p className="text-sm font-medium text-brand-dark">{value}</p>
    </div>
  )
}

export default function RelatorioCpfPage() {
  const { documento } = useParams<{ documento: string }>()
  const router = useRouter()
  const cpf = documento.replace(/\D/g, '')

  const [data, setData]       = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro]       = useState('')

  useEffect(() => {
    fetch(`/api/consulta/cpf/${cpf}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { setErro('Erro ao consultar CPF.'); setLoading(false) })
  }, [cpf])

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <Loader2 className="w-10 h-10 animate-spin text-brand-green mx-auto mb-3" />
        <p className="text-brand-gray text-sm">Consultando CPF nas bases de dados...</p>
      </div>
    </div>
  )

  if (erro) return (
    <div className="max-w-lg mx-auto text-center mt-20">
      <AlertCircle className="w-12 h-12 text-brand-danger mx-auto mb-4" />
      <p className="text-brand-dark font-semibold mb-2">{erro}</p>
      <button onClick={() => router.back()} className="btn-primary">Voltar</button>
    </div>
  )

  const b   = data?.basico    ?? {}
  const sc  = data?.score     ?? {}
  const pr  = data?.processos ?? {}
  const pt  = data?.protestos ?? {}
  const pp  = data?.pep       ?? {}
  const soc = data?.societario ?? {}
  const ren = data?.renda     ?? {}

  const nome      = v(b.nome ?? b.nomeCompleto, 'Nome não informado')
  const scoreVal  = Number(sc.score ?? sc.pontuacao ?? 0)
  const totalProc = pr.total ?? pr.quantidade ?? 0
  const totalProt = pt.total ?? pt.quantidade ?? 0
  const isPep     = !!(pp.pep ?? pp.isPep)
  const sit       = v(b.situacaoCpf ?? b.situacao, 'REGULAR').toUpperCase()
  const cpfOk     = sit.includes('REGULAR') || sit.includes('ATIVO')
  const empresas  = Array.isArray(soc.empresas ?? soc.lista) ? (soc.empresas ?? soc.lista) : []
  const veiculosCpf = Array.isArray(data?.veiculos?.veiculos ?? data?.veiculos?.lista) ? (data?.veiculos?.veiculos ?? data?.veiculos?.lista) : []

  const statusIcons: StatusIcon[] = [
    { label: 'Situação CPF',         status: cpfOk     ? 'ok' : 'error',  detalhe: sit },
    { label: 'Score de Crédito',     status: scoreVal >= 700 ? 'ok' : scoreVal >= 400 ? 'warn' : 'error', detalhe: `${scoreVal} / 1000` },
    { label: 'Processos Judiciais',  status: totalProc > 0 ? 'error' : 'ok', detalhe: totalProc > 0 ? `${totalProc} processo(s)` : 'Nada consta' },
    { label: 'Protestos',            status: totalProt > 0 ? 'error' : 'ok', detalhe: totalProt > 0 ? `${totalProt} protesto(s)` : 'Nada consta' },
    { label: 'PEP',                  status: isPep ? 'error' : 'ok',      detalhe: isPep ? 'Pessoa Politicamente Exposta' : 'Não identificado' },
    { label: 'Participação Soc.',    status: empresas.length > 0 ? 'warn' : 'ok', detalhe: empresas.length > 0 ? `${empresas.length} empresa(s)` : 'Nenhuma' },
  ]

  const scoreColor = scoreVal >= 700 ? 'text-green-600' : scoreVal >= 400 ? 'text-yellow-600' : 'text-red-600'
  const scoreLabel = scoreVal >= 700 ? 'Baixo Risco' : scoreVal >= 400 ? 'Risco Moderado' : 'Alto Risco'

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-brand-gray-light transition-colors">
          <ArrowLeft className="w-5 h-5 text-brand-gray" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-brand-dark">Relatório CPF</h1>
          <p className="text-brand-gray text-sm font-mono">{maskCpf(cpf)}</p>
        </div>
        <div className="ml-auto flex gap-2">
          <a
            href={`/api/pdf/cpf/${cpf}`}
            target="_blank"
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <FileText className="w-4 h-4" /> Baixar PDF
          </a>
        </div>
      </div>

      {/* Banner */}
      <div className="rounded-2xl p-6 mb-6 text-white" style={{ background: 'linear-gradient(135deg, #00703C, #00A651)' }}>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <User className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">{nome}</h2>
            <p className="text-white/80 font-mono text-sm mt-0.5">{maskCpf(cpf)}</p>
          </div>
          <div className="ml-auto text-right">
            <p className={`text-4xl font-black ${scoreColor} bg-white rounded-xl px-4 py-2`}>{scoreVal}</p>
            <p className="text-white/80 text-xs mt-1">{scoreLabel}</p>
          </div>
        </div>
      </div>

      {/* Status grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {statusIcons.map(s => <StatusBadge key={s.label} {...s} />)}
      </div>

      {/* Dados em cards */}
      <div className="grid lg:grid-cols-2 gap-4 mb-6">

        {/* Identificação */}
        <div className="card p-5">
          <h3 className="text-sm font-bold text-brand-dark mb-3 uppercase tracking-wide">Identificação</h3>
          <Campo label="Nome completo"   value={nome} />
          <Campo label="Data nascimento" value={v(b.dataNascimento)} />
          <Campo label="Idade"           value={v(b.idade, '')} />
          <Campo label="Sexo"            value={v(b.sexo)} />
          <Campo label="Situação CPF"    value={sit} />
          <Campo label="Nome da mãe"     value={v(b.nomeMae ?? b.mae)} />
        </div>

        {/* Contato */}
        <div className="card p-5">
          <h3 className="text-sm font-bold text-brand-dark mb-3 uppercase tracking-wide">Contato</h3>
          <Campo label="E-mail"    value={v(b.email ?? (Array.isArray(b.emails) ? b.emails[0]?.email : ''))} />
          <Campo label="Telefone"  value={v(b.telefone ?? (Array.isArray(b.telefones) ? b.telefones[0]?.numero : ''))} />
          <Campo label="Endereço"  value={v(b.logradouro ?? b.enderecoCompleto, '')} />
          <Campo label="Cidade/UF" value={`${v(b.municipio, '-')}/${v(b.uf, '-')}`} />
          <Campo label="CEP"       value={v(b.cep)} />
          <Campo label="Renda presumida" value={v(ren.rendaPresumida ?? ren.renda ?? ren.faixaRenda)} />
        </div>
      </div>

      {/* Processos */}
      {totalProc > 0 && (
        <div className="card p-5 mb-4">
          <h3 className="text-sm font-bold text-brand-dark mb-1 uppercase tracking-wide">
            Processos Judiciais
            <span className="ml-2 bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">{totalProc}</span>
          </h3>
          <p className="text-xs text-brand-gray mb-3">Baixe o PDF para a listagem completa</p>
          <a href={`/api/pdf/cpf/${cpf}`} className="text-xs text-brand-green font-semibold hover:underline">
            Ver no relatório PDF →
          </a>
        </div>
      )}

      {/* Societário */}
      {empresas.length > 0 && (
        <div className="card p-5 mb-4">
          <h3 className="text-sm font-bold text-brand-dark mb-3 uppercase tracking-wide">
            Participação Societária
            <span className="ml-2 bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full">{empresas.length}</span>
          </h3>
          <div className="space-y-2">
            {empresas.slice(0, 5).map((e: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-brand-border last:border-0">
                <div>
                  <p className="text-sm font-medium text-brand-dark">{v(e.razaoSocial ?? e.nome)}</p>
                  <p className="text-xs text-brand-gray font-mono">{v(e.cnpj)}</p>
                </div>
                <span className="text-xs text-brand-gray">{v(e.qualificacao ?? e.participacao)}</span>
              </div>
            ))}
            {empresas.length > 5 && <p className="text-xs text-brand-gray">+{empresas.length - 5} no PDF</p>}
          </div>
        </div>
      )}

      {/* Histórico de Veículos */}
      {veiculosCpf.length > 0 && (
        <div className="card p-5 mb-4">
          <h3 className="text-sm font-bold text-brand-dark mb-3 uppercase tracking-wide flex items-center gap-2">
            <Car className="w-4 h-4" /> Veículos Vinculados ao CPF
            <span className="ml-1 bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full">{veiculosCpf.length}</span>
          </h3>
          <div className="space-y-2">
            {veiculosCpf.slice(0, 6).map((ve: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-brand-border last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-brand-blue-light rounded-lg flex items-center justify-center shrink-0">
                    <Car className="w-4 h-4 text-brand-blue" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-brand-dark">{v(ve.marcaModelo ?? ve.modelo ?? ve.marca)}</p>
                    <p className="text-xs text-brand-gray">{v(ve.ano ?? ve.anoFabricacao, '')} · {v(ve.cor, '')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono font-bold text-brand-dark">{v(ve.placa)}</p>
                  <p className="text-xs text-brand-gray">{v(ve.dataVinculo ?? ve.data, '')}</p>
                </div>
              </div>
            ))}
            {veiculosCpf.length > 6 && (
              <p className="text-xs text-brand-gray mt-1">+{veiculosCpf.length - 6} veículos no PDF completo</p>
            )}
          </div>
        </div>
      )}

      <p className="text-xs text-brand-gray text-center mt-4">
        Consulta realizada em {new Date().toLocaleString('pt-BR')} · Dados de bases públicas e privadas
      </p>
    </div>
  )
}
