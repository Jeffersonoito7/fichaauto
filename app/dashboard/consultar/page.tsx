'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, Car, Hash, User, Building2, Loader2,
  History, Zap, ChevronRight, AlertCircle, FileSearch, CreditCard,
} from 'lucide-react'

// ─── Logos das marcas ─────────────────────────────────────────────────────────
const BRAND_LOGO: Record<string, string> = {
  TOYOTA:      'https://logo.clearbit.com/toyota.com',
  HONDA:       'https://logo.clearbit.com/honda.com',
  VOLKSWAGEN:  'https://logo.clearbit.com/vw.com',
  VW:          'https://logo.clearbit.com/vw.com',
  CHEVROLET:   'https://logo.clearbit.com/chevrolet.com',
  GM:          'https://logo.clearbit.com/gm.com',
  FORD:        'https://logo.clearbit.com/ford.com',
  FIAT:        'https://logo.clearbit.com/fiat.com',
  RENAULT:     'https://logo.clearbit.com/renault.com',
  HYUNDAI:     'https://logo.clearbit.com/hyundai.com',
  NISSAN:      'https://logo.clearbit.com/nissan.com',
  MITSUBISHI:  'https://logo.clearbit.com/mitsubishi.com',
  JEEP:        'https://logo.clearbit.com/jeep.com',
  BMW:         'https://logo.clearbit.com/bmw.com',
  'MERCEDES-BENZ': 'https://logo.clearbit.com/mercedes-benz.com',
  MERCEDES:    'https://logo.clearbit.com/mercedes-benz.com',
  AUDI:        'https://logo.clearbit.com/audi.com',
  KIA:         'https://logo.clearbit.com/kia.com',
  PEUGEOT:     'https://logo.clearbit.com/peugeot.com',
  CITROEN:     'https://logo.clearbit.com/citroen.com',
  'CITROËN':   'https://logo.clearbit.com/citroen.com',
  VOLVO:       'https://logo.clearbit.com/volvocars.com',
  SUBARU:      'https://logo.clearbit.com/subaru.com',
  LAND:        'https://logo.clearbit.com/landrover.com',
  CHERY:       'https://logo.clearbit.com/chery.com',
  CAOA:        'https://logo.clearbit.com/chery.com',
  JAC:         'https://logo.clearbit.com/jacmotors.com',
  BYD:         'https://logo.clearbit.com/byd.com',
  GWM:         'https://logo.clearbit.com/gwm.com',
  HAVAL:       'https://logo.clearbit.com/haval.com',
  DODGE:       'https://logo.clearbit.com/dodge.com',
  RAM:         'https://logo.clearbit.com/ramtrucks.com',
  PORSCHE:     'https://logo.clearbit.com/porsche.com',
  FERRARI:     'https://logo.clearbit.com/ferrari.com',
  LAMBORGHINI: 'https://logo.clearbit.com/lamborghini.com',
}

