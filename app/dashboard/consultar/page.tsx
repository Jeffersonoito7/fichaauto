'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Car, User, CreditCard, Search, Hash, Loader2,
  Zap, FileSearch, ChevronRight, AlertCircle, ArrowLeft,
  Shield, BarChart3, Building2, CheckCircle2,
} from 'lucide-react'

// ─── Logos das marcas ─────────────────────────────────────────────────────────
const BRAND_LOGO: Record<string, string> = {
  TOYOTA: 'https://logo.clearbit.com/toyota.com',
  HONDA: 'https://logo.clearbit.com/honda.com',
  VOLKSWAGEN: 'https://logo.clearbit.com/vw.com',
  VW: 'https://logo.clearbit.com/vw.com',
  CHEVROLET: 'https://logo.clearbit.com/chevrolet.com',
  GM: 'https://logo.clearbit.com/gm.com',
  FORD: 'https://logo.clearbit.com/ford.com',
  FIAT: 'https://logo.clearbit.com/fiat.com',
  RENAULT: 'https://logo.clearbit.com/renault.com',
  HYUNDAI: 'https://logo.clearbit.com/hyundai.com',
  NISSAN: 'https://logo.clearbit.com/nissan.com',
  MITSUBISHI: 'https://logo.clearbit.com/mitsubishi.com',
  JEEP: 'https://logo.clearbit.com/jeep.com',
  BMW: 'https://logo.clearbit.com/bmw.com',
  'MERCEDES-BENZ': 'https://logo.clearbit.com/mercedes-benz.com',
  MERCEDES: 'https://logo.clearbit.com/mercedes-benz.com',
  AUDI: 'https://logo.clearbit.com/audi.com',
  KIA: 'https://logo.clearbit.com/kia.com',
  PEUGEOT: 'https://logo.clearbit.com/peugeot.com',
  CITROEN: 'https://logo.clearbit.com/citroen.com',
  'CITROËN': 'https://logo.clearbit.com/citroen.com',
  VOLVO: 'https://logo.clearbit.com/volvocars.com',
  BYD: 'https://logo.clearbit.com/byd.com',
}

const BRAND_COLOR: Record<string, string> = {
  TOYOTA: '#EB0A1E', HONDA: '#CC0000', VOLKSWAGEN: '#001E50',
  VW: '#001E50', CHEVROLET: '#D4AF37', FORD: '#003478',
  FIAT: '#8B0000', RENAULT: '#FFCC00', HYUNDAI: '#002C5F',
  NISSAN: '#C3002F', BMW: '#0066CC', MERCEDES: '#333333',
  'MERCEDES-BENZ': '#333333', AUDI: '#BB0A21', KIA: '#05141F',
  BYD: '#1DB954', DEFAULT: '#1a2e5a',
}

function getBrandLogo(marca: string): string | null {
  const m = marca?.toUpperCase().trim() ?? ''
  for (const key of Object.keys(BRAND_LOGO)) {
    if (m.includes(key)) return BRAND_LOGO[key]
  }
  return null
}
function getBrandColor(marca: string): string {
  const m = marca?.toUpperCase().trim() ?? ''
  for (const key of Object.keys(BRAND_COLOR)) {
    if (m.includes(key)) return BRAND_COLOR[key]
  }
  return BRAND_COLOR.DEFAULT
}

