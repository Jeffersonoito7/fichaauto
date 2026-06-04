'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Download, ChevronDown, Loader2, XCircle } from 'lucide-react'

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface ReportData {
  placa: any; binFederal: any; sinistro: any
  gravame: any; leilao: any; chassi: any
  binEstadual: any; fipe: any; erros: string[]
}

type TipoCard = 'normal' | 'alerta' | 'atencao'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function val(v: any, fallback = 'Não informado') {
  return (v === null || v === undefined || v === '') ? fallback : String(v)
}
function num(v: any) {
  return parseFloat(String(v ?? 0).replace(/[^\d,.-]/g, '').replace(',', '.')) || 0
}
function tipoRestr(s: string): TipoCard {
  const u = (s ?? '').toUpperCase()
  if (!u || u === 'NADA CONSTA' || u === 'SEM RESTRICAO' || u === 'SEM RESTRIÇÃO' || u === 'NORMAL') return 'normal'
  if (u.includes('ALIEN') || u.includes('FIDUCIARIA') || u.includes('ONUS') || u.includes('ÔNUS')) return 'atencao'
  return 'alerta'
}
function tipoMoeda(v: any): TipoCard { return num(v) > 0 ? 'alerta' : 'normal' }
function moedaBR(v: any) {
  const n = num(v)
  return n > 0 ? `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'NADA CONSTA'
}

// ─── Score ────────────────────────────────────────────────────────────────────
function calcScore(data: ReportData): number {
  let s = 100
  const j = JSON.stringify(data ?? {}).toUpperCase()
  if (j.includes('RENAJUD')) s -= 20
  if (j.includes('ALIENAC') && !j.includes('BAIXADO')) s -= 10
  if (j.includes('ROUBO') && !j.includes('NADA CONSTA') && !j.includes('NAO EXISTEM')) s -= 30
  if (j.includes('SINISTRO') && j.includes('CONSTA') && !j.includes('NADA CONSTA') && !j.includes('NAO EXISTEM')) s -= 15
  const lr = data.leilao?.resposta ?? data.leilao ?? {}
  const lTotal = (lr?.baseA?.length ?? 0) + (lr?.baseB?.length ?? 0) + (lr?.remarketing?.length ?? 0) + (lr?.lotes?.length ?? 0)
  if (lTotal > 0) s -= 15
  return Math.max(s, 10)
}

// ─── Componentes ──────────────────────────────────────────────────────────────
function ScoreRing({ score }: { score: number }) {
  const r = 40, c = 2 * Math.PI * r
  const offset = c - (score / 100) * c
  const color = score >= 70 ? '#4ade80' : score >= 50 ? '#fbbf24' : '#f87171'
  const label = score >= 70 ? 'Baixo risco' : score >= 50 ? 'Risco médio' : 'Alto risco'
  return (
    <div className="flex flex-col items-center shrink-0">
      <svg width="86" height="86" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="8" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset}
          transform="rotate(-90 50 50)" />
        <text x="50" y="46" textAnchor="middle" fill="white" fontSize="20" fontWeight="800">{score}</text>
        <text x="50" y="62" textAnchor="middle" fill="rgba(255,255,255,0.55)" fontSize="9">/ 100</text>
      </svg>
      <span className="text-[10px] font-semibold text-white/60 mt-0.5">{label}</span>
    </div>
  )
}

function SecaoAcordion({
  titulo, normal = 0, alerta = 0, atencao = 0, defaultAberto = false, children
}: {
  titulo: string; normal?: number; alerta?: number; atencao?: number; defaultAberto?: boolean; children: React.ReactNode
}) {
  const [aberto, setAberto] = useState(defaultAberto)
  return (
    <div className="border border-brand-border rounded-xl overflow-hidden mb-3 shadow-card">
      <button
        onClick={() => setAberto(v => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-white hover:bg-brand-gray-light transition-colors"
      >
        <div className="flex items-center gap-3 flex-wrap text-left">
          <span className="font-bold text-sm text-brand-blue">{titulo}</span>
          <span className="text-xs font-semibold text-green-600">{normal}&nbsp;NORMAL</span>
          <span className={`text-xs font-semibold ${alerta > 0 ? 'text-red-600' : 'text-brand-gray'}`}>{alerta}&nbsp;ALERTA</span>
          <span className={`text-xs font-semibold ${atencao > 0 ? 'text-amber-500' : 'text-brand-gray'}`}>{atencao}&nbsp;ATENÇÃO</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-brand-gray shrink-0 transition-transform ${aberto ? 'rotate-180' : ''}`} />
      </button>
      {aberto && (
        <div className="px-4 pb-4 pt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 border-t border-brand-border bg-gray-50/40">
          {children}
        </div>
      )}
    </div>
  )
}

