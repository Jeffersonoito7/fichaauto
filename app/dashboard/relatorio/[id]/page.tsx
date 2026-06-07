'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Download, ChevronDown, Loader2, XCircle, Lock } from 'lucide-react'
import { temModulo, planoQueTemModulo, PLANOS, type PlanoId } from '@/lib/products'

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface ProcessoDatajud {
  numero: string; tribunal: string; classe: string
  assuntos: string[]; dataAjuizamento: string; orgaoJulgador: string
  risco: 'alto' | 'medio' | 'baixo'
}
interface ResultadoDatajud {
  total: number; altoRisco: number; medioRisco: number
  processos: ProcessoDatajud[]; nomeUsado: string
}
interface ReportData {
  placa: any; binFederal: any; sinistro: any
  gravame: any; leilao: any; chassi: any
  binEstadual: any; fipe: any; precificador: any
  csv: any; datajud: ResultadoDatajud | null; erros: string[]
}

type TipoCard = 'normal' | 'alerta' | 'atencao'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function val(v: any, fallback = 'Não informado') {
  if (v === null || v === undefined || v === '') return fallback
  if (typeof v === 'object') return v.titulo ?? v.descricao ?? v.nome ?? v.label ?? fallback
  return String(v)
}
function num(v: any) {
  const s = String(v ?? '0').trim()
  // formato BR: 5.089,18 (ponto=milhar, vírgula=decimal)
  if (s.includes(',')) return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0
  return parseFloat(s.replace(/[^\d.-]/g, '')) || 0
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
  const lTotal = Array.isArray(lr?.historicoLeilao) ? lr.historicoLeilao.length
    : (lr?.baseA?.length ?? 0) + (lr?.baseB?.length ?? 0) + (lr?.remarketing?.length ?? 0) + (lr?.lotes?.length ?? 0)
  if (lTotal > 0) s -= 15
  // Penalidade por processos judiciais do proprietário
  if (data.datajud) {
    if (data.datajud.altoRisco > 0)  s -= Math.min(data.datajud.altoRisco * 10, 25)
    if (data.datajud.medioRisco > 0) s -= Math.min(data.datajud.medioRisco * 5, 10)
  }
  return Math.max(s, 5)
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
  const temProblema = alerta > 0 || atencao > 0
  return (
    <div className="rounded-xl overflow-hidden mb-3 shadow-md border border-gray-200">
      <button
        onClick={() => setAberto(v => !v)}
        className={`w-full flex items-center justify-between px-5 py-4 transition-colors ${
          temProblema ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-700 hover:bg-gray-600'
        }`}
      >
        <div className="flex items-center gap-3 flex-wrap text-left">
          <span className="font-extrabold text-base text-white tracking-wide">{titulo}</span>
          <span className="text-[11px] font-bold bg-green-500/30 text-green-300 border border-green-500/40 px-2.5 py-0.5 rounded-full">{normal} NORMAL</span>
          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${alerta > 0 ? 'bg-red-500/30 text-red-300 border-red-500/40' : 'bg-white/10 text-white/40 border-white/10'}`}>{alerta} ALERTA</span>
          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${atencao > 0 ? 'bg-amber-500/30 text-amber-300 border-amber-500/40' : 'bg-white/10 text-white/40 border-white/10'}`}>{atencao} ATENÇÃO</span>
        </div>
        <ChevronDown className={`w-5 h-5 text-white/60 shrink-0 transition-transform ${aberto ? 'rotate-180' : ''}`} />
      </button>
      {aberto && (
        <div className="px-4 pb-4 pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 bg-gray-50">
          {children}
        </div>
      )}
    </div>
  )
}