function formatPlaca(v: string) { return v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7) }
function formatCpf(v: string) { return v.replace(/\D/g, '').slice(0, 11) }
function formatCnpj(v: string) { return v.replace(/\D/g, '').slice(0, 14) }
function maskCpf(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}
function maskCnpj(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 14)
  if (d.length <= 2) return d
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}
function isMercosul(p: string) {
  const c = p.replace(/[^A-Z0-9]/gi, '').toUpperCase()
  return c.length >= 5 && /[A-Z]/.test(c[4])
}
function moedaBR(v: any) {
  const n = parseFloat(String(v ?? '0').replace(/\./g, '').replace(',', '.')) || 0
  return n > 0 ? `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : null
}

type Produto = 'veiculo' | 'cpf' | 'credito'

// ─── Produtos definidos ────────────────────────────────────────────────────────
const PRODUTOS = [
  {
    id: 'veiculo' as Produto,
    icon: Car,
    label: 'Consulta Veicular',
    descricao: 'Laudo completo do veiculo por placa ou chassi',
    cor: 'green',
    preco: 'R$ 36,90',
    unidade: 'por consulta',
    itens: [
      'Identificacao e dados do veiculo',
      'Restricoes DETRAN / DENATRAN',
      'Roubo e furto (BIN Federal)',
      'RENAJUD (restricoes judiciais)',
      'Gravame e alienacao fiduciaria',
      'Historico de leilao (3 bases)',
      'Indicio de sinistro',
      'Tabela FIPE + valor de mercado',
      'Processos judiciais (DataJud)',
    ],
    badge: 'Produto principal',
  },
  {
    id: 'cpf' as Produto,
    icon: User,
    label: 'Consulta CPF',
    descricao: 'Perfil completo de pessoa fisica com dados cadastrais e judiciais',
    cor: 'blue',
    preco: 'R$ 14,90',
    unidade: 'por consulta',
    itens: [
      'Dados basicos e situacao CPF',
      'Telefones e e-mails',
      'Historico de enderecos',
      'Processos judiciais',
      'Protestos em cartorio',
      'Renda presumida',
      'PEP (Pessoa Politicamente Exposta',
      'Participacao societaria',
      'Veiculos vinculados ao CPF',
    ],
    badge: null,
  },
  {
    id: 'credito' as Produto,
    icon: BarChart3,
    label: 'Analise de Credito',
    descricao: 'Score SPC/Serasa com negativacoes, protestos e acoes judiciais',
    cor: 'purple',
    preco: 'R$ 30,00',
    unidade: 'por consulta',
    itens: [
      'Score de credito 0 a 1000',
      'Negativacoes (SPC / Serasa)',
      'Protestos em cartorio',
      'Valor total de debitos',
      'Acoes judiciais',
      'Renda presumida',
      'Consulta CPF ou CNPJ',
    ],
    badge: 'Produto novo',
  },
]

const COR: Record<string, { bg: string; text: string; border: string; btn: string; light: string }> = {
  green:  { bg: 'bg-brand-green',  text: 'text-brand-green',  border: 'border-brand-green',  btn: 'bg-brand-green hover:bg-brand-green/90 text-white',  light: 'bg-brand-green-light'  },
  blue:   { bg: 'bg-blue-600',     text: 'text-blue-600',     border: 'border-blue-600',     btn: 'bg-blue-600 hover:bg-blue-700 text-white',           light: 'bg-blue-50'            },
  purple: { bg: 'bg-purple-600',   text: 'text-purple-600',   border: 'border-purple-600',   btn: 'bg-purple-600 hover:bg-purple-700 text-white',       light: 'bg-purple-50'          },
}

// ─── Card Preview Veiculo ──────────────────────────────────────────────────────
function CardPreviewVeiculo({ dados, placa, onConsultaCompleta, onNovaConsulta }: {
  dados: any; placa: string
  onConsultaCompleta: () => void
  onNovaConsulta: () => void
}) {
  const [logoError, setLogoError] = useState(false)
  const logoUrl = !logoError ? getBrandLogo(dados.marca ?? '') : null
  const cor = getBrandColor(dados.marca ?? '')
  const nomeVeic = dados.marca && dados.modelo ? `${dados.marca} ${dados.modelo}` : dados.marca ?? 'Veiculo'
  const anoStr = dados.anoFabricacao ? `${dados.anoFabricacao}${dados.anoModelo && dados.anoModelo !== dados.anoFabricacao ? `/${dados.anoModelo}` : ''}` : ''
  const fipe = moedaBR(dados.fipeValor)

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <div className="rounded-2xl overflow-hidden mb-4" style={{ background: `linear-gradient(135deg, ${cor}dd 0%, ${cor}99 100%)` }}>
        <div className="p-5 flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 overflow-hidden border border-white/30">
            {logoUrl
              ? <img src={logoUrl} alt={dados.marca ?? ''} className="w-11 h-11 object-contain" onError={() => setLogoError(true)} />
              : <span className="text-2xl font-black text-white">{(dados.marca ?? '?').slice(0, 2).toUpperCase()}</span>
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white/60 text-[10px] uppercase tracking-widest">{anoStr}{dados.cor ? ` · ${dados.cor}` : ''}</p>
            <p className="text-white font-extrabold text-lg leading-tight uppercase truncate">{nomeVeic}</p>
            <span className="inline-block font-mono text-sm font-black text-white/90 tracking-[0.2em] bg-white/20 px-3 py-0.5 rounded-lg mt-1">{placa}</span>
          </div>
          {fipe && (
            <div className="shrink-0 text-right">
              <p className="text-white/60 text-[10px]">FIPE</p>
              <p className="text-white font-bold text-sm">{fipe}</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-gray-900 rounded-2xl p-5 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <p className="text-xs font-bold text-white">Consulta gratuita. Dados ocultos na versao completa:</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {['Restricoes DETRAN / DENATRAN', 'Roubo e Furto (BIN Federal)', 'Gravame / Alienacao Fiduciaria', 'Historico de Leilao (3 bases)', 'Indicio de Sinistro', 'RENAJUD (Restricao Judicial)', 'Processos Judiciais (DataJud)', 'Score de Risco 0 a 100'].map(item => (
            <div key={item} className="flex items-center gap-2 text-xs text-gray-400">
              <div className="w-3 h-3 rounded-full border border-dashed border-gray-600 shrink-0" />
              {item}
            </div>
          ))}
        </div>
      </div>

      <button onClick={onConsultaCompleta} className="w-full h-14 rounded-2xl bg-brand-green hover:opacity-90 text-white font-bold text-base flex items-center justify-center gap-3 transition-all shadow-lg mb-3">
        <FileSearch className="w-5 h-5" />
        Ver Relatorio Completo
        <span className="ml-auto text-xs font-normal bg-white/20 px-2.5 py-1 rounded-full">1 credito</span>
      </button>
      <button onClick={onNovaConsulta} className="w-full h-10 text-sm font-medium text-gray-500 hover:text-brand-dark border border-gray-200 hover:border-gray-400 rounded-xl transition-all">
        Consultar outra placa
      </button>
    </div>
  )
}

// ─── Formulario por produto ────────────────────────────────────────────────────
function FormularioProduto({ produto, onVoltar }: { produto: Produto; onVoltar: () => void }) {
  const router = useRouter()
  const [valor, setValor] = useState('')
  const [subTipo, setSubTipo] = useState<'placa' | 'chassi'>('placa')
  const [creditoTipo, setCreditoTipo] = useState<'cpf' | 'cnpj'>('cpf')
  const [mercosul, setMercosul] = useState(true)
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<any>(null)

  const p = PRODUTOS.find(x => x.id === produto)!
  const c = COR[p.cor]

  function handleChange(v: string) {
    if (produto === 'veiculo' && subTipo === 'placa') {
      const fmt = formatPlaca(v)
      setValor(fmt)
      if (fmt.length >= 5) setMercosul(isMercosul(fmt))
    } else if (produto === 'veiculo') {
      setValor(v.toUpperCase().slice(0, 17))
    } else if (produto === 'cpf') {
      setValor(formatCpf(v))
    } else {
      if (creditoTipo === 'cpf') setValor(formatCpf(v))
      else setValor(formatCnpj(v))
    }
  }

  function displayValor() {
    if (produto === 'cpf') return maskCpf(valor)
    if (produto === 'credito') return creditoTipo === 'cpf' ? maskCpf(valor) : maskCnpj(valor)
    return valor
  }

  function isValido() {
    if (produto === 'veiculo') return subTipo === 'placa' ? valor.length === 7 : valor.length === 17
    if (produto === 'cpf') return valor.length === 11
    if (produto === 'credito') return creditoTipo === 'cpf' ? valor.length === 11 : valor.length === 14
    return false
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValido()) return
    setLoading(true)

    if (produto === 'credito') {
      router.push(creditoTipo === 'cpf' ? `/dashboard/credito/cpf/${valor}` : `/dashboard/credito/cnpj/${valor}`)
      return
    }
    if (produto === 'cpf') {
      router.push(`/dashboard/relatorio/cpf/${valor}`)
      return
    }
    if (subTipo === 'chassi') {
      router.push(`/dashboard/relatorio/${valor}`)
      return
    }
    try {
      const res = await fetch(`/api/preview/placa/${valor}`)
      const data = await res.json()
      setPreview({ ...data, placa: valor })
    } catch {
      setPreview({ placa: valor, marca: null, modelo: null, erro: 'Falha ao consultar' })
    } finally {
      setLoading(false)
    }
  }

  if (preview) {
    return (
      <div className="max-w-2xl mx-auto">
        <button onClick={() => { setPreview(null); setValor('') }} className="flex items-center gap-2 text-sm text-brand-gray hover:text-brand-dark mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <CardPreviewVeiculo
          dados={preview}
          placa={valor}
          onConsultaCompleta={() => router.push(`/dashboard/relatorio/${valor}`)}
          onNovaConsulta={() => { setPreview(null); setValor('') }}
        />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={onVoltar} className="flex items-center gap-2 text-sm text-brand-gray hover:text-brand-dark mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Todos os produtos
      </button>

      {/* Header do produto */}
      <div className={`rounded-2xl p-5 mb-6 ${c.light} border ${c.border}/30`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center shrink-0`}>
            <p.icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-brand-dark">{p.label}</h1>
            <p className="text-sm text-brand-gray">{p.descricao}</p>
          </div>
          <div className="ml-auto text-right shrink-0">
            <p className={`text-xl font-black ${c.text}`}>{p.preco}</p>
            <p className="text-xs text-brand-gray">{p.unidade}</p>
          </div>
        </div>
      </div>

      {/* Sub-tipo para veiculo */}
      {produto === 'veiculo' && (
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex gap-2">
            {(['placa', 'chassi'] as const).map(t => (
              <button key={t} onClick={() => { setSubTipo(t); setValor('') }}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  subTipo === t ? `${c.border} ${c.light} ${c.text}` : 'border-brand-border text-brand-gray'
                }`}
              >
                {t === 'placa' ? <Car className="w-3.5 h-3.5" /> : <Hash className="w-3.5 h-3.5" />}
                {t === 'placa' ? 'Por Placa' : 'Por Chassi'}
              </button>
            ))}
          </div>
          {subTipo === 'placa' && (
            <button type="button" onClick={() => setMercosul(m => !m)}
              className="flex items-center gap-2 text-xs font-medium text-brand-gray select-none"
            >
              <span className={mercosul ? 'text-brand-dark font-semibold' : ''}>Mercosul</span>
              <div className={`relative w-10 h-5 rounded-full transition-colors ${mercosul ? 'bg-brand-green' : 'bg-brand-gray-light border border-brand-border'}`}>
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${mercosul ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
              <span className={!mercosul ? 'text-brand-dark font-semibold' : ''}>Antiga</span>
            </button>
          )}
        </div>
      )}

      {/* Sub-tipo para credito */}
      {produto === 'credito' && (
        <div className="flex gap-2 mb-5">
          {(['cpf', 'cnpj'] as const).map(t => (
            <button key={t} type="button" onClick={() => { setCreditoTipo(t); setValor('') }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all border ${
                creditoTipo === t ? `${c.border} ${c.light} ${c.text}` : 'border-brand-border text-brand-gray'
              }`}
            >
              {t === 'cpf' ? <User className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
              {t === 'cpf' ? 'Pessoa Fisica (CPF)' : 'Empresa (CNPJ)'}
            </button>
          ))}
        </div>
      )}

      {/* Formulario */}
      <div className="card p-6 mb-6">
        <form onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-brand-dark mb-2">
            {produto === 'veiculo' && (subTipo === 'placa' ? 'Placa do veiculo' : 'Numero do chassi')}
            {produto === 'cpf' && 'CPF da pessoa fisica'}
            {produto === 'credito' && (creditoTipo === 'cpf' ? 'CPF para analise de credito' : 'CNPJ para analise de credito')}
          </label>
          <input
            type="text"
            value={displayValor()}
            onChange={e => handleChange(e.target.value)}
            placeholder={
              produto === 'veiculo'
                ? subTipo === 'placa' ? (mercosul ? 'ABC1D23' : 'ABC-1234') : 'Ex: 93HFC2630HZ104454'
                : produto === 'cpf' ? '000.000.000-00'
                : creditoTipo === 'cpf' ? '000.000.000-00' : '00.000.000/0001-00'
            }
            className="input-base text-xl font-mono tracking-widest text-center h-14 mb-5"
            required
          />

          {produto === 'veiculo' && subTipo === 'placa' ? (
            <div className="grid grid-cols-2 gap-3">
              <button type="submit" disabled={loading || !isValido()}
                className={`h-12 text-sm font-semibold rounded-xl border-2 ${c.border} ${c.text} ${c.light} hover:opacity-90 transition-all disabled:opacity-40 flex items-center justify-center gap-2`}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                Verificar Gratis
              </button>
              <button type="button" disabled={loading || !isValido()}
                onClick={() => { if (isValido()) router.push(`/dashboard/relatorio/${valor}`) }}
                className={`h-12 text-sm font-semibold rounded-xl ${c.btn} disabled:opacity-40 flex items-center justify-center gap-2 transition-all`}
              >
                <FileSearch className="w-4 h-4" />
                Consulta Completa
                <ChevronRight className="w-3.5 h-3.5 ml-auto" />
              </button>
            </div>
          ) : (
            <button type="submit" disabled={loading || !isValido()}
              className={`w-full h-12 text-base font-semibold rounded-xl ${c.btn} disabled:opacity-40 flex items-center justify-center gap-2 transition-all`}
            >
              {loading
                ? <><Loader2 className="w-5 h-5 animate-spin" /> Consultando...</>
                : <><Search className="w-5 h-5" /> Consultar agora</>
              }
            </button>
          )}
        </form>
      </div>

      {/* O que esta incluido */}
      <div className="card p-5">
        <h3 className="text-sm font-bold text-brand-dark mb-3">O que esta incluido nesta consulta</h3>
        <div className="grid grid-cols-1 gap-2">
          {p.itens.map(item => (
            <div key={item} className="flex items-center gap-2 text-sm text-brand-gray">
              <CheckCircle2 className={`w-4 h-4 shrink-0 ${c.text}`} />
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Pagina principal ──────────────────────────────────────────────────────────
export default function ConsultarPage() {
  const [produtoAtivo, setProdutoAtivo] = useState<Produto | null>(null)

  if (produtoAtivo) {
    return <FormularioProduto produto={produtoAtivo} onVoltar={() => setProdutoAtivo(null)} />
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-brand-dark mb-1">Nova Consulta</h1>
        <p className="text-brand-gray text-sm">Escolha o produto e informe os dados para consultar</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {PRODUTOS.map(p => {
          const c = COR[p.cor]
          return (
            <button
              key={p.id}
              onClick={() => setProdutoAtivo(p.id)}
              className="text-left bg-white rounded-2xl border border-brand-border hover:border-brand-green/40 hover:shadow-lg transition-all duration-200 overflow-hidden group"
            >
              {/* Topo colorido */}
              <div className={`h-1.5 ${c.bg} w-full`} />

              <div className="p-5">
                {/* Icon + badge */}
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-11 h-11 rounded-xl ${c.light} flex items-center justify-center`}>
                    <p.icon className={`w-5 h-5 ${c.text}`} />
                  </div>
                  {p.badge && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.light} ${c.text} border ${c.border}/30`}>
                      {p.badge}
                    </span>
                  )}
                </div>

                {/* Nome e descricao */}
                <h2 className="text-base font-bold text-brand-dark mb-1">{p.label}</h2>
                <p className="text-xs text-brand-gray mb-4 leading-relaxed">{p.descricao}</p>

                {/* Itens incluidos */}
                <div className="space-y-1.5 mb-5">
                  {p.itens.slice(0, 5).map(item => (
                    <div key={item} className="flex items-center gap-2 text-xs text-brand-gray">
                      <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${c.text}`} />
                      {item}
                    </div>
                  ))}
                  {p.itens.length > 5 && (
                    <p className={`text-xs font-medium ${c.text}`}>+ {p.itens.length - 5} itens incluidos</p>
                  )}
                </div>

                {/* Preco + botao */}
                <div className={`flex items-center justify-between pt-4 border-t border-brand-border`}>
                  <div>
                    <p className={`text-lg font-black ${c.text}`}>{p.preco}</p>
                    <p className="text-[10px] text-brand-gray">{p.unidade}</p>
                  </div>
                  <div className={`flex items-center gap-1.5 text-xs font-semibold ${c.text} group-hover:gap-2.5 transition-all`}>
                    Consultar <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Banner info */}
      <div className="mt-6 flex items-center gap-3 bg-brand-green-light border border-brand-green/20 rounded-2xl p-4">
        <Shield className="w-5 h-5 text-brand-green shrink-0" />
        <p className="text-sm text-brand-dark">
          <strong>Consulta Veicular</strong> tem verificacao gratuita de placa disponivel.
          Dados completos sao debitados do seu saldo apenas na consulta completa.
        </p>
      </div>
    </div>
  )
}
