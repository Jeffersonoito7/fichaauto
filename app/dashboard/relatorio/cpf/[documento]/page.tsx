'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  FileText, ArrowLeft, Loader2, User, AlertCircle,
  CheckCircle, AlertTriangle, Phone, Mail,
  MapPin, Briefcase, Users, Skull, ShieldAlert, ShieldCheck
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

  const b   = data?.basico     ?? {}
  const soc = data?.societario ?? {}
  const pp  = data?.pep        ?? {}

  const nome   = v(b.nome ?? b.nomeCompleto, 'Nome não informado')
  const isPep  = !!(pp?.pep ?? pp?.isPep)
  const sit    = v(b.situacaoCpf ?? b.situacao, 'REGULAR').toUpperCase()
  const cpfOk  = sit.includes('REGULAR') || sit.includes('ATIVO')

  // Falecido — campo adicionado pela Assertiva
  const isFalecido = !!(
    b.falecido === true ||
    b.obito === true ||
    b.indicioObito === true ||
    sit.includes('FALEC') ||
    sit.includes('ÓBITO') ||
    sit.includes('OBITO')
  )

  // ── Empresas societárias ────────────────────────────────────────────────────
  const empresas: any[] = Array.isArray(soc.empresas ?? soc.lista) ? (soc.empresas ?? soc.lista) : []

  // ── Telefones ───────────────────────────────────────────────────────────────
  const telsBasico: any[] = Array.isArray(b.telefones) ? b.telefones : []
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

  // ── Endereços ────────────────────────────────────────────────────────────────
  const endsRaw = data?.enderecos?.resposta?.enderecos
               ?? data?.enderecos?.resposta?.ocorrencias?.enderecos
               ?? []
  const enderecos: any[] = Array.isArray(endsRaw) ? endsRaw : []

  // ── Relacionamentos ──────────────────────────────────────────────────────────
  const relRaw = data?.relacionamentos?.resposta?.pessoasDeReferencia
              ?? data?.relacionamentos?.resposta?.relacionamentos
              ?? data?.relacionamentos?.resposta
  const relacionamentos: any[] = Array.isArray(relRaw) ? relRaw : []

  // ── DataJud ──────────────────────────────────────────────────────────────────
  const dj      = data?.datajud ?? null
  const djTotal = dj?.total ?? 0

  // ── Sanções Gov (TCU / CEIS / CNEP) ─────────────────────────────────────────
  const sanc       = data?.sancoes ?? {}
  const temSancao  = !!(sanc?.temSancao)
  const inidoneos  = Array.isArray(sanc?.inidoneos)   ? sanc.inidoneos   : []
  const inabilit   = Array.isArray(sanc?.inabilitados) ? sanc.inabilitados : []
  const contasIrr  = Array.isArray(sanc?.contasIrreg) ? sanc.contasIrreg : []
  const ceisArr    = Array.isArray(sanc?.ceis)         ? sanc.ceis         : []
  const cnepArr    = Array.isArray(sanc?.cnep)         ? sanc.cnep         : []
  const totalSanc  = inidoneos.length + inabilit.length + contasIrr.length + ceisArr.length + cnepArr.length

  type S = 'ok' | 'warn' | 'error'
  const statusGrid: { label: string; status: S; detalhe: string }[] = [
    ...(isFalecido ? [{ label: 'TITULAR FALECIDO', status: 'error' as S, detalhe: 'Óbito registrado na base Assertiva' }] : []),
    { label: 'Situação CPF',        status: isFalecido ? 'error' : cpfOk ? 'ok' : 'error', detalhe: sit },
    { label: 'Sanções Gov. Federal', status: temSancao ? 'error' : 'ok', detalhe: temSancao ? `${totalSanc} sanção(ões) — TCU/CEIS/CNEP` : 'Nada consta' },
    { label: 'Processos Judiciais', status: djTotal > 0 ? 'error' : 'ok', detalhe: djTotal > 0 ? `${djTotal} processo(s) — DataJud CNJ` : 'Nada consta' },
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
        </div>
      </div>

      {/* Alerta de falecido — banner crítico */}
      {isFalecido && (
        <div className="mb-4 p-4 bg-red-700 text-white rounded-xl flex items-center gap-3">
          <Skull className="w-6 h-6 shrink-0" />
          <div>
            <p className="font-bold text-sm">TITULAR FALECIDO</p>
            <p className="text-xs text-red-200 mt-0.5">A Assertiva registra óbito para este CPF. Qualquer transação em nome deste titular deve ser tratada com extrema cautela.</p>
          </div>
        </div>
      )}

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
          <Campo label="Situação CPF"     value={isFalecido ? `TITULAR FALECIDO — ${sit}` : sit} />
          {b.dataObito && <Campo label="Data do óbito" value={v(b.dataObito)} />}
          <Campo label="Nome da mãe"      value={v(b.nomeMae ?? b.mae)} />
          {b.nomePai && <Campo label="Nome do pai" value={v(b.nomePai)} />}
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

      {/* Processos Judiciais — DataJud CNJ */}
      {dj !== null && (
        <div className={`card p-5 mb-4 border ${djTotal > 0 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
          <h3 className={`text-sm font-bold mb-3 uppercase tracking-wide flex items-center gap-2 ${djTotal > 0 ? 'text-red-700' : 'text-green-700'}`}>
            <AlertCircle className="w-4 h-4" />
            Processos Judiciais — DataJud CNJ
            {djTotal > 0 && (
              <span className="ml-1 bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">{djTotal}</span>
            )}
          </h3>
          {djTotal === 0 ? (
            <p className="text-xs text-green-700">Nenhum processo encontrado nos tribunais estaduais para <strong>{dj.nomeUsado}</strong>.</p>
          ) : (
            <div className="space-y-2">
              {dj.processos.slice(0, 8).map((p: any, i: number) => {
                const corRisco = p.risco === 'alto' ? 'text-red-700 bg-red-100' : p.risco === 'medio' ? 'text-yellow-700 bg-yellow-100' : 'text-gray-600 bg-gray-100'
                return (
                  <div key={i} className="py-2 border-b border-red-200 last:border-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-mono text-red-800 truncate">{p.numero}</p>
                        {p.classe && <p className="text-xs text-red-700 font-semibold mt-0.5">{p.classe}</p>}
                        {p.assuntos?.length > 0 && (
                          <p className="text-xs text-red-600 mt-0.5">{p.assuntos.slice(0, 2).join(' · ')}</p>
                        )}
                        <p className="text-xs text-red-500 mt-0.5">
                          {[p.tribunal, p.dataAjuizamento].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 ${corRisco}`}>
                        {p.risco === 'alto' ? 'Alto risco' : p.risco === 'medio' ? 'Médio risco' : 'Baixo risco'}
                      </span>
                    </div>
                  </div>
                )
              })}
              {djTotal > 8 && (
                <p className="text-xs text-red-500 mt-1">+{djTotal - 8} processos no PDF completo</p>
              )}
            </div>
          )}
          <p className="text-xs text-gray-400 mt-3">Fonte: DataJud CNJ · Pesquisa por nome: {dj.nomeUsado} · Tribunais: TJSP, TJRJ, TJMG, TJRS, TJPR, TJBA, TJGO, TJCE, TJSC, TJPE</p>
          <a href={`/api/pdf/cpf/${cpf}`} className="text-xs text-brand-green font-semibold hover:underline mt-1 block">
            PDF completo →
          </a>
        </div>
      )}

      {/* Sanções Gov. Federal — TCU / CEIS / CNEP */}
      <div className={`card p-5 mb-4 border ${temSancao ? 'border-red-300 bg-red-50' : 'border-green-200 bg-green-50'}`}>
        <h3 className={`text-sm font-bold mb-3 uppercase tracking-wide flex items-center gap-2 ${temSancao ? 'text-red-700' : 'text-green-700'}`}>
          {temSancao ? <ShieldAlert className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
          Sanções Gov. Federal — TCU / CEIS / CNEP
          {temSancao && <span className="ml-1 bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">{totalSanc}</span>}
        </h3>
        {!temSancao ? (
          <p className="text-xs text-green-700">Nada consta nos cadastros TCU (inidôneos, inabilitados, contas irregulares), CEIS e CNEP.</p>
        ) : (
          <div className="space-y-3">
            {inidoneos.length > 0 && (
              <div>
                <p className="text-xs font-bold text-red-700 mb-1">Inidôneo TCU ({inidoneos.length})</p>
                {inidoneos.slice(0, 3).map((s: any, i: number) => (
                  <p key={i} className="text-xs text-red-600 py-1 border-b border-red-200 last:border-0">{s.nome ?? s.parteNome ?? JSON.stringify(s)}</p>
                ))}
              </div>
            )}
            {inabilit.length > 0 && (
              <div>
                <p className="text-xs font-bold text-red-700 mb-1">Inabilitado TCU ({inabilit.length})</p>
                {inabilit.slice(0, 3).map((s: any, i: number) => (
                  <p key={i} className="text-xs text-red-600 py-1 border-b border-red-200 last:border-0">{s.nome ?? s.parteNome ?? JSON.stringify(s)}</p>
                ))}
              </div>
            )}
            {contasIrr.length > 0 && (
              <div>
                <p className="text-xs font-bold text-red-700 mb-1">Contas Irregulares TCU ({contasIrr.length})</p>
                {contasIrr.slice(0, 3).map((s: any, i: number) => (
                  <p key={i} className="text-xs text-red-600 py-1 border-b border-red-200 last:border-0">{s.nome ?? s.parteNome ?? JSON.stringify(s)}</p>
                ))}
              </div>
            )}
            {ceisArr.length > 0 && (
              <div>
                <p className="text-xs font-bold text-red-700 mb-1">CEIS — Empresas Inidôneas/Suspensas ({ceisArr.length})</p>
                {ceisArr.slice(0, 3).map((s: any, i: number) => (
                  <div key={i} className="py-1 border-b border-red-200 last:border-0">
                    <p className="text-xs text-red-700 font-medium">{s.nomeSancionado ?? s.nome ?? ''}</p>
                    <p className="text-xs text-red-500">{s.orgaoSancionador ?? ''}{s.dataInicioSancao ? ` · ${s.dataInicioSancao}` : ''}</p>
                  </div>
                ))}
              </div>
            )}
            {cnepArr.length > 0 && (
              <div>
                <p className="text-xs font-bold text-red-700 mb-1">CNEP — Empresas Punidas ({cnepArr.length})</p>
                {cnepArr.slice(0, 3).map((s: any, i: number) => (
                  <div key={i} className="py-1 border-b border-red-200 last:border-0">
                    <p className="text-xs text-red-700 font-medium">{s.nomeSancionado ?? s.nome ?? ''}</p>
                    <p className="text-xs text-red-500">{s.orgaoSancionador ?? ''}{s.dataInicioSancao ? ` · ${s.dataInicioSancao}` : ''}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <p className="text-xs text-gray-400 mt-3">Fonte: TCU (certidoes.apps.tcu.gov.br) · CGU/CEIS/CNEP (Portal da Transparência)</p>
      </div>

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

      <p className="text-xs text-brand-gray text-center mt-4 mb-6">
        Consulta realizada em {new Date().toLocaleString('pt-BR')} · Dados de bases públicas e privadas
      </p>
    </div>
  )
}