function CardStatus({ titulo, valor, tipo }: { titulo: string; valor: string; tipo: TipoCard }) {
  const bg = tipo === 'normal' ? 'bg-green-600' : tipo === 'alerta' ? 'bg-red-700' : 'bg-amber-500'
  return (
    <div className={`${bg} text-white rounded-lg p-4`}>
      <p className="text-[9px] font-bold uppercase tracking-widest mb-2 pb-1.5 border-b border-white/20 leading-none">{titulo}</p>
      <p className="text-[13px] font-semibold leading-snug">{valor}</p>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function RelatorioPage() {
  const { id } = useParams<{ id: string }>()
  const [data, setData]       = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro]       = useState('')

  useEffect(() => {
    async function buscar() {
      try {
        const res = await fetch('/api/consulta', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ placa: id }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Erro na consulta')
        setData(json)
      } catch (e: any) {
        setErro(e.message)
      } finally {
        setLoading(false)
      }
    }
    buscar()
  }, [id])

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <Loader2 className="w-10 h-10 text-brand-green animate-spin" />
      <p className="font-semibold text-brand-dark">Consultando veículo...</p>
      <p className="text-sm text-brand-gray">Aguarde, buscando dados em tempo real</p>
    </div>
  )

  if (erro) return (
    <div className="max-w-lg mx-auto text-center py-20">
      <XCircle className="w-12 h-12 text-brand-danger mx-auto mb-4" />
      <h2 className="text-xl font-bold text-brand-dark mb-2">Erro na consulta</h2>
      <p className="text-brand-gray mb-6">{erro}</p>
      <Link href="/dashboard" className="btn-primary px-6 py-3">Tentar novamente</Link>
    </div>
  )

  if (!data) return null

  // ─── Extração de dados ──────────────────────────────────────────────────────
  const raw    = data.placa ?? {}
  const pDesc  = raw.resposta?.descricao       ?? raw
  const pIdent = raw.resposta?.identificadores ?? raw
  const pMov   = raw.resposta?.movimentacao    ?? raw
  const pRestr = raw.resposta?.restricoes      ?? raw
  const pFicha = raw.resposta?.fichaTecnica    ?? raw

  const mm      = val(pDesc.marcaModelo ?? pDesc.marca, 'VEÍCULO')
  const cor     = val(pDesc.cor, '')
  const anoFab  = val(pDesc.anoFabricacao ?? pDesc.ano, '')
  const anoMod  = val(pDesc.anoModelo, '')
  const anoStr  = anoFab && anoMod ? `${anoFab}/${anoMod}` : anoFab
  const placaFmt = val(pIdent.placa ?? id).toUpperCase()

  // Situação
  const situacaoV = val(pMov.situacao ?? pMov.situacaoVeiculo, 'EM CIRCULAÇÃO').toUpperCase()
  const situacaoC = val(pRestr.situacaoChassi, 'NORMAL').toUpperCase()

  // Restrições DETRAN (consulta-base)
  const rDETRAN = [
    val(pRestr.restricaoEstadual01 ?? pRestr.rest01, 'NADA CONSTA').toUpperCase(),
    val(pRestr.restricaoEstadual02 ?? pRestr.rest02, 'NADA CONSTA').toUpperCase(),
    val(pRestr.restricaoEstadual03 ?? pRestr.rest03, 'NADA CONSTA').toUpperCase(),
    val(pRestr.restricaoEstadual04 ?? pRestr.rest04, 'NADA CONSTA').toUpperCase(),
  ]

  // BIN Federal
  const binFedNull = !data.binFederal
  const binFedJ    = JSON.stringify(data.binFederal ?? {}).toUpperCase()
  const temRenajud = binFedJ.includes('RENAJUD') || rDETRAN.some(r => r.includes('RENAJUD'))
  const temRoubo   = !binFedNull && binFedJ.includes('ROUBO') && !binFedJ.includes('NADA CONSTA') && !binFedJ.includes('NAO EXISTEM')

  // BIN Estadual
  const binEst     = data.binEstadual ?? null
  const binEstNull = !binEst
  const binEstResp = binEst?.resposta ?? binEst ?? {}

  const rDENATRAN = [
    val(binEstResp?.restricoes?.restricaoDenatran01 ?? binEstResp?.restricaoDenatran01 ?? binEstResp?.restricaoDenatran1, '').toUpperCase() || 'SEM RESTRICAO',
    val(binEstResp?.restricoes?.restricaoDenatran02 ?? binEstResp?.restricaoDenatran02 ?? binEstResp?.restricaoDenatran2, '').toUpperCase() || 'SEM RESTRICAO',
    val(binEstResp?.restricoes?.restricaoDenatran03 ?? binEstResp?.restricaoDenatran03 ?? binEstResp?.restricaoDenatran3, '').toUpperCase() || 'SEM RESTRICAO',
    val(binEstResp?.restricoes?.restricaoDenatran04 ?? binEstResp?.restricaoDenatran04 ?? binEstResp?.restricaoDenatran4, '').toUpperCase() || 'SEM RESTRICAO',
  ]

  // Multas individuais (do BIN Estadual)
  const multasRaw = binEstResp?.multas?.lista ?? binEstResp?.multas?.infrações
                 ?? binEstResp?.infrações ?? binEstResp?.listaMultas
                 ?? binEstResp?.multas
  const multasLista: any[] = Array.isArray(multasRaw) ? multasRaw : []

  // Comunicação de venda
  const comunicVendaRaw = binEstResp?.comunicacaoVenda?.situacao
                       ?? binEstResp?.comunicacaoVenda
                       ?? binEstResp?.comunicacao?.situacao
                       ?? binEstResp?.comunicacao
  const comunicVenda = val(comunicVendaRaw, binEstNull ? 'NÃO CONSULTADO' : 'NADA CONSTA').toUpperCase()

  // Alterações de características
  const altRaw = binEstResp?.alteracoes ?? binEstResp?.alteracoesCaracteristicas ?? {}
  const alteracoes = {
    COMBUSTÍVEL: val(altRaw?.combustivel ?? altRaw?.tipoCombustivel, 'Sem Alteração'),
    CHASSI:      val(altRaw?.chassi      ?? altRaw?.numeroChassi,    'Sem Alteração'),
    MOTOR:       val(altRaw?.motor       ?? altRaw?.numeroMotor,     'Sem Alteração'),
    COR:         val(altRaw?.cor         ?? altRaw?.corVeiculo,      'Sem Alteração'),
  }

  // Sinistro
  const sinistroNull = !data.sinistro
  const sinistroJ    = JSON.stringify(data.sinistro ?? {}).toUpperCase()
  const temSinistro  = !sinistroNull && sinistroJ.includes('CONSTA') && !sinistroJ.includes('NADA CONSTA') && !sinistroJ.includes('NAO EXISTEM') && !sinistroJ.includes('NÃO EXISTEM')
  const sinistroResp = data.sinistro?.resposta ?? data.sinistro ?? {}
  const sinistroDesc = val(
    data.sinistro?.cabecalho?.resultado ?? sinistroResp?.situacao ?? sinistroResp?.resultado,
    sinistroNull ? 'NÃO CONSULTADO' : temSinistro ? 'CONSTA INDÍCIO' : 'Não Existem Indícios de Sinistro'
  ).toUpperCase()

  // Leilão
  const leilaoNull = !data.leilao
  const leilResp   = data.leilao?.resposta ?? data.leilao ?? {}
  const leilaoBaseA   = Array.isArray(leilResp?.baseA   ?? leilResp?.historicoBaseA)  ? (leilResp?.baseA   ?? leilResp?.historicoBaseA)  : []
  const leilaoBaseB   = Array.isArray(leilResp?.baseB   ?? leilResp?.historicoBaseB)  ? (leilResp?.baseB   ?? leilResp?.historicoBaseB)  : []
  const leilaoRemark  = Array.isArray(leilResp?.remarketing ?? leilResp?.historicoRem) ? (leilResp?.remarketing ?? leilResp?.historicoRem) : []
  const leilaoLotes   = Array.isArray(leilResp?.lotes   ?? leilResp?.leiloes)         ? (leilResp?.lotes   ?? leilResp?.leiloes)         : []
  const todosLeilao   = [...leilaoBaseA, ...leilaoBaseB, ...leilaoRemark, ...leilaoLotes]
  const temLeilao     = todosLeilao.length > 0

  // Gravame
  const gravameNull = !data.gravame
  const gravResp    = data.gravame?.resposta ?? data.gravame ?? {}
  const gravames: any[] = Array.isArray(gravResp?.gravames ?? gravResp?.listaGravames) ? (gravResp?.gravames ?? gravResp?.listaGravames) : []

  // Débitos (consulta-base)
  const licenciamento  = num(raw.licenciamento)
  const ipvaVal        = num(raw.ipva)
  const multasTotal    = num(raw.multas ?? raw.totalMultas)
  const dpvat          = val(raw.dpvat, 'NAODISPONIVEL').toUpperCase()

  // Score
  const score = calcScore(data)
  const agora = new Date().toLocaleString('pt-BR')

  // ─── Contadores ───────────────────────────────────────────────────────────────
  const situacaoVTipo: TipoCard = (situacaoV === 'CIRCULACAO' || situacaoV === 'EM CIRCULAÇÃO' || situacaoV === 'EM CIRCULACAO') ? 'normal' : 'alerta'
  const situacaoCTipo: TipoCard = situacaoC === 'NORMAL' ? 'normal' : 'alerta'
  const altTipos = Object.values(alteracoes).map(v => v === 'Sem Alteração' ? 'normal' as TipoCard : 'alerta' as TipoCard)

  const gCards: TipoCard[] = [
    situacaoVTipo, situacaoCTipo,
    temLeilao ? 'alerta' : 'normal',
    binFedNull ? 'atencao' : temRoubo ? 'alerta' : 'normal',
    sinistroNull ? 'atencao' : temSinistro ? 'alerta' : 'normal',
    altTipos.some(t => t !== 'normal') ? 'alerta' : 'normal',
    temRenajud ? 'alerta' : 'normal',
    comunicVenda.includes('NADA') || comunicVenda.includes('NÃO CONSULTADO') ? 'normal' : 'atencao',
    rDENATRAN.some(r => tipoRestr(r) === 'alerta') ? 'alerta' : rDENATRAN.some(r => tipoRestr(r) === 'atencao') ? 'atencao' : 'normal',
  ]

  function cnt(cards: TipoCard[], tipo: TipoCard) { return cards.filter(c => c === tipo).length }

  const todosRestr = [...rDETRAN, ...rDENATRAN]
  const gravNormal   = gravames.filter((g: any) => { const s = (g.situacao ?? g.tipo ?? g.tipoGravame ?? '').toUpperCase(); return s.includes('BAIXADO') || s.includes('HISTORICO') || s.includes('HISTÓRICO') }).length
  const gravAtencao  = gravames.filter((g: any) => { const s = (g.situacao ?? g.tipo ?? g.tipoGravame ?? '').toUpperCase(); return s.includes('ATUAL') || s.includes('ATIVO') || s.includes('ALIEN') }).length

  return (
    <div className="max-w-4xl mx-auto">

      {/* Topbar */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-2 rounded-lg hover:bg-brand-gray-light transition-colors">
            <ArrowLeft className="w-4 h-4 text-brand-gray" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-brand-dark font-mono">{id}</h1>
            <p className="text-xs text-brand-gray">{agora}</p>
          </div>
        </div>
        <a href={`/api/pdf/${id}`} target="_blank"
           className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold bg-brand-blue hover:bg-brand-blue/90 text-white rounded-xl transition-colors">
          <Download className="w-4 h-4" /> Visualizar PDF Completo
        </a>
      </div>

      {/* Banner */}
      <div className="rounded-2xl p-5 text-white mb-4"
           style={{ background: 'linear-gradient(135deg, #007A3D 0%, #00A651 60%, #005C2E 100%)' }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-white/55 text-[10px] uppercase tracking-widest mb-0.5">Ano Modelo {anoStr}</p>
            <h2 className="text-xl font-extrabold uppercase leading-tight">{mm}</h2>
            <p className="text-3xl font-mono font-extrabold tracking-[0.25em] mt-1">{placaFmt}</p>
            {cor && <p className="text-white/55 text-xs mt-1">Cor {cor.toUpperCase()}</p>}
          </div>
          <ScoreRing score={score} />
        </div>
      </div>

      {/* Erros da API */}
      {data.erros?.length > 0 && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
          <p className="text-xs font-semibold text-yellow-800 mb-1">Módulos com falha:</p>
          {data.erros.map((e: string, i: number) => (
            <p key={i} className="text-xs text-yellow-700">{e}</p>
          ))}
        </div>
      )}

      {/* ── GERAL ──────────────────────────────────────────────────────────── */}
      <SecaoAcordion titulo="GERAL"
        normal={cnt(gCards, 'normal')} alerta={cnt(gCards, 'alerta')} atencao={cnt(gCards, 'atencao')}
        defaultAberto>
        <CardStatus titulo="Situação do Veículo" valor={situacaoV} tipo={situacaoVTipo} />
        <CardStatus titulo="Situação Chassi" valor={situacaoC}
          tipo={situacaoCTipo} />
        <CardStatus titulo="Histórico de Leilão"
          valor={leilaoNull ? 'Não consultado' : temLeilao ? 'Existem registros de histórico de Leilão' : 'Nada consta'}
          tipo={leilaoNull ? 'atencao' : temLeilao ? 'alerta' : 'normal'} />
        <CardStatus titulo="Histórico Roubo/Furto"
          valor={binFedNull ? 'Não consultado' : temRoubo ? 'CONSTA OCORRÊNCIA' : 'Não Existem Registros de histórico de Roubo/Furto'}
          tipo={binFedNull ? 'atencao' : temRoubo ? 'alerta' : 'normal'} />
        <CardStatus titulo="Indício de Sinistro"
          valor={sinistroNull ? 'Não consultado' : temSinistro ? 'CONSTA INDÍCIO' : 'Não localizamos registros que mostre algum Indício de Sinistro'}
          tipo={sinistroNull ? 'atencao' : temSinistro ? 'alerta' : 'normal'} />
        <CardStatus titulo="Alterações de Características"
          valor={altTipos.every(t => t === 'normal') ? 'Não Existem alterações de Características' : 'CONSTA ALTERAÇÃO'}
          tipo={altTipos.some(t => t !== 'normal') ? 'alerta' : 'normal'} />
        <CardStatus titulo="RENAJUD"
          valor={temRenajud ? 'CONSTA RESTRIÇÃO RENAJUD' : 'NADA CONSTA'}
          tipo={temRenajud ? 'alerta' : 'normal'} />
        <CardStatus titulo="Comun. Venda" valor={comunicVenda}
          tipo={comunicVenda.includes('NADA') || comunicVenda.includes('NÃO CONSULTADO') ? 'normal' : 'atencao'} />
        <CardStatus titulo="Restrições DENATRAN"
          valor={rDENATRAN.some(r => tipoRestr(r) !== 'normal') ? 'Existem Registros críticos' : 'NADA CONSTA'}
          tipo={rDENATRAN.some(r => tipoRestr(r) === 'alerta') ? 'alerta' : rDENATRAN.some(r => tipoRestr(r) === 'atencao') ? 'atencao' : 'normal'} />
        <CardStatus titulo="Restrições DETRAN"
          valor={rDETRAN.some(r => tipoRestr(r) !== 'normal') ? 'Existem Registros críticos' : 'NADA CONSTA'}
          tipo={rDETRAN.some(r => tipoRestr(r) === 'alerta') ? 'alerta' : rDETRAN.some(r => tipoRestr(r) === 'atencao') ? 'atencao' : 'normal'} />
      </SecaoAcordion>

      {/* ── RESTRIÇÕES ─────────────────────────────────────────────────────── */}
      <SecaoAcordion titulo="RESTRIÇÕES"
        normal={todosRestr.filter(r => tipoRestr(r) === 'normal').length}
        alerta={todosRestr.filter(r => tipoRestr(r) === 'alerta').length}
        atencao={todosRestr.filter(r => tipoRestr(r) === 'atencao').length}>
        {rDETRAN.map((r, i) => (
          <CardStatus key={`d${i}`} titulo={`DETRAN - RESTRIÇÃO ${i + 1}`} valor={r} tipo={tipoRestr(r)} />
        ))}
        {rDENATRAN.map((r, i) => (
          <CardStatus key={`dn${i}`} titulo={`DENATRAN - RESTRIÇÃO ${i + 1}`} valor={r} tipo={tipoRestr(r)} />
        ))}
      </SecaoAcordion>

      {/* ── HISTÓRICO LEILÃO ───────────────────────────────────────────────── */}
      <SecaoAcordion titulo="HISTÓRICO LEILÃO"
        normal={!leilaoNull && !temLeilao ? 1 : 0}
        alerta={todosLeilao.length}
        atencao={leilaoNull ? 1 : 0}>
        {leilaoNull ? (
          <CardStatus titulo="HISTÓRICO DE LEILÃO" valor="NÃO CONSULTADO NESTA PESQUISA" tipo="atencao" />
        ) : todosLeilao.length === 0 ? (
          <CardStatus titulo="HISTÓRICO DE LEILÃO" valor="NADA CONSTA" tipo="normal" />
        ) : todosLeilao.map((l: any, i: number) => {
          const dataL  = val(l.data ?? l.dataLeilao ?? l.dataCadastro, '')
          const desc   = val(l.descricao ?? l.orgao ?? l.comarca ?? l.vara ?? l.leilaoeiro ?? l.evento, '')
          const linha  = [dataL, desc].filter(Boolean).join(' ')
          return <CardStatus key={i} titulo={`LEILÃO ${i + 1}`} valor={linha || '---'} tipo="alerta" />
        })}
      </SecaoAcordion>

      {/* ── HISTÓRICO ROUBO/FURTO ──────────────────────────────────────────── */}
      <SecaoAcordion titulo="HISTÓRICO ROUBO/FURTO"
        normal={!binFedNull && !temRoubo ? 1 : 0}
        alerta={temRoubo ? 1 : 0}
        atencao={0}>
        <CardStatus titulo="HISTÓRICO DE ROUBO/FURTO"
          valor={binFedNull ? 'NÃO CONSULTADO' : temRoubo ? 'CONSTA OCORRÊNCIA' : 'NADA CONSTA'}
          tipo={binFedNull ? 'atencao' : temRoubo ? 'alerta' : 'normal'} />
      </SecaoAcordion>

      {/* ── ALTERAÇÃO CARACTERÍSTICAS ──────────────────────────────────────── */}
      <SecaoAcordion titulo="ALTERAÇÃO CARACTERÍSTICAS"
        normal={altTipos.filter(t => t === 'normal').length}
        alerta={altTipos.filter(t => t === 'alerta').length}
        atencao={0}>
        {(Object.entries(alteracoes) as [string, string][]).map(([k, v], i) => (
          <CardStatus key={k} titulo={k} valor={v.toUpperCase()} tipo={altTipos[i]} />
        ))}
      </SecaoAcordion>

      {/* ── COMUNIC. VENDA ─────────────────────────────────────────────────── */}
      <SecaoAcordion titulo="COMUNIC. VENDA" normal={1} alerta={0} atencao={0}>
        <CardStatus titulo="COMUN. VENDA" valor={comunicVenda} tipo="normal" />
      </SecaoAcordion>

      {/* ── DÉBITOS ────────────────────────────────────────────────────────── */}
      <SecaoAcordion titulo="DÉBITOS"
        normal={licenciamento === 0 && multasTotal === 0 ? 1 : 0}
        alerta={[licenciamento, multasTotal, ipvaVal].filter(v => v > 0).length}
        atencao={0}>
        <CardStatus titulo="LICENCIAMENTO"
          valor={licenciamento > 0 ? licenciamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : 'NADA CONSTA'}
          tipo={tipoMoeda(licenciamento)} />
        <CardStatus titulo="DPVAT" valor={dpvat} tipo="atencao" />
        <CardStatus titulo="MULTAS" valor={moedaBR(multasTotal)} tipo={tipoMoeda(multasTotal)} />
        {ipvaVal > 0 && (
          <CardStatus titulo="IPVA" valor={moedaBR(ipvaVal)} tipo="alerta" />
        )}
      </SecaoAcordion>

      {/* ── MULTAS (individuais) ───────────────────────────────────────────── */}
      {multasLista.length > 0 && (
        <SecaoAcordion titulo="MULTAS" normal={0} alerta={0} atencao={multasLista.length}>
          {multasLista.map((m: any, i: number) => {
            const dataM = val(m.data ?? m.dataInfracao ?? m.dataMulta, '')
            const valor = m.valor ? `R$ ${num(m.valor).toFixed(2)}` : ''
            const tit   = [dataM, valor].filter(Boolean).join(' - ')
            const desc  = val(m.descricao ?? m.infracao ?? m.tipoInfracao ?? m.natureza, '---').toUpperCase()
            return <CardStatus key={i} titulo={tit || `MULTA ${i + 1}`} valor={desc} tipo="atencao" />
          })}
        </SecaoAcordion>
      )}

      {/* ── INDÍCIO DE SINISTRO ────────────────────────────────────────────── */}
      <SecaoAcordion titulo="INDÍCIO DE SINISTRO"
        normal={!sinistroNull && !temSinistro ? 1 : 0}
        alerta={temSinistro ? 1 : 0}
        atencao={sinistroNull ? 1 : 0}>
        <CardStatus titulo="INDÍCIO DE SINISTRO"
          valor={sinistroNull ? 'NÃO CONSULTADO' : sinistroDesc}
          tipo={sinistroNull ? 'atencao' : temSinistro ? 'alerta' : 'normal'} />
      </SecaoAcordion>

      {/* ── INFORMAÇÕES ADICIONAIS ─────────────────────────────────────────── */}
      <SecaoAcordion titulo="INFORMAÇÕES ADICIONAIS"
        normal={1}
        alerta={[licenciamento, multasTotal].filter(v => v > 0).length}
        atencao={0}>
        <CardStatus titulo="OBS GERAIS" valor={val(raw.obsGerais, 'NADA CONSTA').toUpperCase()} tipo="normal" />
        {licenciamento > 0 && (
          <CardStatus
            titulo="LICENCIAMENTO"
            valor={`Venc. - valor R$ ${licenciamento.toFixed(2)} - atual R$ ${licenciamento.toFixed(2)}`}
            tipo="alerta" />
        )}
        {multasTotal > 0 && (
          <CardStatus
            titulo="MULTA"
            valor={`Venc. - valor R$${multasTotal.toFixed(2)} - atual R$${multasTotal.toFixed(2)}`}
            tipo="alerta" />
        )}
      </SecaoAcordion>

      {/* ── GRAVAME ────────────────────────────────────────────────────────── */}
      <SecaoAcordion titulo="GRAVAME"
        normal={gravameNull ? 0 : gravames.length === 0 ? 1 : gravNormal}
        alerta={0}
        atencao={gravAtencao}>
        {gravameNull ? (
          <CardStatus titulo="GRAVAME" valor="NÃO CONSULTADO" tipo="atencao" />
        ) : gravames.length === 0 ? (
          <CardStatus titulo="GRAVAME" valor="NADA CONSTA" tipo="normal" />
        ) : gravames.map((g: any, i: number) => {
          const banco  = val(g.nome ?? g.agente ?? g.nomeAgente ?? g.nomeFinanciador, '---').toUpperCase()
          const dataG  = val(g.data ?? g.dataGravame ?? g.dataInclusao, '')
          const sitG   = val(g.situacao ?? g.tipoGravame ?? g.tipo ?? g.status, '---').toUpperCase()
          const isAtual = sitG.includes('ATUAL') || sitG.includes('ATIVO') || sitG.includes('ALIEN')
          const tit    = [dataG, banco].filter(Boolean).join(' ')
          return (
            <CardStatus key={i} titulo={tit || `GRAVAME ${i + 1}`}
              valor={isAtual ? `ATUAL - ${sitG}` : `HISTÓRICO - ${sitG}`}
              tipo={isAtual ? 'atencao' : 'normal'} />
          )
        })}
      </SecaoAcordion>

    </div>
  )
}