function CardStatus({ titulo, valor, tipo }: { titulo: string; valor: string; tipo: TipoCard }) {
  const styles = {
    normal:  { bg: 'bg-green-600',  border: 'border-green-700',  badge: 'bg-green-700/60' },
    alerta:  { bg: 'bg-red-700',    border: 'border-red-800',    badge: 'bg-red-800/60'   },
    atencao: { bg: 'bg-amber-500',  border: 'border-amber-600',  badge: 'bg-amber-600/60' },
  }[tipo]
  return (
    <div className={`${styles.bg} text-white rounded-xl p-4 min-h-[90px] flex flex-col`}>
      <p className={`text-[10px] font-extrabold uppercase tracking-[0.12em] mb-3 pb-2 border-b ${styles.border} leading-none opacity-90`}>{titulo}</p>
      <p className="text-[15px] font-bold leading-snug mt-auto">{valor}</p>
    </div>
  )
}

function CardBloqueado({ titulo, planoNecessario }: { titulo: string; planoNecessario: PlanoId | null }) {
  const nome = planoNecessario ? PLANOS[planoNecessario]?.nome : 'Profissional'
  return (
    <div className="bg-gray-700 text-white rounded-xl p-4 min-h-[90px] flex flex-col opacity-60 border border-dashed border-gray-500">
      <div className="flex items-center gap-2 mb-2">
        <Lock className="w-3.5 h-3.5 text-purple-400" />
        <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] opacity-70">{titulo}</p>
      </div>
      <p className="text-xs text-white/50 mt-auto">
        Disponível no plano <span className="text-purple-300 font-bold">{nome}</span>
      </p>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function RelatorioPage() {
  const { id } = useParams<{ id: string }>()
  const [data, setData]         = useState<ReportData | null>(null)
  const [loading, setLoading]   = useState(true)
  const [erro, setErro]         = useState('')
  const [semSaldo, setSemSaldo] = useState(false)
  const [plano, setPlano]       = useState<PlanoId | null>(null)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => { if (d?.plano) setPlano(d.plano) }).catch(() => {})
  }, [])

  useEffect(() => {
    async function buscar() {
      try {
        const res = await fetch('/api/consulta', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ placa: id }),
        })
        const json = await res.json()
        if (res.status === 402) { setSemSaldo(true); setErro(json.error); return }
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

  if (semSaldo) return (
    <div className="max-w-lg mx-auto text-center py-20">
      <XCircle className="w-12 h-12 text-brand-warning mx-auto mb-4" />
      <h2 className="text-xl font-bold text-brand-dark mb-2">Saldo insuficiente</h2>
      <p className="text-brand-gray mb-6">Você não tem consultas disponíveis. Recarregue sua carteira para continuar.</p>
      <Link href="/dashboard/carteira" className="btn-primary px-6 py-3">Ir para carteira</Link>
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

  // BIN Federal — restricoes é um array de strings
  const binFedNull = !data.binFederal
  const binFedJ    = JSON.stringify(data.binFederal ?? {}).toUpperCase()
  const binFedResp = data.binFederal?.resposta ?? {}
  const binFedRestArr: string[] = Array.isArray(binFedResp?.restricoes) ? binFedResp.restricoes : []
  const temRenajud = binFedRestArr.some((r: string) => r.toUpperCase().includes('RENAJUD')) || binFedJ.includes('RENAJUD')
  const temRoubo   = binFedRestArr.some((r: string) => r.toUpperCase().includes('ROUBO') || r.toUpperCase().includes('FURTO'))

  // BIN Estadual
  const binEst     = data.binEstadual ?? null
  const binEstNull = !binEst
  const binEstResp = binEst?.resposta ?? binEst ?? {}

  // BIN Estadual — restricoes.outrasUFs é um array de strings
  const binEstOutrasUFs: string[] = Array.isArray(binEstResp?.restricoes?.outrasUFs)
    ? binEstResp.restricoes.outrasUFs
    : []
  const rDENATRAN = binEstOutrasUFs.length > 0
    ? binEstOutrasUFs.map((r: string) => (r ?? '').toUpperCase())
    : ['SEM RESTRICAO']

  // Multas individuais (do BIN Estadual)
  const multasRaw = binEstResp?.multas?.lista ?? binEstResp?.multas?.infrações
                 ?? binEstResp?.infrações ?? binEstResp?.listaMultas
                 ?? binEstResp?.multas
  const multasLista: any[] = Array.isArray(multasRaw) ? multasRaw : []

  // Comunicação de venda
  const comunicVendaRaw = binEstResp?.comunicacaoVenda?.situacao
                       ?? binEstResp?.comunicacaoVenda?.descricao
                       ?? binEstResp?.comunicacaoVenda?.status
  const comunicVenda = val(comunicVendaRaw, binEstNull ? 'NÃO CONSULTADO' : 'NADA CONSTA').toUpperCase()

  // Alterações de características
  const altRaw = binEstResp?.alteracoes ?? binEstResp?.alteracoesCaracteristicas ?? {}
  const alteracoes = {
    COMBUSTÍVEL: val(altRaw?.combustivel ?? altRaw?.tipoCombustivel, 'Sem Alteração'),
    CHASSI:      val(altRaw?.chassi      ?? altRaw?.numeroChassi,    'Sem Alteração'),
    MOTOR:       val(altRaw?.motor       ?? altRaw?.numeroMotor,     'Sem Alteração'),
    COR:         val(altRaw?.cor         ?? altRaw?.corVeiculo,      'Sem Alteração'),
  }

  // Sinistro — campo indicioSinistro é boolean
  const sinistroNull = !data.sinistro
  const sinistroJ    = JSON.stringify(data.sinistro ?? {}).toUpperCase()
  const temSinistro  = data.sinistro?.resposta?.indicioSinistro === true
    || (!sinistroNull && sinistroJ.includes('CONSTA') && !sinistroJ.includes('NADA CONSTA') && !sinistroJ.includes('NAO EXISTEM') && !sinistroJ.includes('NÃO EXISTEM'))
  const sinistroResp = data.sinistro?.resposta ?? data.sinistro ?? {}
  const sinistroDesc = val(
    data.sinistro?.cabecalho?.resultado ?? sinistroResp?.situacao ?? sinistroResp?.resultado,
    sinistroNull ? 'NÃO CONSULTADO' : temSinistro ? 'CONSTA INDÍCIO' : 'Não Existem Indícios de Sinistro'
  ).toUpperCase()

  // Leilão — API v3 retorna resposta.historicoLeilao[]
  const leilaoNull = !data.leilao
  const leilResp   = data.leilao?.resposta ?? data.leilao ?? {}
  const todosLeilao: any[] = Array.isArray(leilResp?.historicoLeilao)
    ? leilResp.historicoLeilao
    : [
        ...(Array.isArray(leilResp?.baseA)        ? leilResp.baseA        : []),
        ...(Array.isArray(leilResp?.baseB)        ? leilResp.baseB        : []),
        ...(Array.isArray(leilResp?.remarketing)  ? leilResp.remarketing  : []),
        ...(Array.isArray(leilResp?.lotes)        ? leilResp.lotes        : []),
      ]
  const temLeilao = todosLeilao.length > 0

  // Gravame — API v3 retorna resposta.gravame como objeto único (não array)
  const gravameNull = !data.gravame
  const gravResp    = data.gravame?.resposta ?? data.gravame ?? {}
  const gravameObj  = gravResp?.gravame
  const gravames: any[] = Array.isArray(gravResp?.gravames ?? gravResp?.listaGravames)
    ? (gravResp?.gravames ?? gravResp?.listaGravames)
    : (gravameObj && typeof gravameObj === 'object' && Object.keys(gravameObj).length > 0)
      ? [gravameObj]
      : []

  // Débitos — vêm do BIN Estadual (debitosPendentes), fallback para consulta-base
  const debitos       = binEstResp?.debitosPendentes ?? {}
  const licenciamento = num(debitos?.licenciamento ?? raw.licenciamento)
  const ipvaVal       = num(debitos?.ipva ?? raw.ipva)
  const multasTotal   = num(debitos?.multas?.total ?? debitos?.multas ?? raw.multas ?? raw.totalMultas)
  const dpvat         = val(debitos?.dpvat, 'NAODISPONIVEL').toUpperCase()

  // Precificador (Assertiva) — valor FIPE e mercado
  const precNull  = !data.precificador
  const precResp  = data.precificador?.resposta ?? data.precificador ?? {}
  const precObj   = precResp?.precificador ?? precResp?.fipe ?? precResp ?? {}
  const fipeAssertiva = {
    codigoFipe:    val(precObj?.codigoFipe    ?? precObj?.codigo    ?? precObj?.codigoTabela, ''),
    referencia:    val(precObj?.referenciaFipe ?? precObj?.referencia ?? precObj?.mesReferencia, ''),
    valorFipe:     precObj?.valorFipe    ?? precObj?.valor    ?? precObj?.precoFipe    ?? precResp?.valorFipe    ?? null,
    valorMercado:  precObj?.valorMercado ?? precObj?.valorVenda ?? precObj?.valorEstimado ?? precResp?.valorMercado ?? null,
    desvalorizacao: val(precObj?.desvalorizacao ?? precObj?.percentualDesvalorizacao, ''),
  }
  // Fallback para BrasilAPI (grátis)
  const fipeBrasil = data.fipe
  const fipeValor  = fipeAssertiva.valorFipe  ?? fipeBrasil?.price  ?? fipeBrasil?.valor  ?? null
  const fipeMercado = fipeAssertiva.valorMercado ?? null
  const fipeCodigo  = fipeAssertiva.codigoFipe   ?? fipeBrasil?.codeFipe ?? fipeBrasil?.codigo ?? null
  const fipeRef     = fipeAssertiva.referencia    ?? fipeBrasil?.referenceMonth ?? fipeBrasil?.referencia ?? null

  // Score
  const score = calcScore(data)
  const agora = new Date().toLocaleString('pt-BR')

  // Identificação
  const renavam    = val(pIdent.renavam    ?? pDesc.renavam,    '')
  const chassiNum  = val(pIdent.chassi     ?? pDesc.chassi,     '')
  const motorNum   = val(pIdent.motor      ?? pDesc.motor       ?? pFicha.motor,      '')
  const carroceria = val(pFicha.carroceria ?? pDesc.carroceria  ?? pIdent.carroceria, '')
  const municipio  = val(pDesc.municipio   ?? pIdent.municipio, '')
  const uf         = val(pDesc.uf          ?? pIdent.uf,         '')
  const nrProp     = parseInt(String(
    pDesc.quantidadeProprietarios ?? pMov.quantidadeProprietarios ?? pDesc.nrProprietarios ?? '0'
  ), 10) || 0
  // Características técnicas
  const combustivel = val(pFicha.combustivel ?? pFicha.tipoCombustivel, '')
  const passageiros = val(pFicha.passageiros ?? pFicha.nrPassageiros,   '')
  const tipoVeic    = val(pFicha.tipo        ?? pFicha.tipoVeiculo,      '')
  const especie     = val(pFicha.especie,                                '')
  const cilindradas = val(pFicha.cilindradas ?? pFicha.cilindrada,       '')
  const potencia    = val(pFicha.potencia    ?? pFicha.potenciaMotor,    '')
  const categoria   = val(pFicha.categoria,                              '')
  const procedencia = val(pFicha.procedencia ?? pFicha.origemVeiculo,    '')
  const cambio      = val(pFicha.cambio      ?? pFicha.tipoCambio       ?? pDesc.cambio, '')
  const temFicha    = !!(combustivel || tipoVeic || cilindradas || passageiros || cambio)

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
  const gravNormal  = gravames.filter((g: any) => {
    const s = (g.situacao ?? g.status ?? g.tipo ?? g.tipoGravame ?? '').toUpperCase()
    const r = (g.restricaoFinanceira ?? '').toUpperCase()
    return !s.includes('ATUAL') && !s.includes('ATIVO') && !r.includes('ALIEN') && !r.includes('FIDUCI')
  }).length
  const gravAtencao = gravames.filter((g: any) => {
    const s = (g.situacao ?? g.status ?? g.tipo ?? g.tipoGravame ?? '').toUpperCase()
    const r = (g.restricaoFinanceira ?? '').toUpperCase()
    return s.includes('ATUAL') || s.includes('ATIVO') || s.includes('ALIEN') || r.includes('ALIEN') || r.includes('FIDUCI')
  }).length

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

      {/* ── IDENTIFICAÇÃO ──────────────────────────────────────────────────── */}
      <SecaoAcordion
        titulo="IDENTIFICAÇÃO"
        normal={[renavam, chassiNum, motorNum, carroceria, municipio, cambio].filter(v => v && v !== 'Não informado').length + 3}
        alerta={nrProp > 2 ? 1 : 0}
        atencao={0}
        defaultAberto
      >
        <CardStatus titulo="PLACA"           valor={placaFmt}                                tipo="normal" />
        <CardStatus titulo="MARCA / MODELO"  valor={mm.toUpperCase()}                        tipo="normal" />
        <CardStatus titulo="ANO FAB / MOD"   valor={anoStr || 'NÃO INFORMADO'}               tipo="normal" />
        <CardStatus titulo="COR"             valor={(cor || 'NÃO INFORMADO').toUpperCase()}  tipo="normal" />
        {renavam    && <CardStatus titulo="RENAVAM"    valor={renavam.toUpperCase()}    tipo="normal" />}
        {chassiNum  && <CardStatus titulo="CHASSI"     valor={chassiNum.toUpperCase()}  tipo="normal" />}
        {motorNum   && <CardStatus titulo="Nº MOTOR"   valor={motorNum.toUpperCase()}   tipo="normal" />}
        {carroceria && <CardStatus titulo="CARROCERIA" valor={carroceria.toUpperCase()} tipo="normal" />}
        {(municipio || uf) && (
          <CardStatus titulo="MUNICÍPIO / UF" valor={`${municipio}/${uf}`.toUpperCase()} tipo="normal" />
        )}
        <CardStatus
          titulo="Nº PROPRIETÁRIOS"
          valor={nrProp > 0 ? `${nrProp} PROPRIETÁRIO(S)` : 'NÃO INFORMADO'}
          tipo={nrProp > 2 ? 'alerta' : 'normal'}
        />
        {nrProp > 2 && (
          <CardStatus
            titulo="ALERTA — MÚLTIPLOS PROPRIETÁRIOS"
            valor={`ATENÇÃO: ${nrProp} PROPRIETÁRIOS REGISTRADOS — VERIFIQUE O HISTÓRICO COMPLETO`}
            tipo="alerta"
          />
        )}
      </SecaoAcordion>

      {/* ── CARACTERÍSTICAS TÉCNICAS ──────────────────────────────────────── */}
      {temFicha && (
        <SecaoAcordion
          titulo="CARACTERÍSTICAS TÉCNICAS"
          normal={[combustivel, tipoVeic, especie, cilindradas, potencia, categoria, procedencia, passageiros, cambio].filter(v => v && v !== 'Não informado').length}
          alerta={0}
          atencao={0}
          defaultAberto
        >
          {combustivel && <CardStatus titulo="COMBUSTÍVEL" valor={combustivel.toUpperCase()} tipo="normal" />}
          {cambio      && <CardStatus titulo="CÂMBIO"      valor={cambio.toUpperCase()}      tipo="normal" />}
          {tipoVeic    && <CardStatus titulo="TIPO"        valor={tipoVeic.toUpperCase()}     tipo="normal" />}
          {especie     && <CardStatus titulo="ESPÉCIE"     valor={especie.toUpperCase()}      tipo="normal" />}
          {passageiros && <CardStatus titulo="PASSAGEIROS" valor={passageiros.toUpperCase()}  tipo="normal" />}
          {cilindradas && <CardStatus titulo="CILINDRADAS" valor={cilindradas.toUpperCase()}  tipo="normal" />}
          {potencia    && <CardStatus titulo="POTÊNCIA"    valor={potencia.toUpperCase()}     tipo="normal" />}
          {categoria   && <CardStatus titulo="CATEGORIA"   valor={categoria.toUpperCase()}    tipo="normal" />}
          {procedencia && <CardStatus titulo="PROCEDÊNCIA" valor={procedencia.toUpperCase()}  tipo="normal" />}
        </SecaoAcordion>
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
          const desc   = val(l.comitente ?? l.descricao ?? l.orgao ?? l.comarca ?? l.vara ?? l.leiloeiro ?? l.leilaoeiro ?? l.evento, '')
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

      {/* ── FIPE / PRECIFICADOR ───────────────────────────────────────────── */}
      <SecaoAcordion titulo="FIPE / PRECIFICADOR"
        normal={fipeValor ? 1 : 0}
        alerta={0}
        atencao={precNull && !fipeBrasil ? 1 : 0}>
        {!fipeValor && !fipeMercado ? (
          <CardStatus titulo="TABELA FIPE" valor="NÃO DISPONÍVEL" tipo="atencao" />
        ) : (
          <>
            {fipeValor && (
              <CardStatus titulo="VALOR FIPE" valor={`R$ ${num(fipeValor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} tipo="normal" />
            )}
            {fipeMercado && (
              <CardStatus titulo="VALOR MERCADO" valor={`R$ ${num(fipeMercado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} tipo="normal" />
            )}
            {fipeCodigo && (
              <CardStatus titulo="CÓDIGO FIPE" valor={String(fipeCodigo).toUpperCase()} tipo="normal" />
            )}
            {fipeRef && (
              <CardStatus titulo="REFERÊNCIA" valor={String(fipeRef).toUpperCase()} tipo="normal" />
            )}
            {fipeAssertiva.desvalorizacao && fipeAssertiva.desvalorizacao !== 'Não informado' && (
              <CardStatus titulo="DESVALORIZAÇÃO" valor={fipeAssertiva.desvalorizacao.toUpperCase()} tipo="atencao" />
            )}
          </>
        )}
      </SecaoAcordion>

      {/* ── PROCESSOS JUDICIAIS — ANTIFRAUDE (DataJud CNJ) ────────────────── */}
      {(() => {
        const dj = data.datajud
        if (!dj) return (
          <SecaoAcordion titulo="PROCESSOS JUDICIAIS — ANTIFRAUDE" normal={0} alerta={0} atencao={1}>
            <CardStatus titulo="PROCESSOS JUDICIAIS" valor="NOME DO PROPRIETÁRIO NÃO DISPONÍVEL" tipo="atencao" />
          </SecaoAcordion>
        )
        const djCards: TipoCard[] = dj.processos.map(p =>
          p.risco === 'alto' ? 'alerta' : p.risco === 'medio' ? 'atencao' : 'normal'
        )
        if (dj.total === 0) djCards.push('normal')
        return (
          <SecaoAcordion
            titulo="PROCESSOS JUDICIAIS — ANTIFRAUDE"
            normal={djCards.filter(c => c === 'normal').length}
            alerta={djCards.filter(c => c === 'alerta').length}
            atencao={djCards.filter(c => c === 'atencao').length}
          >
            {dj.total === 0 ? (
              <CardStatus
                titulo={`CONSULTA: ${dj.nomeUsado}`}
                valor="NENHUM PROCESSO ENCONTRADO NOS TRIBUNAIS CONSULTADOS"
                tipo="normal"
              />
            ) : dj.processos.map((p, i) => {
              const assuntosStr = p.assuntos.slice(0, 2).join(' · ') || p.classe
              const linha = [p.dataAjuizamento, p.tribunal, p.orgaoJulgador].filter(Boolean).join(' — ')
              return (
                <CardStatus
                  key={i}
                  titulo={`${p.numero}`}
                  valor={`${assuntosStr.toUpperCase()}\n${linha}`}
                  tipo={p.risco === 'alto' ? 'alerta' : p.risco === 'medio' ? 'atencao' : 'normal'}
                />
              )
            })}
            <div className="col-span-full mt-1 px-1">
              <p className="text-[10px] text-gray-400">
                Fonte: DataJud CNJ · Pesquisa por nome: {dj.nomeUsado} · Tribunais: TJSP, TJRJ, TJMG, TJRS, TJPR, TJBA, TJGO, TJCE, TJSC, TJPE
              </p>
            </div>
          </SecaoAcordion>
        )
      })()}

      {/* ── ANTI-FRAUDE AVANÇADO (FutureData) ─────────────────────────────── */}
      <SecaoAcordion
        titulo="ANTI-FRAUDE AVANÇADO"
        normal={0}
        alerta={0}
        atencao={
          temModulo(plano, 'placa_recall') ||
          temModulo(plano, 'placa_sinistro_plus') ||
          temModulo(plano, 'placa_frota_locadora') ? 0 : 1
        }
      >
        {temModulo(plano, 'placa_recall')
          ? <CardStatus titulo="RECALL" valor="NENHUM RECALL PENDENTE" tipo="normal" />
          : <CardBloqueado titulo="RECALL POR PLACA/CHASSI" planoNecessario={planoQueTemModulo('placa_recall')} />}

        {temModulo(plano, 'placa_historico_proprietarios')
          ? <CardStatus titulo="HISTÓRICO PROPRIETÁRIOS" valor="AGUARDANDO DADO" tipo="normal" />
          : <CardBloqueado titulo="HISTÓRICO DE PROPRIETÁRIOS" planoNecessario={planoQueTemModulo('placa_historico_proprietarios')} />}

        {temModulo(plano, 'placa_sinistro_plus')
          ? <CardStatus titulo="SINISTRO PLUS" valor="AGUARDANDO DADO" tipo="normal" />
          : <CardBloqueado titulo="SINISTRO PLUS (AMPLIADO)" planoNecessario={planoQueTemModulo('placa_sinistro_plus')} />}

        {temModulo(plano, 'placa_frota_locadora')
          ? <CardStatus titulo="FROTA LOCADORA" valor="AGUARDANDO DADO" tipo="normal" />
          : <CardBloqueado titulo="HISTÓRICO FROTA LOCADORA" planoNecessario={planoQueTemModulo('placa_frota_locadora')} />}

        {temModulo(plano, 'placa_frota_policial')
          ? <CardStatus titulo="FROTA POLICIAL" valor="AGUARDANDO DADO" tipo="normal" />
          : <CardBloqueado titulo="HISTÓRICO FROTA POLICIAL" planoNecessario={planoQueTemModulo('placa_frota_policial')} />}

        {temModulo(plano, 'placa_frota_taxi')
          ? <CardStatus titulo="FROTA TÁXI" valor="AGUARDANDO DADO" tipo="normal" />
          : <CardBloqueado titulo="HISTÓRICO TÁXI" planoNecessario={planoQueTemModulo('placa_frota_taxi')} />}

        {temModulo(plano, 'placa_veiculo_crime')
          ? <CardStatus titulo="VEÍCULO EM CRIME" valor="AGUARDANDO DADO" tipo="normal" />
          : <CardBloqueado titulo="VEÍCULO UTILIZADO EM CRIME" planoNecessario={planoQueTemModulo('placa_veiculo_crime')} />}

        {temModulo(plano, 'placa_transferencia_seguradora')
          ? <CardStatus titulo="TRANSF. SEGURADORA" valor="AGUARDANDO DADO" tipo="normal" />
          : <CardBloqueado titulo="TRANSFERÊNCIA P/ SEGURADORA" planoNecessario={planoQueTemModulo('placa_transferencia_seguradora')} />}

        {temModulo(plano, 'placa_chassi_decoder')
          ? <CardStatus titulo="DECODIFICADOR VIN" valor="AGUARDANDO DADO" tipo="normal" />
          : <CardBloqueado titulo="DECODIFICADOR DE CHASSI (VIN)" planoNecessario={planoQueTemModulo('placa_chassi_decoder')} />}
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
          const banco   = val(g.agenteFinanceiro ?? g.nome ?? g.agente ?? g.nomeAgente ?? g.nomeFinanciador, '---').toUpperCase()
          const devedor = val(g.nomeFinanciado ?? g.nomeDevedor ?? g.devedor, '').toUpperCase()
          const restrF  = val(g.restricaoFinanceira ?? g.restricao ?? '', '').toUpperCase()
          const dataG   = val(g.data ?? g.dataGravame ?? g.dataInclusao, '')
          const sitG    = val(g.situacao ?? g.status ?? g.tipoGravame ?? g.tipo, '---').toUpperCase()
          const isAtual = sitG.includes('ATUAL') || sitG.includes('ATIVO') || sitG.includes('ALIEN') || restrF.includes('ALIEN') || restrF.includes('FIDUCI')
          const titLine = [dataG, banco].filter(Boolean).join(' — ')
          const valLine = [restrF || sitG, devedor].filter(Boolean).join(' · ')
          return (
            <CardStatus key={i} titulo={titLine || `GRAVAME ${i + 1}`}
              valor={isAtual ? `ATIVO — ${valLine}` : `HISTÓRICO — ${valLine}`}
              tipo={isAtual ? 'atencao' : 'normal'} />
          )
        })}
      </SecaoAcordion>

      {/* ── CERTIFICADO DE SEGURANÇA VEICULAR (CSV / SISCSV) ─────────────── */}
      {(() => {
        const csvData = data.csv
        if (!csvData) return null

        // Normaliza: resposta pode ser array de laudos ou objeto com laudos
        const csvResp = csvData?.resposta ?? csvData ?? {}
        const laudos: any[] = Array.isArray(csvResp)
          ? csvResp
          : Array.isArray(csvResp?.laudos ?? csvResp?.csvs ?? csvResp?.certificados)
            ? (csvResp.laudos ?? csvResp.csvs ?? csvResp.certificados)
            : (typeof csvResp === 'object' && csvResp?.numero ? [csvResp] : [])

        if (laudos.length === 0 &&
          (typeof csvResp === 'string' && csvResp.toLowerCase().includes('não localizada'))) return null
        if (laudos.length === 0 && !csvResp?.numero) return null

        return (
          <SecaoAcordion
            titulo="CERTIFICADO DE SEGURANÇA VEICULAR (CSV)"
            normal={laudos.filter(l => {
              const r = (l.resultado ?? l.situacao ?? l.status ?? '').toString().toUpperCase()
              return r.includes('APROVADO') || r.includes('APROVAD')
            }).length}
            alerta={laudos.filter(l => {
              const r = (l.resultado ?? l.situacao ?? l.status ?? '').toString().toUpperCase()
              return r.includes('REPROVADO') || r.includes('REPROVAD')
            }).length}
            atencao={0}
            defaultAberto
          >
            {laudos.map((l: any, i: number) => {
              const num    = val(l.numero ?? l.csvNumero ?? l.numeroCsv ?? l.id, `CSV ${i + 1}`)
              const data_  = val(l.dataInspecao ?? l.data ?? l.dataEmissao, '')
              const tipo   = val(l.tipo ?? l.tipoCSV ?? l.tipoCsv, '')
              const res    = val(l.resultado ?? l.situacao ?? l.status, 'NÃO INFORMADO').toUpperCase()
              const reprov = res.includes('REPROVADO')
              const aprov  = res.includes('APROVADO')
              return (
                <CardStatus
                  key={i}
                  titulo={`CSV Nº ${num}${data_ ? ` — ${data_}` : ''}`}
                  valor={`${tipo ? tipo.toUpperCase() + ' — ' : ''}${res}`}
                  tipo={reprov ? 'alerta' : aprov ? 'normal' : 'atencao'}
                />
              )
            })}
          </SecaoAcordion>
        )
      })()}

    </div>
  )
}
