'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, ChevronRight, Car, Fuel, MapPin, Palette,
  FileText, Tag, Loader2, AlertCircle, Shield, Gavel,
  TrendingUp, ClipboardList, Lock,
} from 'lucide-react'

const BRAND_LOGO: Record<string, string> = {
  TOYOTA:          'https://logo.clearbit.com/toyota.com',
  HONDA:           'https://logo.clearbit.com/honda.com',
  VOLKSWAGEN:      'https://logo.clearbit.com/vw.com',
  VW:              'https://logo.clearbit.com/vw.com',
  CHEVROLET:       'https://logo.clearbit.com/chevrolet.com',
  GM:              'https://logo.clearbit.com/gm.com',
  FORD:            'https://logo.clearbit.com/ford.com',
  FIAT:            'https://logo.clearbit.com/fiat.com',
  RENAULT:         'https://logo.clearbit.com/renault.com',
  HYUNDAI:         'https://logo.clearbit.com/hyundai.com',
  NISSAN:          'https://logo.clearbit.com/nissan.com',
  MITSUBISHI:      'https://logo.clearbit.com/mitsubishi.com',
  JEEP:            'https://logo.clearbit.com/jeep.com',
  BMW:             'https://logo.clearbit.com/bmw.com',
  MERCEDESBENZ:    'https://logo.clearbit.com/mercedes-benz.com',
  MERCEDES:        'https://logo.clearbit.com/mercedes-benz.com',
  AUDI:            'https://logo.clearbit.com/audi.com',
  KIA:             'https://logo.clearbit.com/kia.com',
  PEUGEOT:         'https://logo.clearbit.com/peugeot.com',
  CITROEN:         'https://logo.clearbit.com/citroen.com',
  VOLVO:           'https://logo.clearbit.com/volvocars.com',
  SUBARU:          'https://logo.clearbit.com/subaru.com',
  CHERY:           'https://logo.clearbit.com/chery.com',
  JAC:             'https://logo.clearbit.com/jacmotors.com',
  BYD:             'https://logo.clearbit.com/byd.com',
  GWM:             'https://logo.clearbit.com/gwm.com',
  HAVAL:           'https://logo.clearbit.com/haval.com',
  DODGE:           'https://logo.clearbit.com/dodge.com',
  RAM:             'https://logo.clearbit.com/ramtrucks.com',
  PORSCHE:         'https://logo.clearbit.com/porsche.com',
  LAND:            'https://logo.clearbit.com/landrover.com',
  YAMAHA:          'https://logo.clearbit.com/yamaha-motor.com',
  SUZUKI:          'https://logo.clearbit.com/suzuki.com',
  KAWASAKI:        'https://logo.clearbit.com/kawasaki.com',
  TRIUMPH:         'https://logo.clearbit.com/triumphmotorcycles.com',
  HARLEYDAVIDSON:  'https://logo.clearbit.com/harley-davidson.com',
  HARLEY:          'https://logo.clearbit.com/harley-davidson.com',
  DUCATI:          'https://logo.clearbit.com/ducati.com',
  DAFRA:           'https://logo.clearbit.com/dafra.com.br',
  SHINERAY:        'https://logo.clearbit.com/shineray.com.br',
}

function extrairMarca(marcaModelo: string): string {
  const limpo = marcaModelo.replace(/^I\//, '').trim()
  return limpo.split(/[\s\/]/)[0].toUpperCase()
}

function logoUrl(marcaModelo: string): string | null {
  const marca = extrairMarca(marcaModelo)
  // Busca exata
  if (BRAND_LOGO[marca]) return BRAND_LOGO[marca]
  // Busca parcial
  for (const [key, url] of Object.entries(BRAND_LOGO)) {
    if (marca.includes(key) || key.includes(marca)) return url
  }
  return null
}

interface Dados {
  placa: string
  marca: string
  modelo: string
  anoFabricacao: string
  anoModelo: string
  cor: string
  municipio: string
  uf: string
  combustivel: string
  fipeValor: string
  fipeMes: string
  fipeCodigo: string
  fonte: string
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  if (!value) return null
  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-gray-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 font-medium">{label}</p>
        <p className="text-sm font-semibold text-gray-800 truncate">{value}</p>
      </div>
    </div>
  )
}

const SECOES_BLOQUEADAS = [
  { label: 'Restricoes e Bloqueios',   icon: Shield,        desc: 'DETRAN, RENAJUD e BIN Federal' },
  { label: 'Gravame / Financiamento',  icon: Tag,           desc: 'Banco financiador e parcelas' },
  { label: 'Historico de Leilao',      icon: Gavel,         desc: 'Sinistros e leiloes registrados' },
  { label: 'Roubo e Furto',            icon: AlertCircle,   desc: 'SINARM e INFOSEG nacionais' },
  { label: 'Historico FIPE',           icon: TrendingUp,    desc: 'Variacao de preco nos ultimos meses' },
  { label: 'Processos Judiciais',      icon: ClipboardList, desc: 'DataJud — tribunais federais e estaduais' },
]

