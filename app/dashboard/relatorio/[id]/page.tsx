'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Download, Share2, Car, ShieldCheck, ShieldAlert,
  AlertTriangle, CheckCircle2, XCircle, Clock, Loader2, Printer
} from 'lucide-react'

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface ReportData {
  placa:       any
  binFederal:  any
  sinistro:    any
  gravame:     any
  leilao:      any
  chassi:      any
  fipe:        any
  erros:       string[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function val(v: any) { return v ?? 'Não informado' }

function StatusIcon({ status }: { status: 'ok' | 'alert' | 'warning' }) {
  if (status === 'ok')      return <CheckCircle2 className="w-4 h-4 text-brand-green shrink-0" />
  if (status === 'alert')   return <XCircle      className="w-4 h-4 text-brand-danger shrink-0" />
  return <AlertTriangle className="w-4 h-4 text-brand-warning shrink-0" />
}

function StatusIconBig({ ok }: { ok: boolean }) {
  return (
    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${ok ? 'bg-brand-green' : 'bg-brand-danger'}`}>
      {ok ? <ShieldCheck className="w-5 h-5 text-white" /> : <ShieldAlert className="w-5 h-5 text-white" />}
    </div>
  )
}

function ScoreRing({ score }: { score: number }) {
  const r = 40, c = 2 * Math.PI * r
  const offset = c - (score / 100) * c
  const color = score >= 80 ? '#00A651' : score >= 60 ? '#F59E0B' : '#EF4444'
  const label = score >= 80 ? 'Baixo risco' : score >= 60 ? 'Risco médio' : 'Alto risco'
  return (
    <div className="flex flex-col items-center">
      <svg width="96" height="96" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset}
          transform="rotate(-90 50 50)" />
        <text x="50" y="46" textAnchor="middle" fill="white" fontSize="20" fontWeight="800">{score}</text>
        <text x="50" y="62" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="9">/ 100</text>
      </svg>
      <span className="text-xs font-semibold mt-1 text-white/80">{label}</span>
    </div>
  )
}

// Calcula score baseado nos dados reais
function calcScore(data: ReportData): number {
  let score = 100
  const p = data.placa
  if (!p) return 50

  const temRenajud   = JSON.stringify(p).toUpperCase().includes('RENAJUD')
  const temAlienacao = JSON.stringify(p).toUpperCase().includes('ALIEN')
  const temRoubo     = data.binFederal && JSON.stringify(data.binFederal).toUpperCase().includes('ROUBO')
  const temSinistro  = data.sinistro   && JSON.stringify(data.sinistro).toUpperCase().includes('SINISTRO')
  const temLeilao    = data.leilao     && JSON.stringify(data.leilao).toUpperCase().includes('LEILÃO')

  if (temRenajud)   score -= 20
  if (temAlienacao) score -= 10
  if (temRoubo)     score -= 30
  if (temSinistro)  score -= 15
  if (temLeilao)    score -= 15

  return Math.max(score, 10)
}

// ─── Componente principal ─────────────────────────────────────────────────────
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
      <div className="text-center">
        <p className="font-semibold text-brand-dark">Consultando veículo...</p>
        <p className="text-sm text-brand-gray mt-1">Aguarde, estamos buscando os dados em tempo real</p>
      </div>
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

  const p      = data.placa     ?? {}
  const score  = calcScore(data)
  const agora  = new Date().toLocaleString('pt-BR')

  // Dados de identificação — resposta aninhada v3
  const pDesc  = p.resposta?.descricao       ?? p
  const pIdent = p.resposta?.identificadores ?? p
  const pMov   = p.resposta?.movimentacao    ?? p
  const pRestr = p.resposta?.restricoes      ?? p

  // Módulos secundários — null = não consultado / erro
  const binFederalNull = data.binFederal === null || data.binFederal === undefined
  const sinistroNull   = data.sinistro   === null || data.sinistro   === undefined
  const gravameNull    = data.gravame    === null || data.gravame    === undefined
  const leilaoNull     = data.leilao     === null || data.leilao     === undefined

  const bin  = data.binFederal ?? {}
  const sin  = data.sinistro   ?? {}
  const grav = data.gravame    ?? {}
  const lei  = data.leilao     ?? {}
  const chassiD = data.chassi  ?? {}

  // Extração dos dados dos módulos — suporte a resposta aninhada v3
  const binResp  = bin?.resposta  ?? bin  ?? {}
  const sinResp  = sin?.resposta  ?? sin  ?? {}
  const gravResp = grav?.resposta ?? grav ?? {}
  const leiResp  = lei?.resposta  ?? lei  ?? {}

  // Gravame — lista de financiamentos
  const gravames = Array.isArray(gravResp?.gravames ?? gravResp?.listaGravames)
    ? (gravResp?.gravames ?? gravResp?.listaGravames)
    : []

  // Leilão — 3 bases
  const leilaoBaseA      = Array.isArray(leiResp?.baseA ?? leiResp?.historicoBaseA)      ? (leiResp?.baseA ?? leiResp?.historicoBaseA)            : []
  const leilaoBaseB      = Array.isArray(leiResp?.baseB ?? leiResp?.historicoBaseB)      ? (leiResp?.baseB ?? leiResp?.historicoBaseB)            : []
  const leilaoRemark     = Array.isArray(leiResp?.remarketing ?? leiResp?.historicoRem)  ? (leiResp?.remarketing ?? leiResp?.historicoRem)        : []
  const leilaoLotes      = Array.isArray(leiResp?.lotes ?? leiResp?.leiloes)             ? (leiResp?.lotes ?? leiResp?.leiloes)                   : []

  const restricoes = [
    { label: 'Restrição Estadual 01', valor: val(pRestr.restricaoEstadual01 ?? pRestr.rest01 ?? 'NADA CONSTA'), ok: !(pRestr.restricaoEstadual01 ?? '').toString().toUpperCase().includes('CONSTA') === false },
    { label: 'Restrição Estadual 02', valor: val(pRestr.restricaoEstadual02 ?? pRestr.rest02 ?? 'NADA CONSTA'), ok: true },
    { label: 'Restrição Estadual 03', valor: val(pRestr.restricaoEstadual03 ?? pRestr.rest03 ?? 'NADA CONSTA'), ok: true },
    { label: 'Restrição Estadual 04', valor: val(pRestr.restricaoEstadual04 ?? pRestr.rest04 ?? 'NADA CONSTA'), ok: true },
  ]

  const temRenajud   = JSON.stringify(pRestr).toUpperCase().includes('RENAJUD')
  const temAlienacao = JSON.stringify(pRestr).toUpperCase().includes('ALIEN')
  const temSinistro  = !sinistroNull && JSON.stringify(sinResp).toUpperCase().includes('CONSTA') && !JSON.stringify(sinResp).toUpperCase().includes('NADA CONSTA')
  const temRoubo     = !binFederalNull && JSON.stringify(binResp).toUpperCase().includes('ROUBO') && !JSON.stringify(binResp).toUpperCase().includes('NADA CONSTA')
  const temLeilao    = leilaoBaseA.length > 0 || leilaoBaseB.length > 0 || leilaoRemark.length > 0 || leilaoLotes.length > 0

  const marcaModelo = val(pDesc.marcaModelo ?? pDesc.marca ?? pDesc.modelo ?? 'Veículo')
  const placa       = val(pIdent.placa ?? id)
  const ano         = val(pDesc.anoFabricacao ?? pDesc.ano ?? '')
  const anoModelo   = val(pDesc.anoModelo ?? '')
  const anoStr      = ano && anoModelo ? `${ano}/${anoModelo}` : val(pDesc.anoFabricacao ?? pDesc.ano ?? '')

  return (
    <div className="max-w-4xl mx-auto">

      {/* Topbar */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-2 rounded-lg hover:bg-brand-gray-light transition-colors">
            <ArrowLeft className="w-4 h-4 text-brand-gray" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-brand-dark font-mono">{id}</h1>
            <p className="text-xs text-brand-gray flex items-center gap-1">
              <Clock className="w-3 h-3" /> {agora}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-2 text-xs text-brand-gray border border-brand-border rounded-lg hover:bg-brand-gray-light transition-colors">
            <Share2 className="w-3.5 h-3.5" /> Compartilhar
          </button>
          <a href={`/api/pdf/${id}`} target="_blank"
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-brand-green hover:bg-brand-green-dark text-white rounded-lg transition-colors">
            <Download className="w-3.5 h-3.5" /> Baixar PDF
          </a>
        </div>
      </div>

      {/* Banner do veículo */}
      <div className="rounded-2xl p-6 text-white mb-4"
           style={{ background: 'linear-gradient(135deg, #007A3D 0%, #00A651 60%, #005C2E 100%)' }}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-white/60 text-xs mb-1 uppercase tracking-wide">Consulta Veicular</p>
            <h2 className="text-2xl font-extrabold">{marcaModelo}</h2>
            <p className="text-3xl font-mono font-extrabold mt-1">{placa}</p>
            {anoStr && <p className="text-white/70 text-sm mt-1">Ano {anoStr}</p>}
          </div>
          <ScoreRing score={score} />
        </div>

        {/* 7 ícones de status */}
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mt-5 pt-5 border-t border-white/20">
          {[
            { label: 'DETRAN',       ok: !temRenajud },
            { label: 'RESTRIÇÕES',   ok: !temAlienacao && !temRenajud },
            { label: 'ALIENAÇÃO',    ok: !temAlienacao },
            { label: 'SINISTRO',     ok: !temSinistro },
            { label: 'ROUBO/FURTO',  ok: !temRoubo },
            { label: 'LEILÃO',       ok: !temLeilao },
            { label: 'ALTERAÇÕES',   ok: true },
          ].map(s => (
            <div key={s.label} className="flex flex-col items-center gap-1.5">
              <StatusIconBig ok={s.ok} />
              <span className="text-[9px] text-white/70 text-center leading-tight font-medium">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Erros da API — módulos não contratados ou com falha */}
      {data.erros && data.erros.length > 0 && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
          <p className="text-xs font-semibold text-yellow-800 mb-2">Módulos não retornaram dados:</p>
          {data.erros.map((e: string, i: number) => (
            <p key={i} className="text-xs text-yellow-700 leading-relaxed">{e}</p>
          ))}
          <p className="text-xs text-yellow-600 mt-2">Verifique se esses módulos estão contratados no painel Assertiva.</p>
        </div>
      )}

      <div className="space-y-4">

        {/* Identificação */}
        <div className="card p-6">
          <h3 className="font-semibold text-brand-dark mb-4 flex items-center gap-2">
            <Car className="w-4 h-4 text-brand-green" /> Identificação
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              ['Placa',         val(pIdent.placa ?? id)],
              ['Marca/Modelo',  val(pDesc.marcaModelo ?? pDesc.marca)],
              ['Ano',           anoStr],
              ['Cor',           val(pDesc.cor)],
              ['Renavam',       val(pIdent.renavam)],
              ['Chassi',        val(pIdent.chassi)],
              ['Motor',         val(pIdent.numeroMotor ?? pIdent.motor)],
              ['Município/UF',  val(pMov.municipio && pMov.uf ? `${pMov.municipio}/${pMov.uf}` : pMov.municipio ?? pMov.uf)],
              ['Combustível',   val(pDesc.combustivel)],
            ].map(([label, valor]) => (
              <div key={label}>
                <p className="text-xs text-brand-gray">{label}</p>
                <p className="text-sm font-medium text-brand-dark font-mono break-all">{valor}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Débitos e Restrições */}
        <div className="card p-6">
          <h3 className="font-semibold text-brand-dark mb-4">Débitos e Restrições</h3>
          <div className="grid md:grid-cols-2 gap-2">
            {[
              { label: 'Licenciamento', valor: val(p.licenciamento ?? 'R$ 0,00'),         ok: true },
              { label: 'IPVA',          valor: val(p.ipva ?? 'R$ 0,00'),                  ok: true },
              { label: 'DPVAT',         valor: val(p.dpvat ?? 'NÃO DISPONÍVEL'),          ok: null },
              { label: 'Multas',        valor: val(p.multas ?? p.totalMultas ?? 'R$ 0,00'), ok: true },
            ].map(r => (
              <div key={r.label} className="flex items-center justify-between p-3 bg-brand-gray-light rounded-lg">
                <span className="text-xs text-brand-gray">{r.label}</span>
                <div className="flex items-center gap-1.5">
                  {r.ok === true  && <CheckCircle2 className="w-4 h-4 text-brand-green" />}
                  {r.ok === false && <XCircle      className="w-4 h-4 text-brand-danger" />}
                  {r.ok === null  && <AlertTriangle className="w-4 h-4 text-brand-warning" />}
                  <span className="text-xs font-medium text-brand-dark">{r.valor}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 p-3 bg-brand-green-light rounded-lg flex items-center justify-between">
            <span className="text-xs font-medium text-brand-gray">Situação do Veículo</span>
            <span className="text-xs font-bold text-brand-green">{val(pMov.situacao ?? pMov.situacaoVeiculo ?? 'EM CIRCULAÇÃO')}</span>
          </div>
        </div>

        {/* Roubo/Furto */}
        <div className="card p-6">
          <h3 className="font-semibold text-brand-dark mb-3">Histórico de Roubo e Furto</h3>
          {binFederalNull ? (
            <div className="flex items-center gap-2 p-3 bg-brand-gray-light rounded-lg">
              <AlertTriangle className="w-5 h-5 text-brand-gray" />
              <span className="text-sm text-brand-gray">Não consultado nesta pesquisa</span>
            </div>
          ) : (
            <div className={`flex items-center gap-2 p-3 rounded-lg ${temRoubo ? 'bg-red-50' : 'bg-brand-green-light'}`}>
              {temRoubo ? <XCircle className="w-5 h-5 text-brand-danger" /> : <CheckCircle2 className="w-5 h-5 text-brand-green" />}
              <span className={`text-sm font-semibold ${temRoubo ? 'text-brand-danger' : 'text-brand-green'}`}>
                {temRoubo ? 'CONSTA OCORRÊNCIA' : 'NADA CONSTA'}
              </span>
            </div>
          )}
        </div>

        {/* Gravame */}
        <div className="card p-6">
          <h3 className="font-semibold text-brand-dark mb-4">Histórico de Gravame</h3>
          {gravameNull ? (
            <div className="flex items-center gap-2 p-3 bg-brand-gray-light rounded-lg">
              <AlertTriangle className="w-5 h-5 text-brand-gray" />
              <span className="text-sm text-brand-gray">Não consultado nesta pesquisa</span>
            </div>
          ) : gravames.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-brand-gray border-b border-brand-border">
                    <th className="pb-2 font-medium">Data</th>
                    <th className="pb-2 font-medium">UF</th>
                    <th className="pb-2 font-medium">Situação</th>
                    <th className="pb-2 font-medium">Agente Financeiro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {gravames.map((g: any, i: number) => (
                    <tr key={i}>
                      <td className="py-2.5 text-xs text-brand-dark">{val(g.data ?? g.dataGravame)}</td>
                      <td className="py-2.5 text-xs text-brand-dark">{val(g.uf)}</td>
                      <td className="py-2.5">
                        <span className="text-xs font-semibold text-brand-green">{val(g.situacao ?? g.tipoGravame)}</span>
                      </td>
                      <td className="py-2.5 text-xs text-brand-gray">{val(g.nome ?? g.agente ?? g.nomeAgente)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-brand-green-light rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-brand-green" />
              <span className="text-sm font-semibold text-brand-green">NADA CONSTA</span>
            </div>
          )}
        </div>

        {/* Sinistro */}
        <div className="card p-6">
          <h3 className="font-semibold text-brand-dark mb-3">Indício de Sinistro</h3>
          {sinistroNull ? (
            <div className="flex items-center gap-2 p-3 bg-brand-gray-light rounded-lg">
              <AlertTriangle className="w-5 h-5 text-brand-gray" />
              <span className="text-sm text-brand-gray">Não consultado nesta pesquisa</span>
            </div>
          ) : (
            <div className={`flex items-center gap-2 p-3 rounded-lg ${temSinistro ? 'bg-red-50' : 'bg-brand-green-light'}`}>
              {temSinistro ? <XCircle className="w-5 h-5 text-brand-danger" /> : <CheckCircle2 className="w-5 h-5 text-brand-green" />}
              <span className={`text-sm font-semibold ${temSinistro ? 'text-brand-danger' : 'text-brand-green'}`}>
                {temSinistro ? 'INDÍCIO DETECTADO' : 'NADA CONSTA'}
              </span>
            </div>
          )}
          <p className="text-xs text-brand-gray mt-2">
            Esta informação representa indícios baseados em fontes de dados. Realize uma vistoria física para confirmar.
          </p>
        </div>

        {/* Leilão */}
        <div className="card p-6">
          <h3 className="font-semibold text-brand-dark mb-4">Histórico de Leilão</h3>
          {leilaoNull ? (
            <div className="flex items-center gap-2 p-3 bg-brand-gray-light rounded-lg">
              <AlertTriangle className="w-5 h-5 text-brand-gray" />
              <span className="text-sm text-brand-gray">Não consultado nesta pesquisa</span>
            </div>
          ) : (
            <div className="space-y-2">
              {[
                { label: 'BASE A',      items: leilaoBaseA  },
                { label: 'BASE B',      items: leilaoBaseB  },
                { label: 'REMARKETING', items: leilaoRemark },
              ].map(({ label, items }) => (
                <div key={label} className="flex items-center justify-between p-3 bg-brand-gray-light rounded-lg">
                  <span className="text-xs font-medium text-brand-dark">{label}</span>
                  <div className="flex items-center gap-1.5">
                    {items.length > 0
                      ? <><XCircle className="w-4 h-4 text-brand-danger" /><span className="text-xs font-medium text-brand-danger">CONSTA ({items.length})</span></>
                      : <><CheckCircle2 className="w-4 h-4 text-brand-green" /><span className="text-xs font-medium text-brand-green">NADA CONSTA</span></>
                    }
                  </div>
                </div>
              ))}
              {leilaoLotes.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-brand-danger mb-2">{leilaoLotes.length} registro(s) de leilão encontrado(s)</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Decodificador de Chassi */}
        {chassiD && Object.keys(chassiD).length > 2 && (
          <div className="card p-6">
            <h3 className="font-semibold text-brand-dark mb-4">Decodificador de Chassi</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                ['Identificação', chassiD.identificacaoCompleta ?? chassiD.ident],
                ['Fabricante',    chassiD.fabricante],
                ['Modelo',        chassiD.modelo],
                ['Veículo',       chassiD.veiculo],
                ['Transmissão',   chassiD.transmissao],
                ['Combustível',   chassiD.combustivel],
                ['Carroceria',    chassiD.carroceria],
                ['País/Local',    chassiD.pais ?? chassiD.local],
                ['Cód. FIPE',     chassiD.codigoFipe],
              ].filter(([, v]) => v).map(([label, valor]) => (
                <div key={String(label)}>
                  <p className="text-xs text-brand-gray">{label}</p>
                  <p className="text-sm font-medium text-brand-dark">{String(valor)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FIPE */}
        {data.fipe && (
          <div className="card p-6">
            <h3 className="font-semibold text-brand-dark mb-4">Tabela FIPE</h3>
            {data.fipe.preco && (
              <div className="p-4 bg-brand-green-light rounded-xl mb-4">
                <p className="text-xs text-brand-gray">Valor atual</p>
                <p className="text-2xl font-extrabold text-brand-green">
                  {typeof data.fipe.preco === 'string' ? data.fipe.preco : `R$ ${Number(data.fipe.preco).toLocaleString('pt-BR')}`}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Aviso legal */}
        <div className="card p-4 bg-brand-gray-light">
          <p className="text-xs text-brand-gray leading-relaxed">
            Esta consulta veicular não tem caráter pericial e não substitui a perícia oficial.
            As informações têm validade apenas para o momento de sua realização e são oriundas de bases públicas e privadas.
            A Ficha Auto não se responsabiliza por informações publicadas após a emissão desta consulta.
          </p>
        </div>

      </div>
    </div>
  )
}