const BRAND_COLOR: Record<string, string> = {
  TOYOTA: '#EB0A1E', HONDA: '#CC0000', VOLKSWAGEN: '#001E50',
  VW: '#001E50', CHEVROLET: '#D4AF37', GM: '#D4AF37',
  FORD: '#003478', FIAT: '#8B0000', RENAULT: '#FFCC00',
  HYUNDAI: '#002C5F', NISSAN: '#C3002F', MITSUBISHI: '#EE1C25',
  JEEP: '#4A7C59', BMW: '#0066CC', MERCEDES: '#333333',
  'MERCEDES-BENZ': '#333333', AUDI: '#BB0A21', KIA: '#05141F',
  PEUGEOT: '#0055A5', CITROEN: '#9E0B0F', 'CITROËN': '#9E0B0F',
  VOLVO: '#003057', BYD: '#1DB954', DEFAULT: '#1a2e5a',
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatPlaca(v: string)  { return v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7) }
function formatCpf(v: string)    { return v.replace(/\D/g, '').slice(0, 11) }
function formatCnpj(v: string)   { return v.replace(/\D/g, '').slice(0, 14) }
function maskCpf(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0,3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`
}
function maskCnpj(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 14)
  if (d.length <= 2) return d
  if (d.length <= 5) return `${d.slice(0,2)}.${d.slice(2)}`
  if (d.length <= 8) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5)}`
  if (d.length <= 12) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8)}`
  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`
}
function isMercosul(p: string) {
  const c = p.replace(/[^A-Z0-9]/gi, '').toUpperCase()
  return c.length >= 5 && /[A-Z]/.test(c[4])
}
function moedaBR(v: any) {
  const n = parseFloat(String(v ?? '0').replace(/\./g, '').replace(',', '.')) || 0
  return n > 0 ? `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : null
}

type Aba = 'veiculo' | 'cpf' | 'cnpj' | 'credito'

interface FipeResult {
  placa: string
  marca: string | null
  modelo: string | null
  anoFab: string | null
  anoMod: string | null
  cor: string | null
  combustivel: string | null
  renavam: string | null
  chassi: string | null
  valorFipe: any
  valorMercado: any
  codigoFipe: string | null
  mesReferencia: string | null
  erro?: string
}

// ─── Card Preview FIPE ────────────────────────────────────────────────────────
function CardPreviewFipe({
  dados, placa, onConsultaCompleta, onNovaConsulta
}: {
  dados: FipeResult
  placa: string
  onConsultaCompleta: () => void
  onNovaConsulta: () => void
}) {
  const [logoError, setLogoError] = useState(false)
  const logoUrl  = !logoError ? getBrandLogo(dados.marca ?? '') : null
  const cor      = getBrandColor(dados.marca ?? '')
  const marcaAbv = (dados.marca ?? '?').toUpperCase().slice(0, 2)
  const fipe     = moedaBR(dados.valorFipe)
  const mercado  = moedaBR(dados.valorMercado)

  return (
    <div className="animate-fade-in">
      {/* Card principal */}
      <div className="card p-6 mb-4">
        {/* Header com logo e placa */}
        <div className="flex items-center gap-4 mb-5">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden"
            style={{ backgroundColor: `${cor}15`, border: `2px solid ${cor}30` }}
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={dados.marca ?? ''}
                className="w-10 h-10 object-contain"
                onError={() => setLogoError(true)}
              />
            ) : (
              <span className="text-xl font-black" style={{ color: cor }}>{marcaAbv}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-brand-dark text-lg leading-tight truncate">
              {dados.marca && dados.modelo
                ? `${dados.marca} ${dados.modelo}`
                : dados.marca ?? dados.modelo ?? 'Veículo encontrado'}
            </p>
            {(dados.anoFab || dados.anoMod) && (
              <p className="text-sm text-brand-gray font-medium">
                {dados.anoFab ?? ''}{dados.anoMod && dados.anoMod !== dados.anoFab ? `/${dados.anoMod}` : ''}
              </p>
            )}
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono text-xs font-bold bg-brand-blue-light text-brand-blue px-2 py-0.5 rounded">
                {placa}
              </span>
              {dados.cor && (
                <span className="text-xs text-brand-gray">{dados.cor}</span>
              )}
              {dados.combustivel && (
                <span className="text-xs text-brand-gray">• {dados.combustivel}</span>
              )}
            </div>
          </div>
        </div>

        {/* Valores FIPE */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-brand-green-light rounded-xl p-3 border border-brand-green/20">
            <p className="text-xs text-brand-gray mb-1">Tabela FIPE</p>
            <p className="text-lg font-black text-brand-green">{fipe ?? '—'}</p>
            {dados.mesReferencia && (
              <p className="text-[10px] text-brand-gray mt-0.5">{dados.mesReferencia}</p>
            )}
          </div>
          <div className="bg-brand-blue-light rounded-xl p-3 border border-brand-blue/20">
            <p className="text-xs text-brand-gray mb-1">Valor de Mercado</p>
            <p className="text-lg font-black text-brand-blue">{mercado ?? '—'}</p>
            {dados.codigoFipe && (
              <p className="text-[10px] text-brand-gray mt-0.5">Cód. {dados.codigoFipe}</p>
            )}
          </div>
        </div>

        {/* Aviso sobre dados adicionais */}
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl mb-5">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">
            Esta é uma <strong>consulta gratuita</strong>. Para ver restrições, gravame, leilão,
            RENAJUD e sinistro, faça a Consulta Completa.
          </p>
        </div>

        {/* Botão principal */}
        <button
          onClick={onConsultaCompleta}
          className="btn-primary w-full h-12 text-base mb-3"
        >
          <FileSearch className="w-5 h-5" />
          Consulta Completa
          <span className="ml-auto text-xs font-normal opacity-80 bg-white/20 px-2 py-0.5 rounded-full">
            1 crédito
          </span>
        </button>

        <button
          onClick={onNovaConsulta}
          className="w-full h-10 text-sm font-medium text-brand-gray hover:text-brand-dark border border-brand-border hover:border-brand-dark/30 rounded-xl transition-all"
        >
          Nova consulta
        </button>
      </div>
    </div>
  )
}

// ─── Página principal ──────────────────────────────────────────────────────────
export default function ConsultarPage() {
  const router = useRouter()
  const [aba, setAba]           = useState<Aba>('veiculo')
  const [subTipo, setSubTipo]   = useState<'placa' | 'chassi'>('placa')
  const [valor, setValor]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [mercosul, setMercosul] = useState(true)
  const [fipeResult, setFipeResult] = useState<FipeResult | null>(null)

  const [creditoTipo, setCreditoTipo] = useState<'cpf' | 'cnpj'>('cpf')

  function handleChange(v: string) {
    if (aba === 'veiculo' && subTipo === 'placa') {
      const fmt = formatPlaca(v)
      setValor(fmt)
      if (fmt.length >= 5) setMercosul(isMercosul(fmt))
    } else if (aba === 'veiculo') {
      setValor(v.toUpperCase().slice(0, 17))
    } else if (aba === 'cpf' || (aba === 'credito' && creditoTipo === 'cpf')) {
      setValor(formatCpf(v))
    } else {
      setValor(formatCnpj(v))
    }
  }

  function isValido() {
    if (aba === 'veiculo') return subTipo === 'placa' ? valor.length === 7 : valor.length === 17
    if (aba === 'cpf')     return valor.length === 11
    if (aba === 'credito') return creditoTipo === 'cpf' ? valor.length === 11 : valor.length === 14
    return valor.length === 14
  }

  function displayValor() {
    if (aba === 'cpf' || (aba === 'credito' && creditoTipo === 'cpf')) return maskCpf(valor)
    if (aba === 'cnpj' || (aba === 'credito' && creditoTipo === 'cnpj')) return maskCnpj(valor)
    return valor
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValido()) return
    setLoading(true)
    setFipeResult(null)

    if (aba === 'credito') {
      router.push(creditoTipo === 'cpf'
        ? `/dashboard/credito/cpf/${valor}`
        : `/dashboard/credito/cnpj/${valor}`)
      return
    }
    if (aba === 'cpf')  { router.push(`/dashboard/relatorio/cpf/${valor}`);  return }
    if (aba === 'cnpj') { router.push(`/dashboard/relatorio/cnpj/${valor}`); return }

    if (subTipo === 'chassi') {
      router.push(`/dashboard/relatorio/${valor}`)
      return
    }

    // Placa: consulta FIPE gratuita primeiro
    try {
      const res  = await fetch(`/api/fipe/${valor}`)
      const data = await res.json()
      setFipeResult({ ...data, placa: valor })
    } catch {
      setFipeResult({ placa: valor, marca: null, modelo: null, anoFab: null, anoMod: null, cor: null, combustivel: null, renavam: null, chassi: null, valorFipe: null, valorMercado: null, codigoFipe: null, mesReferencia: null, erro: 'Falha ao consultar' })
    } finally {
      setLoading(false)
    }
  }

  const abas = [
    { id: 'veiculo' as Aba, icon: Car,        label: 'Veículo'  },
    { id: 'cpf'     as Aba, icon: User,       label: 'CPF'      },
    { id: 'cnpj'    as Aba, icon: Building2,  label: 'CNPJ'     },
    { id: 'credito' as Aba, icon: CreditCard, label: 'Crédito'  },
  ]

  // ─── Se tem resultado FIPE, exibe o preview ───────────────────────────────
  if (fipeResult) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-brand-dark mb-1">Resultado</h1>
          <p className="text-brand-gray text-sm">Consulta gratuita realizada</p>
        </div>
        <CardPreviewFipe
          dados={fipeResult}
          placa={valor}
          onConsultaCompleta={() => router.push(`/dashboard/relatorio/${valor}`)}
          onNovaConsulta={() => { setFipeResult(null); setValor('') }}
        />
      </div>
    )
  }

  // ─── Formulário normal ────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-brand-dark mb-1">Nova Consulta</h1>
        <p className="text-brand-gray text-sm">Verifique gratuitamente ou faça a consulta completa</p>
      </div>

      <div className="card p-8 mb-6">
        {/* Abas */}
        <div className="flex gap-2 p-1 bg-brand-gray-light rounded-xl mb-6">
          {abas.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => { setAba(id); setValor(''); setFipeResult(null) }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                aba === id ? 'bg-white text-brand-blue shadow-card' : 'text-brand-gray hover:text-brand-dark'
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {/* Sub-abas veículo */}
        {aba === 'veiculo' && (
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div className="flex gap-2">
              {(['placa', 'chassi'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => { setSubTipo(t); setValor('') }}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    subTipo === t
                      ? 'border-brand-green bg-brand-green-light text-brand-green'
                      : 'border-brand-border text-brand-gray hover:border-brand-green/40'
                  }`}
                >
                  {t === 'placa' ? <Car className="w-3.5 h-3.5" /> : <Hash className="w-3.5 h-3.5" />}
                  {t === 'placa' ? 'Por Placa' : 'Por Chassi'}
                </button>
              ))}
            </div>
            {subTipo === 'placa' && (
              <button
                type="button"
                onClick={() => setMercosul(m => !m)}
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

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            {/* Sub-seletor CPF/CNPJ na aba Crédito */}
            {aba === 'credito' && (
              <div className="flex gap-2 mb-4">
                {(['cpf', 'cnpj'] as const).map(t => (
                  <button key={t} type="button"
                    onClick={() => { setCreditoTipo(t); setValor('') }}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                      creditoTipo === t
                        ? 'border-brand-blue bg-blue-50 text-brand-blue'
                        : 'border-brand-border text-brand-gray hover:border-brand-blue/40'
                    }`}
                  >
                    {t === 'cpf' ? <User className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
                    {t === 'cpf' ? 'Pessoa Física (CPF)' : 'Empresa (CNPJ)'}
                  </button>
                ))}
              </div>
            )}
            <label className="block text-sm font-medium text-brand-dark mb-2">
              {aba === 'veiculo'  && (subTipo === 'placa' ? 'Placa do veículo' : 'Número do chassi')}
              {aba === 'cpf'     && 'CPF da pessoa física'}
              {aba === 'cnpj'    && 'CNPJ da empresa'}
              {aba === 'credito' && (creditoTipo === 'cpf' ? 'CPF para análise de crédito' : 'CNPJ para análise de crédito')}
            </label>
            <input
              type="text"
              value={displayValor()}
              onChange={e => handleChange(e.target.value)}
              placeholder={
                aba === 'veiculo'
                  ? subTipo === 'placa' ? (mercosul ? 'ABC1D23' : 'ABC-1234') : 'Ex: 93HFC2630HZ104454'
                  : aba === 'cpf' ? '000.000.000-00' : '00.000.000/0001-00'
              }
              className="input-base text-xl font-mono tracking-widest text-center h-14"
              required
            />
          </div>

          {/* Dois botões para veículo por placa */}
          {aba === 'veiculo' && subTipo === 'placa' ? (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="submit"
                disabled={loading || !isValido()}
                className="h-12 text-sm font-semibold rounded-xl border-2 border-brand-green text-brand-green bg-brand-green-light hover:bg-brand-green hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                Verificar Grátis
              </button>
              <button
                type="button"
                disabled={loading || !isValido()}
                onClick={() => { if (isValido()) router.push(`/dashboard/relatorio/${valor}`) }}
                className="btn-primary h-12 text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <FileSearch className="w-4 h-4" />
                Consulta Completa
                <ChevronRight className="w-3.5 h-3.5 ml-auto" />
              </button>
            </div>
          ) : aba === 'credito' ? (
            <button
              type="submit"
              disabled={loading || !isValido()}
              className="w-full h-12 text-base font-semibold rounded-xl bg-brand-blue text-white hover:bg-blue-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading
                ? <><Loader2 className="w-5 h-5 animate-spin" /> Consultando...</>
                : <><CreditCard className="w-5 h-5" /> Análise de Crédito</>
              }
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading || !isValido()}
              className="btn-primary w-full h-12 text-base"
            >
              {loading
                ? <><Loader2 className="w-5 h-5 animate-spin" /> Consultando...</>
                : <><Search className="w-5 h-5" /> Consultar agora</>
              }
            </button>
          )}
        </form>

        <div className="mt-4 flex items-center justify-between text-xs text-brand-gray">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-brand-green" />
            {aba === 'veiculo' && subTipo === 'placa'
              ? 'Verificação gratuita disponível'
              : 'Resposta em menos de 5 segundos'}
          </div>
          <span className="font-medium text-brand-dark">
            {aba === 'veiculo' && subTipo === 'placa'
              ? 'Consulta Completa = 1 crédito'
              : '1 consulta será debitada'}
          </span>
        </div>
      </div>

      {/* O que está incluído */}
      {aba === 'veiculo' && subTipo === 'placa' && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="card p-4 border-2 border-brand-green/30">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-brand-green" />
              <h3 className="text-sm font-bold text-brand-dark">Verificar Grátis</h3>
            </div>
            {['Dados do veículo', 'Marca / Modelo / Ano', 'Cor e combustível', 'Valor FIPE', 'Valor de mercado'].map(i => (
              <p key={i} className="text-xs text-brand-gray flex items-start gap-1.5 mb-1">
                <span className="text-brand-green font-bold">✓</span>{i}
              </p>
            ))}
          </div>
          <div className="card p-4 border-2 border-brand-blue/30">
            <div className="flex items-center gap-2 mb-3">
              <FileSearch className="w-4 h-4 text-brand-blue" />
              <h3 className="text-sm font-bold text-brand-dark">Consulta Completa</h3>
            </div>
            {['Tudo do gratuito +', 'RENAJUD judicial', 'Gravame / Alienação', 'Leilão (3 bases)', 'Roubo e Furto', 'Indício de Sinistro'].map(i => (
              <p key={i} className="text-xs text-brand-gray flex items-start gap-1.5 mb-1">
                <span className="text-brand-blue font-bold">✓</span>{i}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