export default function FipeResultadoPage() {
  const { placa } = useParams<{ placa: string }>()
  const router = useRouter()
  const [dados, setDados] = useState<Dados | null>(null)
  const [erro, setErro]   = useState('')
  const [loading, setLoading] = useState(true)
  const [logoOk, setLogoOk] = useState(true)

  useEffect(() => {
    fetch(`/api/preview/placa/${placa}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setErro(d.error)
        else setDados(d)
      })
      .catch(() => setErro('Erro de conexao. Verifique sua internet e tente novamente.'))
      .finally(() => setLoading(false))
  }, [placa])

  const placaStr = (placa ?? '').toUpperCase()
  const logo = dados ? logoUrl(dados.marca) : null
  const marcaNome = dados ? extrairMarca(dados.marca) : ''

  // Nome limpo da montadora para exibicao
  const nomeVeiculo = dados
    ? dados.marca.replace(/^I\//, '').trim()
    : ''

  return (
    <div className="min-h-screen" style={{ background: '#f4f6f9' }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <span className="text-sm font-bold text-gray-800 tracking-wide">FICHA AUTO</span>
        <div className="w-9" />
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* Loading */}
        {loading && (
          <div className="bg-white rounded-2xl p-12 flex flex-col items-center gap-4 shadow-sm">
            <div className="w-16 h-16 rounded-full border-4 border-gray-100 border-t-green-600 animate-spin" />
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-700">Consultando placa</p>
              <p className="text-xs text-gray-400 mt-1 font-mono tracking-widest">{placaStr}</p>
            </div>
          </div>
        )}

        {/* Erro */}
        {erro && !loading && (
          <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4 shadow-sm text-center">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <div>
              <p className="font-bold text-gray-800 text-lg">Placa nao encontrada</p>
              <p className="text-sm text-gray-400 mt-1 max-w-xs">
                A placa <span className="font-mono font-bold text-gray-600">{placaStr}</span> nao
                consta nos nossos registros. Verifique se digitou corretamente.
              </p>
            </div>
            <Link
              href="/fipe"
              className="mt-1 bg-green-600 text-white font-semibold px-6 py-2.5 rounded-xl text-sm hover:bg-green-700 transition-colors"
            >
              Tentar outra placa
            </Link>
          </div>
        )}

        {dados && !loading && (
          <>
            {/* Card principal */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {/* Header do card */}
              <div
                className="px-5 pt-5 pb-5"
                style={{ background: 'linear-gradient(135deg, #14532d 0%, #166534 100%)' }}
              >
                <div className="flex items-center gap-4">
                  {/* Logo da montadora */}
                  <div className="w-20 h-20 rounded-2xl bg-white flex items-center justify-center shrink-0 p-2.5 shadow-sm">
                    {logo && logoOk ? (
                      <img
                        src={logo}
                        alt={marcaNome}
                        className="w-full h-full object-contain"
                        onError={() => setLogoOk(false)}
                      />
                    ) : (
                      <Car className="w-10 h-10 text-gray-300" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-green-300 text-xs font-semibold uppercase tracking-widest mb-0.5">
                      {dados.fonte === 'cache' ? 'Cache' : 'Consulta gratuita'}
                    </p>
                    <h1 className="text-white text-lg font-bold leading-tight line-clamp-2">
                      {nomeVeiculo}
                    </h1>
                    <p className="text-green-200 text-sm mt-0.5 font-mono tracking-wider">
                      {placaStr}
                      {dados.anoFabricacao ? ` · ${dados.anoFabricacao}` : ''}
                      {dados.anoModelo && dados.anoModelo !== dados.anoFabricacao
                        ? `/${dados.anoModelo}`
                        : ''}
                    </p>
                  </div>
                </div>
              </div>

              {/* Valor FIPE */}
              {dados.fipeValor ? (
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Valor FIPE</p>
                    <p className="text-2xl font-bold text-gray-900 mt-0.5">{dados.fipeValor}</p>
                    {dados.fipeMes && (
                      <p className="text-xs text-gray-400 mt-0.5">Ref.: {dados.fipeMes}</p>
                    )}
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              ) : (
                <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-gray-300" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Valor FIPE</p>
                    <p className="text-sm text-gray-300">Disponivel na consulta completa</p>
                  </div>
                </div>
              )}

              {/* Dados basicos */}
              <div className="px-5">
                <InfoRow icon={Palette}  label="Cor"          value={dados.cor} />
                <InfoRow icon={Fuel}     label="Combustivel"  value={dados.combustivel} />
                <InfoRow icon={MapPin}   label="Municipio"
                  value={dados.municipio ? `${dados.municipio} / ${dados.uf}` : ''} />
              </div>
            </div>

            {/* Secoes bloqueadas */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                  Disponivel na consulta completa
                </p>
              </div>
              {SECOES_BLOQUEADAS.map(({ label, icon: Icon, desc }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-50 last:border-0"
                >
                  <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-gray-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-400">{label}</p>
                    <p className="text-xs text-gray-300 truncate">{desc}</p>
                  </div>
                  <Lock className="w-4 h-4 text-gray-300 shrink-0" />
                </div>
              ))}
            </div>

            <p className="text-center text-xs text-gray-400 px-4">
              Dados basicos via tabela FIPE oficial. Para restricoes, gravame e historico, adquira o relatorio completo.
            </p>
          </>
        )}

        {/* CTA */}
        {!loading && (
          <Link
            href={dados ? `/consulta/${dados.placa}/pagar` : '/fipe'}
            className="block w-full text-white text-center font-bold py-4 rounded-2xl shadow-lg transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)' }}
          >
            <span className="block text-base">Relatorio Completo</span>
            <span className="block text-sm font-medium opacity-80 mt-0.5">
              Sem cadastro — R$&nbsp;34,00
            </span>
          </Link>
        )}
      </div>
    </div>
  )
}
