'use client'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Download, Share2, Car, ShieldCheck, ShieldAlert,
  AlertTriangle, CheckCircle2, XCircle, Clock, MapPin, Printer
} from 'lucide-react'

// Mock data — substituir pela chamada real da API
const MOCK = {
  placa: 'PKG5A23',
  marcaModelo: 'HONDA/CIVIC SPORT CVT',
  ano: '2016/2017',
  cor: 'PRATA',
  renavam: '01106508014',
  chassi: '93HFC2630HZ104454',
  motor: 'R20Z57303191',
  municipio: 'PETROLINA/PE',
  combustivel: 'ALCOOL/GASOLINA',
  passageiros: 5,
  cilindradas: 1997,
  potencia: 155,
  situacaoVeiculo: 'EM CIRCULAÇÃO',
  score: 72,
  dataConsulta: '06/05/2026 14:33',

  restricoes: [
    { label: 'Restrição Estadual 01', valor: 'NADA CONSTA',         status: 'ok' },
    { label: 'Restrição Estadual 02', valor: 'RENAJUD',             status: 'alert' },
    { label: 'Restrição Estadual 03', valor: 'ALIENAÇÃO FIDUCIÁRIA',status: 'warning' },
    { label: 'Restrição Estadual 04', valor: 'NADA CONSTA',         status: 'ok' },
  ],
  debitos: [
    { label: 'Licenciamento', valor: 'R$ 0,00',        status: 'ok' },
    { label: 'IPVA',          valor: 'R$ 0,00',        status: 'ok' },
    { label: 'DPVAT',         valor: 'NÃO DISPONÍVEL', status: 'warning' },
    { label: 'Multas',        valor: 'R$ 0,00',        status: 'ok' },
  ],

  alteracoes: [
    { item: 'Chassi',      fabrica: '93HFC2630HZ104454', atual: '93HFC2630HZ104454', ok: true },
    { item: 'Motor',       fabrica: 'R20Z57303191',      atual: 'R20Z57303191',      ok: true },
    { item: 'Cor',         fabrica: 'PRATA',             atual: 'PRATA',             ok: true },
    { item: 'Combustível', fabrica: 'ALCOOL/GASOLINA',   atual: 'ALCOOL/GASOLINA',  ok: true },
  ],

  rouboFurto: { status: 'NADA CONSTA', ocorrencias: [] },

  gravames: [
    { data: '03/10/2017', uf: 'PE', situacao: 'Histórico', status: 'GRAVAME BAIXADO PELO AGENTE FINANCEIRO', nome: 'BANCO DO BRASIL S.A.' },
    { data: '03/03/2023', uf: 'PE', situacao: 'Atual',     status: 'GRAVAME BAIXADO PELO AGENTE FINANCEIRO', nome: 'ITAÚ ADMINISTRADORA DE CONSÓRCIOS LTDA' },
  ],

  sinistro: { status: 'NADA CONSTA' },

  leilao: [
    { base: 'BASE A', status: 'NADA CONSTA', itens: [] },
    { base: 'BASE B', status: 'NADA CONSTA', itens: [] },
    { base: 'REMARKETING', status: 'NADA CONSTA', itens: [] },
  ],

  chassiDecoder: {
    identificacao: 'Civic Sport Aut. 2.0 16V i-VTEC Flex 4P',
    fabricante: 'HONDA',
    modelo: 'Civic',
    veiculo: 'Civic Sport',
    portas: 4,
    transmissao: 'Automática - CVT',
    ano: '2016/2017',
    combustivel: 'Flexível Álcool/Gasolina',
    regiao: 'América do Sul',
    pais: 'Brasil - Sumaré/SP',
    codigoFipe: '014092-9',
    verificacaoSerial: 'OK',
  },

  fipe: {
    atual: 'R$ 98.993,00',
    historico: [
      { ano: '2026', valor: 'R$ 98.453,67', variacao: '+0,01%' },
      { ano: '2025', valor: 'R$ 97.481,08', variacao: '+3,15%' },
      { ano: '2024', valor: 'R$ 95.721,42', variacao: '-0,71%' },
      { ano: '2023', valor: 'R$ 98.051,17', variacao: '-2,41%' },
      { ano: '2022', valor: 'R$ 102.218,75',variacao: '-1,65%' },
    ],
  },
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'ok')      return <CheckCircle2 className="w-4 h-4 text-brand-green shrink-0" />
  if (status === 'alert')   return <XCircle className="w-4 h-4 text-brand-danger shrink-0" />
  if (status === 'warning') return <AlertTriangle className="w-4 h-4 text-brand-warning shrink-0" />
  return <CheckCircle2 className="w-4 h-4 text-brand-gray shrink-0" />
}

