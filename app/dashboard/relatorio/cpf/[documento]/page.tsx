'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  FileText, ArrowLeft, Loader2, User, AlertCircle,
  CheckCircle, AlertTriangle, Car, Phone, Mail,
  MapPin, Briefcase, Users, TrendingUp
} from 'lucide-react'

function maskCpf(c: string) {
  const d = c.replace(/\D/g, '')
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9,11)}`
}

function fmtTel(t: any): string {
  const ddd = t?.ddd ?? t?.codigoDdd ?? ''
  const num = t?.numero ?? t?.numeroTelefone ?? t?.telefone ?? ''
  if (!num) return ''
  return ddd ? `(${ddd}) ${num}` : num
}

function fmtEnd(e: any): string {
  const rua   = e?.logradouro ?? e?.nomeLogradouro ?? e?.endereco ?? ''
  const num   = e?.numero ?? e?.numeroLogradouro ?? ''
  const bairro = e?.bairro ?? e?.nomeBairro ?? ''
  const cid   = e?.municipio ?? e?.cidade ?? e?.nomeMunicipio ?? ''
  const uf    = e?.uf ?? e?.estado ?? e?.siglaUf ?? ''
  const cep   = e?.cep ?? ''
  const partes = [rua && num ? `${rua}, ${num}` : rua, bairro, cid && uf ? `${cid}/${uf}` : cid].filter(Boolean)
  return partes.join(' - ') + (cep ? ` · CEP ${cep}` : '')
}

function v(x: any, fb = 'Não informado'): string {
  if (x === null || x === undefined || x === '') return fb
  if (typeof x === 'object') return x.titulo ?? x.descricao ?? x.nome ?? x.label ?? fb
  return String(x)
}

function StatusBadge({ status, label, detalhe }: { status: 'ok' | 'warn' | 'error'; label: string; detalhe?: string }) {
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

function Campo({ label, value }: { label: string; value: string }) {
  const vazio = value === 'Não informado'
  return (
    <div className="py-2 border-b border-brand-border last:border-0">
      <p className="text-xs text-brand-gray mb-0.5">{label}</p>
      <p className={`text-sm font-medium ${vazio ? 'text-brand-gray italic' : 'text-brand-dark'}`}>{value}</p>
    </div>
  )
}

function SectionCard({ icon: Icon, title, badge, children }: {
  icon: any; title: string; badge?: number | string; children: React.ReactNode
}) {
  return (
    <div className="card p-5 mb-4">
      <h3 className="text-sm font-bold text-brand-dark mb-3 uppercase tracking-wide flex items-center gap-2">
        <Icon className="w-4 h-4 text-brand-blue" />
        {title}
        {badge !== undefined && badge !== 0 && (
          <span className="ml-1 bg-brand-blue-light text-brand-blue text-xs px-2 py-0.5 rounded-full font-medium">{badge}</span>
        )}
      </h3>
      {children}
    </div>
  )
}

export default function RelatorioCpfPage() {
  const params = useParams<{ documento: string }>()
  const router = useRouter()
  const cpf = (params?.documento ?? '').replace(/\D/g, '')

  const [data, setData]       = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro]       = useState('')

  useEffect(() => {
    fetch(`/api/consulta/cpf/${cpf}`)
      .then(async r => {
        const d = await r.json()
        if (!r.ok || d?.error) {
          setErro(d?.error ?? 'Erro ao consultar CPF.')
        } else {
          setData(d)
        }
        setLoading(false)
      })
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

  if (erro || !data) return (
    <div className="max-w-lg mx-auto text-center mt-20">
      <AlertCircle className="w-12 h-12 text-brand-danger mx-auto mb-4" />
      <p className="text-brand-dark font-semibold mb-2">{erro || 'Erro desconhecido'}</p>
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

  // ── Dados básicos ───────────────────────────────────────────────────────────
  const nome      = v(b.nome ?? b.nomeCompleto, 'Nome não informado')
  const scoreVal  = Number(sc.score ?? sc.pontuacao ?? 0)
  const totalProc = Number(pr.total ?? pr.quantidade ?? 0)
  const totalProt = Number(pt.total ?? pt.quantidade ?? 0)
  const isPep     = !!(pp?.pep ?? pp?.isPep)
  const sit       = v(b.situacaoCpf ?? b.situacao, 'REGULAR').toUpperCase()
  const cpfOk     = sit.includes('REGULAR') || sit.includes('ATIVO')

  // ── Negativações / SPC / Serasa ─────────────────────────────────────────────
  const negativacoes: any[] = Array.isArray(sc.negativacoes) ? sc.negativacoes : []
  const totalNegat  = Number(sc.totalDebitos ?? negativacoes.length)
  const valorNegat  = Number(sc.valorTotalDebitos ?? 0)

  // ── Empresas societárias ────────────────────────────────────────────────────
  const empresas: any[] = Array.isArray(soc.empresas ?? soc.lista) ? (soc.empresas ?? soc.lista) : []

  // ── Telefones: combina basico + mais-telefones ──────────────────────────────
  const telsBasico: any[]  = Array.isArray(b.telefones) ? b.telefones : []
  const telsRaw = data?.telefones?.resposta?.telefones ?? data?.telefones?.resposta?.ocorrencias?.telefones ?? {}
  const telsMais: any[] = [
    ...(Array.isArray(telsRaw?.moveis) ? telsRaw.moveis : []),
    ...(Array.isArray(telsRaw?.fixos)  ? telsRaw.fixos  : []),
  ]
  const todosTels: any[] = [...telsBasico]
  telsMais.forEach(t => {
    const num = fmtTel(t)
    if (num && !todosTels.some(x => fmtTel(x) === num)) todosTels.push(t)
  })

  // ── Emails ──────────────────────────────────────────────────────────────────
  const emails: any[] = Array.isArray(b.emails) ? b.emails : []

  // ── Endereços: histórico completo ────────────────────────────────────────────
  const endsRaw = data?.enderecos?.resposta?.enderecos
               ?? data?.enderecos?.resposta?.ocorrencias?.enderecos
               ?? []
  const enderecos: any[] = Array.isArray(endsRaw) ? endsRaw : []

  // ── Relacionamentos / Pessoas de Referência ──────────────────────────────────
  const relRaw  = data?.relacionamentos?.resposta?.pessoasDeReferencia
               ?? data?.relacionamentos?.resposta?.relacionamentos
               ?? data?.relacionamentos?.resposta?.referencias
               ?? data?.relacionamentos?.resposta
  const relacionamentos: any[] = Array.isArray(relRaw) ? relRaw : []

  // ── Veículos vinculados ──────────────────────────────────────────────────────
  const veicRaw = data?.veiculos?.resposta?.veiculos
               ?? data?.veiculos?.resposta?.historico
               ?? data?.veiculos?.resposta?.lista
               ?? data?.veiculos?.historico
               ?? data?.veiculos?.veiculos
               ?? data?.veiculos?.lista
  const veiculos: any[] = Array.isArray(veicRaw) ? veicRaw : []

  // ── Renda ────────────────────────────────────────────────────────────────────
  const rendaStr = v(ren.rendaPresumida ?? ren.renda ?? ren.valor ?? sc.rendaPresumida ?? sc.faixaRenda)

  // ── Protestos com lista ──────────────────────────────────────────────────────
  const protestosLista: any[] = Array.isArray(pt.lista) ? pt.lista : []

  // ── Processos com lista ──────────────────────────────────────────────────────
  const processosLista: any[] = Array.isArray(pr.lista) ? pr.lista : []

  const scoreColor = scoreVal >= 700 ? 'text-green-600' : scoreVal >= 400 ? 'text-yellow-600' : 'text-red-600'
  const scoreLabel = scoreVal >= 700 ? 'Baixo Risco' : scoreVal >= 400 ? 'Risco Moderado' : 'Alto Risco'
  const scoreFaixa = typeof sc.faixa === 'object'
    ? (sc.faixa?.descricao ?? sc.faixa?.titulo ?? '')
    : (sc.faixa ?? '')

  type S = 'ok' | 'warn' | 'error'
  const statusGrid: { label: string; status: S; detalhe: string }[] = [
    { label: 'Situação CPF',        status: cpfOk ? 'ok' : 'error', detalhe: sit },
    { label: 'Score de Crédito',    status: scoreVal >= 700 ? 'ok' : scoreVal >= 400 ? 'warn' : 'error', detalhe: `${scoreVal} / 1000` },
    { label: 'Negativações',        status: totalNegat > 0 ? 'error' : 'ok', detalhe: totalNegat > 0 ? `${totalNegat} registro(s) — R$ ${Number(valorNegat).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Nada consta' },
    { label: 'Processos Judiciais', status: totalProc > 0 ? 'error' : 'ok', detalhe: totalProc > 0 ? `${totalProc} processo(s)` : 'Nada consta' },
    { label: 'Protestos',           status: totalProt > 0 ? 'error' : 'ok', detalhe: totalProt > 0 ? `${totalProt} protesto(s)` : 'Nada consta' },
    { label: 'PEP',                 status: isPep ? 'error' : 'ok', detalhe: isPep ? 'Pessoa Politicamente Exposta' : 'Não identificado' },
    { label: 'Participação Soc.',   status: empresas.length > 0 ? 'warn' : 'ok', detalhe: empresas.length > 0 ? `${empresas.length} empresa(s)` : 'Nenhuma' },
  ]

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
        <div className="ml-auto">
          <a href={`/api/pdf/cpf/${cpf}`} target="_blank" className="btn-primary flex items-center gap-2 text-sm">
            <FileText className="w-4 h-4" /> Baixar PDF
          </a>
        </div>
      </div>

      {/* Banner */}
      <div className="rounded-2xl p-6 mb-6 text-white" style={{ background: 'linear-gradient(135deg, #00703C, #00A651)' }}>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <User className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold truncate">{nome}</h2>
            <p className="text-white/80 font-mono text-sm mt-0.5">{maskCpf(cpf)}</p>
            {b.dataNascimento && (
              <p className="text-white/70 text-xs mt-0.5">
                Nasc. {v(b.dataNascimento)}{b.idade ? ` · ${b.idade} anos` : ''}
                {b.sexo ? ` · ${v(b.sexo)}` : ''}
              </p>
            )}
          </div>
          {scoreVal > 0 && (
            <div className="text-center shrink-0">
              <div className={`text-4xl font-black ${scoreColor} bg-white rounded-xl px-4 py-2 inline-block`}>{scoreVal}</div>
              <p className="text-white/80 text-xs mt-1">{scoreLabel}</p>
            </div>
          )}
        </div>
      </div>

      {/* Status grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {statusGrid.map(s => <StatusBadge key={s.label} {...s} />)}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">

        {/* Identificação */}
        <div className="card p-5">
          <h3 className="text-sm font-bold text-brand-dark mb-3 uppercase tracking-wide flex items-center gap-2">
            <User className="w-4 h-4 text-brand-blue" /> Identificação
          </h3>
          <Campo label="Nome completo"    value={nome} />
          <Campo label="Data nascimento"  value={v(b.dataNascimento)} />
          <Campo label="Idade"            value={v(b.idade)} />
          <Campo label="Sexo"             value={v(b.sexo)} />
          <Campo label="Situação CPF"     value={sit} />
          <Campo label="Nome da mãe"      value={v(b.nomeMae ?? b.mae)} />
          {b.nomePai && <Campo label="Nome do pai" value={v(b.nomePai)} />}
          <Campo label="Renda presumida"  value={rendaStr} />
        </div>

        {/* Contatos */}
        <div className="card p-5">
          <h3 className="text-sm font-bold text-brand-dark mb-3 uppercase tracking-wide flex items-center gap-2">
            <Phone className="w-4 h-4 text-brand-blue" /> Contato
          </h3>

          {/* Telefones */}
          {todosTels.length > 0 ? (
            <div className="mb-3">
              <p className="text-xs text-brand-gray mb-1 font-medium">Telefones ({todosTels.length})</p>
              <div className="space-y-1">
                {todosTels.slice(0, 8).map((t: any, i: number) => {
                  const num = fmtTel(t)
                  const hasWhatsApp = !!(t?.aplicativos?.whatsApp || t?.aplicativos?.whatsAppBusiness)
                  const tipo = t?.tipo ?? (t?.ddd?.length === 2 ? (num.replace(/\D/g, '').length >= 10 ? 'Celular' : 'Fixo') : '')
                  const operadora = t?.operadora ?? ''
                  return num ? (
                    <div key={i} className="flex items-center justify-between py-1 border-b border-brand-border last:border-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-brand-dark font-mono">{num}</p>
                        {hasWhatsApp && (
                          <span className="text-[10px] bg-green-100 text-green-700 font-bold px-1.5 py-0.5 rounded">WA</span>
                        )}
                      </div>
                      <span className="text-xs text-brand-gray">{[v(tipo, ''), operadora].filter(Boolean).join(' · ')}</span>
                    </div>
                  ) : null
                })}
                {todosTels.length > 8 && <p className="text-xs text-brand-gray mt-1">+{todosTels.length - 8} no PDF</p>}
              </div>
            </div>
          ) : (
            <div className="mb-3">
              <p className="text-xs text-brand-gray mb-1 font-medium">Telefones</p>
              <p className="text-sm text-brand-gray italic">Não informado</p>
            </div>
          )}

          {/* Emails */}
          <div>
            <p className="text-xs text-brand-gray mb-1 font-medium flex items-center gap-1">
              <Mail className="w-3 h-3" /> E-mails ({emails.length})
            </p>
            {emails.length > 0 ? (
              <div className="space-y-1">
                {emails.slice(0, 5).map((m: any, i: number) => {
                  const mail = m?.email ?? m?.enderecoEmail ?? m
                  return typeof mail === 'string' && mail ? (
                    <p key={i} className="text-sm font-medium text-brand-dark break-all py-0.5 border-b border-brand-border last:border-0">
                      {mail}
                    </p>
                  ) : null
                })}
                {emails.length > 5 && <p className="text-xs text-brand-gray">+{emails.length - 5} no PDF</p>}
              </div>
            ) : (
              <p className="text-sm text-brand-gray italic">Não informado</p>
            )}
          </div>
        </div>
      </div>

      {/* Histórico de Endereços */}
      {enderecos.length > 0 && (
        <SectionCard icon={MapPin} title="Histórico de Endereços" badge={enderecos.length}>
          <div className="space-y-2">
            {enderecos.slice(0, 6).map((e: any, i: number) => {
              const end = fmtEnd(e)
              const tipo = e?.tipoLogradouro ?? e?.tipo ?? ''
              const dataRef = e?.dataReferencia ?? e?.data ?? e?.dataOcorrencia ?? ''
              return end ? (
                <div key={i} className="flex items-start gap-2 py-2 border-b border-brand-border last:border-0">
                  <MapPin className="w-3.5 h-3.5 text-brand-blue shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-brand-dark leading-snug">{end}</p>
                    {(tipo || dataRef) && (
                      <p className="text-xs text-brand-gray mt-0.5">
                        {[tipo, dataRef].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                  {i === 0 && <span className="text-[10px] bg-brand-green-light text-brand-green px-2 py-0.5 rounded-full shrink-0">Atual</span>}
                </div>
              ) : null
            })}
            {enderecos.length > 6 && <p className="text-xs text-brand-gray mt-1">+{enderecos.length - 6} endereços no PDF completo</p>}
          </div>
        </SectionCard>
      )}

      {/* Processos Judiciais */}
      {totalProc > 0 && (
        <div className="card p-5 mb-4 border border-red-200 bg-red-50">
          <h3 className="text-sm font-bold text-red-700 mb-3 uppercase tracking-wide flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Processos Judiciais
            <span className="ml-1 bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">{totalProc}</span>
          </h3>
          {processosLista.length > 0 ? (
            <div className="space-y-2">
              {processosLista.slice(0, 8).map((p: any, i: number) => {
                const num    = v(p.numeroProcesso ?? p.numero ?? p.numeroAcao, '—')
                const tipo   = v(p.tipoAcao ?? p.tipo ?? p.natureza ?? p.classe, '')
                const tribunal = v(p.tribunal ?? p.vara ?? p.orgao, '')
                const data_  = v(p.dataDistribuicao ?? p.dataAjuizamento ?? p.data ?? '', '')
                const valor  = Number(p.valorCausa ?? p.valor ?? 0)
                return (
                  <div key={i} className="py-2 border-b border-red-200 last:border-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-mono text-red-800 truncate">{num}</p>
                        {tipo && <p className="text-xs text-red-700 font-semibold mt-0.5">{tipo}</p>}
                        {(tribunal || data_) && (
                          <p className="text-xs text-red-500 mt-0.5">
                            {[tribunal, data_].filter(Boolean).join(' · ')}
                          </p>
                        )}
                      </div>
                      {valor > 0 && (
                        <p className="text-xs font-bold text-red-700 shrink-0">
                          R$ {valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
              {processosLista.length > 8 && (
                <p className="text-xs text-red-500 mt-1">+{processosLista.length - 8} processos no PDF completo</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-red-600 mb-3">{totalProc} processo(s) encontrado(s). Ver detalhes no PDF.</p>
          )}
          <a href={`/api/pdf/cpf/${cpf}`} className="text-xs text-brand-green font-semibold hover:underline mt-2 block">
            PDF completo →
          </a>
        </div>
      )}

      {/* Relacionamentos */}
      {relacionamentos.length > 0 && (
        <SectionCard icon={Users} title="Pessoas de Referência / Relacionamentos" badge={relacionamentos.length}>
          <div className="space-y-2">
            {relacionamentos.slice(0, 8).map((r: any, i: number) => {
              const nomeRel  = r?.nomeOuRazaoSocial ?? r?.nome ?? r?.nomePessoa ?? r?.nomeCompleto ?? ''
              const cpfRel   = r?.documento ?? r?.cpf ?? r?.cnpj ?? ''
              const tipoRel  = r?.relacao ?? r?.vinculo ?? r?.tipo ?? r?.parentesco ?? r?.relacionamento ?? ''
              const nascRel  = r?.dataNascimentoOuAbertura ?? r?.dataNascimento ?? ''
              return nomeRel ? (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-brand-border last:border-0">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-brand-blue-light flex items-center justify-center shrink-0">
                      <User className="w-3.5 h-3.5 text-brand-blue" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-brand-dark">{v(nomeRel)}</p>
                      <div className="flex items-center gap-2">
                        {cpfRel && <p className="text-xs text-brand-gray font-mono">{maskCpf(cpfRel)}</p>}
                        {nascRel && <p className="text-xs text-brand-gray">Nasc: {nascRel}</p>}
                      </div>
                    </div>
                  </div>
                  {tipoRel && (
                    <span className="text-xs bg-brand-blue-light text-brand-blue px-2 py-0.5 rounded-full shrink-0">{v(tipoRel)}</span>
                  )}
                </div>
              ) : null
            })}
            {relacionamentos.length > 8 && (
              <p className="text-xs text-brand-gray mt-1">+{relacionamentos.length - 8} no PDF completo</p>
            )}
          </div>
        </SectionCard>
      )}

      {/* Societário */}
      {empresas.length > 0 && (
        <SectionCard icon={Briefcase} title="Participação Societária" badge={empresas.length}>
          <div className="space-y-2">
            {empresas.slice(0, 8).map((e: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-brand-border last:border-0">
                <div>
                  <p className="text-sm font-medium text-brand-dark">{v(e.razaoSocial ?? e.nome)}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {e.cnpj && <p className="text-xs text-brand-gray font-mono">{v(e.cnpj)}</p>}
                    {e.dataEntrada && <p className="text-xs text-brand-gray">Entrada: {v(e.dataEntrada)}</p>}
                  </div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  {e.qualificacao && (
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full block mb-0.5">{v(e.qualificacao)}</span>
                  )}
                  {e.participacao && (
                    <p className="text-xs text-brand-gray">{v(e.participacao)}</p>
                  )}
                </div>
              </div>
            ))}
            {empresas.length > 8 && <p className="text-xs text-brand-gray">+{empresas.length - 8} no PDF</p>}
          </div>
        </SectionCard>
      )}

      {/* Veículos */}
      {veiculos.length > 0 && (
        <SectionCard icon={Car} title="Veículos Vinculados ao CPF" badge={veiculos.length}>
          <div className="space-y-2">
            {veiculos.slice(0, 8).map((ve: any, i: number) => {
              const marcaMod = ve.marcaModelo ?? ve.modelo ?? ve.marca ?? ''
              const placa    = ve.placa ?? ve.numeroPlaca ?? ''
              const ano      = ve.anoFabricacao ?? ve.ano ?? ''
              const anoMod   = ve.anoModelo ?? ''
              const cor      = ve.cor ?? ve.coloracao ?? ''
              const dataVinc = ve.dataVinculo ?? ve.dataUltimaTransferencia ?? ve.data ?? ''
              return (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-brand-border last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-brand-blue-light rounded-lg flex items-center justify-center shrink-0">
                      <Car className="w-4 h-4 text-brand-blue" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-brand-dark">{v(marcaMod) || 'Veículo'}</p>
                      <p className="text-xs text-brand-gray">
                        {[ano && anoMod ? `${ano}/${anoMod}` : ano, cor].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {placa && <p className="text-sm font-mono font-bold text-brand-dark">{v(placa)}</p>}
                    {dataVinc && <p className="text-xs text-brand-gray">{v(dataVinc)}</p>}
                  </div>
                </div>
              )
            })}
            {veiculos.length > 8 && <p className="text-xs text-brand-gray mt-1">+{veiculos.length - 8} no PDF</p>}
          </div>
        </SectionCard>
      )}

      {/* Negativações / SPC / Serasa */}
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
            {negativacoes.length > 10 && (
              <p className="text-xs text-red-500 mt-1">+{negativacoes.length - 10} registros no PDF completo</p>
            )}
          </div>
          {valorNegat > 0 && (
            <div className="mt-3 pt-2 border-t border-red-200 flex justify-between">
              <p className="text-xs font-semibold text-red-700">Total de débitos</p>
              <p className="text-sm font-bold text-red-700">R$ {valorNegat.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
          )}
        </div>
      )}

      {/* Protestos em cartório */}
      {totalProt > 0 && (
        <div className="card p-5 mb-4 border border-orange-200 bg-orange-50">
          <h3 className="text-sm font-bold text-orange-700 mb-3 uppercase tracking-wide flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Protestos em Cartório
            <span className="ml-1 bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full">{totalProt}</span>
          </h3>
          {protestosLista.length > 0 ? (
            <div className="space-y-2">
              {protestosLista.map((p: any, i: number) => {
                const cartorio  = v(p.cartorio ?? p.nomeCartorio ?? p.orgao, '—')
                const cidade    = v(p.cidade ?? p.municipio, '')
                const uf        = v(p.uf ?? p.estado, '')
                const data_     = v(p.dataProtesto ?? p.data ?? '', '')
                const valor     = Number(p.valor ?? p.valorProtesto ?? 0)
                const credor    = v(p.credor ?? p.nomeCredor ?? p.apresentante, '')
                return (
                  <div key={i} className="py-2 border-b border-orange-200 last:border-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-orange-800">{cartorio}</p>
                        {credor && <p className="text-xs text-orange-700 mt-0.5">Credor: {credor}</p>}
                        <p className="text-xs text-orange-500 mt-0.5">
                          {[cidade && uf ? `${cidade}/${uf}` : cidade, data_].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      {valor > 0 && (
                        <p className="text-sm font-bold text-orange-700 shrink-0">
                          R$ {valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-xs text-orange-600">{totalProt} protesto(s) encontrado(s). Detalhes disponíveis no PDF.</p>
          )}
          {pt.primeiraOcorrencia && (
            <p className="text-xs text-orange-500 mt-2">
              Primeira ocorrência: {pt.primeiraOcorrencia}{pt.ultimaOcorrencia && pt.ultimaOcorrencia !== pt.primeiraOcorrencia ? ` · Última: ${pt.ultimaOcorrencia}` : ''}
            </p>
          )}
        </div>
      )}

      {/* Score detalhe */}
      {scoreVal > 0 && (
        <SectionCard icon={TrendingUp} title="Score de Crédito">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className={`text-5xl font-black ${scoreColor}`}>{scoreVal}</p>
              <p className="text-xs text-brand-gray mt-1">de 1.000</p>
            </div>
            <div className="flex-1">
              <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                <div
                  className={`h-3 rounded-full transition-all ${scoreVal >= 700 ? 'bg-green-500' : scoreVal >= 400 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(100, scoreVal / 10)}%` }}
                />
              </div>
              <p className={`text-sm font-bold ${scoreColor}`}>{scoreLabel}</p>
              {scoreFaixa && (
                <p className="text-xs text-brand-gray mt-1 leading-relaxed">{scoreFaixa}</p>
              )}
            </div>
          </div>
        </SectionCard>
      )}

      <p className="text-xs text-brand-gray text-center mt-4 mb-6">
        Consulta realizada em {new Date().toLocaleString('pt-BR')} · Dados de bases públicas e privadas
      </p>
    </div>
  )
}
