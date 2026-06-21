'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { FileText, ArrowLeft, Loader2, Building2, AlertCircle, CheckCircle, AlertTriangle, Users, ShieldAlert, ShieldCheck } from 'lucide-react'

function maskCnpj(c: string) {
  const d = c.replace(/\D/g, '')
  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12,14)}`
}

function v(x: any, fb = 'Não Informado'): string {
  if (x === null || x === undefined || x === '') return fb
  if (typeof x === 'object') return x.titulo ?? x.descricao ?? x.nome ?? x.label ?? fb
  return String(x)
}

type StatusIcon = { label: string; status: 'ok' | 'warn' | 'error'; detalhe?: string }

function StatusBadge({ status, label, detalhe }: StatusIcon) {
  const cfg = {
    ok:    { bg: 'bg-green-50',  border: 'border-green-200', text: 'text-green-700',  icon: CheckCircle },
    warn:  { bg: 'bg-yellow-50', border: 'border-yellow-200',text: 'text-yellow-700', icon: AlertTriangle },
    error: { bg: 'bg-red-50',    border: 'border-red-200',   text: 'text-red-700',    icon: AlertCircle },
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

export default function RelatorioCnpjPage() {
  const params = useParams<{ documento: string }>()
  const router = useRouter()
  const cnpj = (params?.documento ?? '').replace(/\D/g, '')

  const [data, setData]       = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro]       = useState('')

  useEffect(() => {
    fetch(`/api/consulta/cnpj/${cnpj}`)
      .then(async r => {
        const d = await r.json()
        if (!r.ok || d?.error) {
          setErro(d?.error ?? 'Erro ao consultar CNPJ.')
        } else {
          setData(d)
        }
        setLoading(false)
      })
      .catch(() => { setErro('Erro ao consultar CNPJ.'); setLoading(false) })
  }, [cnpj])

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <Loader2 className="w-10 h-10 animate-spin text-brand-green mx-auto mb-3" />
        <p className="text-brand-gray text-sm">Consultando CNPJ nas bases de dados...</p>
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

  const b      = data?.basico      ?? {}
  const qsa    = data?.qsa         ?? {}
  const sc     = data?.score       ?? {}
  const pr     = data?.processos   ?? {}
  const pt     = data?.protestos   ?? {}
  const rel    = data?.relacionadas ?? {}
  const erros  = data?.erros  ?? []
  const avisos = data?.avisos ?? []

  const razao     = v(b.razaoSocial ?? b.nome, 'Empresa não informada')
  const scoreVal  = Number(sc.score ?? sc.pontuacao ?? 0)
  const totalProc = pr.total ?? pr.quantidade ?? 0
  const totalProt = pt.total ?? pt.quantidade ?? 0
  const socios    = Array.isArray(qsa.socios ?? qsa.qsa ?? qsa.lista) ? (qsa.socios ?? qsa.qsa ?? qsa.lista) : []
  const relacionadas = Array.isArray(rel.empresas ?? rel.lista) ? (rel.empresas ?? rel.lista) : []
  const sit       = v(b.situacaoCadastral ?? b.situacao, 'ATIVA').toUpperCase()
  const sitOk     = sit.includes('ATIVA') || sit.includes('ATIVO')
  const negativacoes: any[] = Array.isArray(sc.negativacoes) ? sc.negativacoes : []
  const totalNegat    = Number(sc.totalDebitos ?? negativacoes.length)
  const valorNegat    = Number(sc.valorTotalDebitos ?? 0)

  const sanc           = data?.sancoes ?? {}
  const temSancao      = !!(sanc?.temSancao)
  const todasCertidoes: any[] = Array.isArray(sanc?.todasCertidoes) ? sanc.todasCertidoes : []
  const ceisArr        = Array.isArray(sanc?.ceis) ? sanc.ceis : []
  const cnepArr        = Array.isArray(sanc?.cnep) ? sanc.cnep : []
  const inidoneos      = Array.isArray(sanc?.inidoneos)    ? sanc.inidoneos    : []
  const inabilitados   = Array.isArray(sanc?.inabilitados) ? sanc.inabilitados : []
  const totalSanc      = inidoneos.length + inabilitados.length + ceisArr.length + cnepArr.length

  const statusIcons: StatusIcon[] = [
    { label: 'Situação Cadastral',     status: sitOk     ? 'ok'  : 'error', detalhe: sit },
    { label: 'Score Empresarial',      status: scoreVal >= 700 ? 'ok' : scoreVal >= 400 ? 'warn' : 'error', detalhe: `${scoreVal} / 1000` },
    { label: 'Sanções Gov. Federal',   status: temSancao ? 'error' : 'ok', detalhe: temSancao ? `${totalSanc} sanção(ões) — TCU/CEIS/CNEP` : 'Nada consta' },
    { label: 'Negativações',           status: totalNegat > 0 ? 'error' : 'ok', detalhe: totalNegat > 0 ? `${totalNegat} registro(s) — R$ ${valorNegat.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Nada consta' },
    { label: 'Processos Judiciais',    status: totalProc > 0 ? 'error' : 'ok', detalhe: totalProc > 0 ? `${totalProc} processo(s)` : 'Nada consta' },
    { label: 'Protestos',              status: totalProt > 0 ? 'error' : 'ok', detalhe: totalProt > 0 ? `${totalProt} protesto(s)` : 'Nada consta' },
    { label: 'Empresas Relacionadas',  status: relacionadas.length > 0 ? 'warn' : 'ok', detalhe: relacionadas.length > 0 ? `${relacionadas.length} empresa(s)` : 'Nenhuma' },
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
          <h1 className="text-xl font-bold text-brand-dark">Relatório CNPJ</h1>
          <p className="text-brand-gray text-sm font-mono">{maskCnpj(cnpj)}</p>
        </div>
        <div className="ml-auto">
          <a
            href={`/api/pdf/cnpj/${cnpj}`}
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
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold truncate">{razao}</h2>
            <p className="text-white/80 font-mono text-sm mt-0.5">{maskCnpj(cnpj)}</p>
            {b.nomeFantasia && <p className="text-white/70 text-xs mt-0.5">{v(b.nomeFantasia)}</p>}
          </div>
          <div className="text-right shrink-0">
            <p className={`text-3xl font-black ${scoreColor} bg-white rounded-xl px-3 py-2`}>{scoreVal}</p>
            <p className="text-white/80 text-xs mt-1">{scoreLabel}</p>
          </div>
        </div>
      </div>

      {/* Avisos de fonte alternativa */}
      {avisos.length > 0 && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
          <p className="text-xs font-semibold text-yellow-800 mb-1">Atenção</p>
          {avisos.map((a: any, i: number) => (
            <p key={i} className="text-xs text-yellow-700">{v(a)}</p>
          ))}
        </div>
      )}

      {/* Erros da API */}
      {erros.length > 0 && !b.razaoSocial && !b.nome && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-xs font-semibold text-red-800 mb-1">Módulos com falha</p>
          {erros.map((e: any, i: number) => (
            <p key={i} className="text-xs text-red-700">{v(e)}</p>
          ))}
        </div>
      )}

      {/* Status */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {statusIcons.map(s => <StatusBadge key={s.label} {...s} />)}
      </div>

      {/* Dados */}
      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <div className="card p-5">
          <h3 className="text-sm font-bold text-brand-dark mb-3 uppercase tracking-wide">Dados Cadastrais</h3>
          <Campo label="Razão Social"    value={razao} />
          <Campo label="Nome Fantasia"   value={v(b.nomeFantasia)} />
          <Campo label="CNAE Principal"  value={v(b.cnae ?? b.cnaePrincipal)} />
          <Campo label="Natureza Jurídica" value={v(b.naturezaJuridica ?? b.tipo)} />
          <Campo label="Data de Abertura" value={v(b.dataAbertura ?? b.dataFundacao)} />
          <Campo label="Porte"           value={v(b.porte ?? b.porteEmpresa)} />
          <Campo label="Capital Social"  value={v(b.capitalSocial, '---')} />
          <Campo label="Situação"        value={sit} />
        </div>
        <div className="card p-5">
          <h3 className="text-sm font-bold text-brand-dark mb-3 uppercase tracking-wide">Endereço e Contato</h3>
          <Campo label="Logradouro"  value={`${v(b.logradouro, '')} ${v(b.numero, '')}`.trim()} />
          <Campo label="Bairro"      value={v(b.bairro)} />
          <Campo label="Cidade/UF"   value={`${v(b.municipio, '-')}/${v(b.uf, '-')}`} />
          <Campo label="CEP"         value={v(b.cep)} />
          <Campo label="Telefone"    value={v(b.telefone)} />
          <Campo label="E-mail"      value={v(b.email)} />
          <Campo label="Simples Nac." value={v(b.optanteSimples ?? b.simplesNacional, '---')} />
        </div>
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
              const credor  = v(n.credor ?? n.nomeCredor ?? n.cedente, '—')
              const valor   = Number(n.valor ?? n.valorDebito ?? 0)
              const datVenc = v(n.dataVencimento ?? n.data ?? '', '')
              const datInc  = v(n.dataInclusao ?? n.dataRegistro ?? '', '')
              const tipo    = v(n.tipoDebito ?? n.tipo ?? n.natureza ?? '', '')
              return (
                <div key={i} className="flex items-start justify-between py-2 border-b border-red-200 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-red-800 truncate">{credor}</p>
                    {tipo && <p className="text-xs text-red-600">{tipo}</p>}
                    {(datVenc || datInc) && (
                      <p className="text-xs text-red-500">
                        {datVenc ? `Venc.: ${datVenc}` : ''}{datVenc && datInc ? ' · ' : ''}{datInc ? `Inc.: ${datInc}` : ''}
                      </p>
                    )}
                  </div>
                  {valor > 0 && (
                    <p className="text-sm font-bold text-red-700 ml-3 shrink-0">
                      R$ {valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
          {valorNegat > 0 && (
            <div className="mt-3 pt-2 border-t border-red-200 flex justify-between">
              <p className="text-xs font-semibold text-red-700">Total de débitos</p>
              <p className="text-sm font-bold text-red-700">R$ {valorNegat.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
          )}
        </div>
      )}

      {/* QSA */}
      {socios.length > 0 && (
        <div className="card p-5 mb-4">
          <h3 className="text-sm font-bold text-brand-dark mb-3 uppercase tracking-wide flex items-center gap-2">
            <Users className="w-4 h-4" /> Quadro Societário
          </h3>
          <div className="space-y-2">
            {socios.map((s: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-brand-border last:border-0">
                <div>
                  <p className="text-sm font-medium text-brand-dark">{v(s.nome ?? s.nomeOuRazaoSocial)}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs text-brand-gray">{v(s.qualificacao ?? s.cargo, 'Sócio')}</p>
                    {(s.dataEntrada) && <p className="text-xs text-brand-gray">Entrada: {s.dataEntrada}</p>}
                  </div>
                </div>
                <span className="text-xs font-mono text-brand-gray">{v(s.cpf ?? s.cnpj ?? s.documento)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sanções Gov. Federal — TCU / CEIS / CNEP */}
      <div className={`card p-5 mb-4 border ${temSancao ? 'border-red-300 bg-red-50' : 'border-green-200 bg-green-50'}`}>
        <h3 className={`text-sm font-bold mb-3 uppercase tracking-wide flex items-center gap-2 ${temSancao ? 'text-red-700' : 'text-green-700'}`}>
          {temSancao ? <ShieldAlert className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
          Sanções Gov. Federal — TCU / CEIS / CNEP
          {temSancao && <span className="ml-1 bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">{totalSanc}</span>}
        </h3>
        {todasCertidoes.length > 0 ? (
          <div className="space-y-2">
            {todasCertidoes.map((c: any, i: number) => {
              const limpo = c.situacao === 'NADA_CONSTA'
              return (
                <div key={i} className={`flex items-center justify-between py-2 border-b last:border-0 ${limpo ? 'border-green-100' : 'border-red-200'}`}>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold ${limpo ? 'text-green-700' : 'text-red-700'}`}>{c.descricao ?? c.tipo}</p>
                    {c.observacao && <p className="text-xs text-gray-500 mt-0.5">{c.observacao}</p>}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ml-3 shrink-0 ${limpo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {limpo ? 'Nada consta' : c.situacao ?? 'CONSTA'}
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-xs text-green-700">Nada consta nos cadastros TCU (inidôneos, inabilitados), CEIS e CNEP.</p>
        )}
        <p className="text-xs text-gray-400 mt-3">Fonte: TCU (certidoes-apf.apps.tcu.gov.br) · CGU/CEIS/CNEP (Portal da Transparência)</p>
      </div>

      {/* Processos / Protestos resumo */}
      {(totalProc > 0 || totalProt > 0) && (
        <div className="card p-5 mb-4">
          <h3 className="text-sm font-bold text-brand-dark mb-3 uppercase tracking-wide">Pendências</h3>
          {totalProc > 0 && (
            <p className="text-sm text-red-700 mb-1">{totalProc} processo(s) judicial(is) encontrado(s)</p>
          )}
          {totalProt > 0 && (
            <p className="text-sm text-red-700 mb-1">{totalProt} protesto(s) em cartório encontrado(s)</p>
          )}
          <a href={`/api/pdf/cnpj/${cnpj}`} className="text-xs text-brand-green font-semibold hover:underline mt-2 block">
            Ver listagem completa no PDF →
          </a>
        </div>
      )}

      <p className="text-xs text-brand-gray text-center mt-4">
        Consulta realizada em {new Date().toLocaleString('pt-BR')} · Dados de bases públicas e privadas
      </p>
    </div>
  )
}