function ScoreRing({ score }: { score: number }) {
  const r = 40, c = 2 * Math.PI * r
  const offset = c - (score / 100) * c
  const color = score >= 80 ? '#00A651' : score >= 60 ? '#F59E0B' : '#EF4444'
  const label = score >= 80 ? 'Baixo risco' : score >= 60 ? 'Risco médio' : 'Alto risco'
  return (
    <div className="flex flex-col items-center">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#E2E8F0" strokeWidth="8" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset}
          transform="rotate(-90 50 50)" className="score-ring" />
        <text x="50" y="46" textAnchor="middle" className="text-xl font-extrabold" fill={color} fontSize="20" fontWeight="800">{score}</text>
        <text x="50" y="62" textAnchor="middle" fill="#64748B" fontSize="9">/ 100</text>
      </svg>
      <span className="text-xs font-semibold mt-1" style={{ color }}>{label}</span>
    </div>
  )
}

export default function RelatorioPage() {
  const { id } = useParams<{ id: string }>()
  const d = MOCK

  return (
    <div className="max-w-4xl mx-auto">

      {/* Topbar */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/consultar" className="btn-ghost px-2 py-2">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-brand-dark font-mono">{id}</h1>
            <p className="text-xs text-brand-gray flex items-center gap-1">
              <Clock className="w-3 h-3" /> {d.dataConsulta}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost text-xs px-3 py-2 gap-1.5">
            <Share2 className="w-3.5 h-3.5" /> Compartilhar
          </button>
          <button className="btn-ghost text-xs px-3 py-2 gap-1.5">
            <Printer className="w-3.5 h-3.5" /> Imprimir
          </button>
          <button className="btn-primary text-xs px-4 py-2 gap-1.5">
            <Download className="w-3.5 h-3.5" /> Baixar PDF
          </button>
        </div>
      </div>

      {/* Header do veículo */}
      <div className="gradient-brand rounded-2xl p-6 text-white mb-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-white/60 text-xs mb-1">CONSULTA VEICULAR</p>
            <h2 className="text-2xl font-extrabold">{d.marcaModelo}</h2>
            <p className="text-3xl font-mono font-extrabold mt-1 text-brand-green">{d.placa}</p>
          </div>
          <ScoreRing score={d.score} />
        </div>

        {/* Status icons */}
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mt-6 pt-5 border-t border-white/20">
          {[
            { label: 'DETRAN',        alert: true },
            { label: 'RESTRIÇÕES',    alert: true },
            { label: 'ALIENAÇÃO',     alert: true },
            { label: 'SINISTRO',      alert: false },
            { label: 'ROUBO/FURTO',   alert: false },
            { label: 'LEILÃO',        alert: false },
            { label: 'ALTERAÇÕES',    alert: false },
          ].map(s => (
            <div key={s.label} className="flex flex-col items-center gap-1">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center ${s.alert ? 'bg-red-500' : 'bg-brand-green'}`}>
                {s.alert
                  ? <ShieldAlert className="w-4 h-4 text-white" />
                  : <ShieldCheck className="w-4 h-4 text-white" />
                }
              </div>
              <span className="text-[9px] text-white/70 text-center leading-tight">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">

        {/* Identificação */}
        <div className="card p-6">
          <h3 className="font-semibold text-brand-dark mb-4 flex items-center gap-2">
            <Car className="w-4 h-4 text-brand-blue" /> Identificação
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: 'Placa',        valor: d.placa },
              { label: 'Marca/Modelo', valor: d.marcaModelo },
              { label: 'Ano',          valor: d.ano },
              { label: 'Cor',          valor: d.cor },
              { label: 'Renavam',      valor: d.renavam },
              { label: 'Chassi',       valor: d.chassi },
              { label: 'Motor',        valor: d.motor },
              { label: 'Município/UF', valor: d.municipio },
              { label: 'Combustível',  valor: d.combustivel },
            ].map(f => (
              <div key={f.label}>
                <p className="text-xs text-brand-gray">{f.label}</p>
                <p className="text-sm font-medium text-brand-dark font-mono">{f.valor}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Débitos e Restrições */}
        <div className="card p-6">
          <h3 className="font-semibold text-brand-dark mb-4">Débitos e Restrições</h3>
          <div className="grid md:grid-cols-2 gap-3">
            {d.restricoes.map(r => (
              <div key={r.label} className="flex items-center justify-between p-3 bg-brand-gray-light rounded-lg">
                <span className="text-xs text-brand-gray">{r.label}</span>
                <div className="flex items-center gap-1.5">
                  <StatusIcon status={r.status} />
                  <span className={`text-xs font-medium ${r.status === 'ok' ? 'text-brand-green' : r.status === 'alert' ? 'text-brand-danger' : 'text-brand-warning'}`}>
                    {r.valor}
                  </span>
                </div>
              </div>
            ))}
            {d.debitos.map(r => (
              <div key={r.label} className="flex items-center justify-between p-3 bg-brand-gray-light rounded-lg">
                <span className="text-xs text-brand-gray">{r.label}</span>
                <div className="flex items-center gap-1.5">
                  <StatusIcon status={r.status} />
                  <span className={`text-xs font-medium ${r.status === 'ok' ? 'text-brand-green' : r.status === 'alert' ? 'text-brand-danger' : 'text-brand-warning'}`}>
                    {r.valor}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between p-3 bg-brand-blue-light rounded-lg">
            <span className="text-xs font-medium text-brand-gray">Situação do Veículo</span>
            <span className="text-xs font-bold text-brand-blue">{d.situacaoVeiculo}</span>
          </div>
        </div>

        {/* Alterações de Características */}
        <div className="card p-6">
          <h3 className="font-semibold text-brand-dark mb-4">Alterações de Características</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-brand-gray border-b border-brand-border">
                  <th className="pb-2 font-medium">Item</th>
                  <th className="pb-2 font-medium">Fábrica</th>
                  <th className="pb-2 font-medium">Atual</th>
                  <th className="pb-2 font-medium text-right">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {d.alteracoes.map(a => (
                  <tr key={a.item}>
                    <td className="py-2.5 font-medium text-brand-dark">{a.item}</td>
                    <td className="py-2.5 font-mono text-xs text-brand-gray">{a.fabrica}</td>
                    <td className="py-2.5 font-mono text-xs text-brand-gray">{a.atual}</td>
                    <td className="py-2.5 text-right">
                      <span className={`badge-${a.ok ? 'ok' : 'alert'}`}>
                        {a.ok ? '✓ Sem Alterações' : '✗ Alterado'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Roubo/Furto */}
        <div className="card p-6">
          <h3 className="font-semibold text-brand-dark mb-4">Histórico de Roubo e Furto</h3>
          <div className="flex items-center gap-2 p-3 bg-brand-green-light rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-brand-green" />
            <span className="text-sm font-semibold text-brand-green">NADA CONSTA</span>
          </div>
        </div>

        {/* Gravame */}
        <div className="card p-6">
          <h3 className="font-semibold text-brand-dark mb-4">Histórico de Gravame</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-brand-gray border-b border-brand-border">
                  <th className="pb-2 font-medium">Data</th>
                  <th className="pb-2 font-medium">UF</th>
                  <th className="pb-2 font-medium">Situação</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Agente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {d.gravames.map((g, i) => (
                  <tr key={i}>
                    <td className="py-2.5 text-xs text-brand-dark">{g.data}</td>
                    <td className="py-2.5 text-xs text-brand-dark">{g.uf}</td>
                    <td className="py-2.5">
                      <span className={`badge-${g.situacao === 'Atual' ? 'info' : 'ok'}`}>{g.situacao}</span>
                    </td>
                    <td className="py-2.5 text-xs text-brand-green font-medium">{g.status}</td>
                    <td className="py-2.5 text-xs text-brand-gray">{g.nome}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sinistro */}
        <div className="card p-6">
          <h3 className="font-semibold text-brand-dark mb-4">Indício de Sinistro</h3>
          <div className="flex items-center gap-2 p-3 bg-brand-green-light rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-brand-green" />
            <span className="text-sm font-semibold text-brand-green">NADA CONSTA</span>
          </div>
          <p className="text-xs text-brand-gray mt-2">
            ⚠️ Esta informação representa indícios baseados em fontes de dados. Realize uma vistoria física para garantir evidências de acidentes.
          </p>
        </div>

        {/* Leilão */}
        <div className="card p-6">
          <h3 className="font-semibold text-brand-dark mb-4">Histórico de Leilão</h3>
          <div className="space-y-3">
            {d.leilao.map(l => (
              <div key={l.base} className="flex items-center justify-between p-3 bg-brand-gray-light rounded-lg">
                <span className="text-xs font-medium text-brand-dark">{l.base}</span>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-brand-green" />
                  <span className="text-xs font-medium text-brand-green">{l.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chassi Decoder */}
        <div className="card p-6">
          <h3 className="font-semibold text-brand-dark mb-4">Decodificador de Chassi</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(d.chassiDecoder).map(([k, v]) => (
              <div key={k}>
                <p className="text-xs text-brand-gray capitalize">{k.replace(/([A-Z])/g, ' $1').trim()}</p>
                <p className="text-sm font-medium text-brand-dark">{String(v)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FIPE */}
        <div className="card p-6">
          <h3 className="font-semibold text-brand-dark mb-4">Tabela FIPE</h3>
          <div className="flex items-center gap-3 mb-4 p-4 bg-brand-blue-light rounded-xl">
            <div>
              <p className="text-xs text-brand-gray">Valor atual (Mai/2026)</p>
              <p className="text-2xl font-extrabold text-brand-blue">{d.fipe.atual}</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-brand-gray border-b border-brand-border">
                  <th className="pb-2 font-medium">Ano</th>
                  <th className="pb-2 font-medium">Valor</th>
                  <th className="pb-2 font-medium text-right">Variação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {d.fipe.historico.map(f => (
                  <tr key={f.ano}>
                    <td className="py-2 text-brand-dark font-medium">{f.ano}</td>
                    <td className="py-2 text-brand-dark">{f.valor}</td>
                    <td className={`py-2 text-right font-medium text-xs ${f.variacao.startsWith('+') ? 'text-brand-green' : 'text-brand-danger'}`}>
                      {f.variacao}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Aviso legal */}
        <div className="card p-4 bg-brand-gray-light border-brand-border">
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
