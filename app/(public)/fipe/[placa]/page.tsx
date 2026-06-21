'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ChevronRight, Car, Fuel, MapPin, Palette, FileText, Tag, Loader2, AlertCircle } from 'lucide-react'

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
  VOLVO: 'https://logo.clearbit.com/volvocars.com',
  SUBARU: 'https://logo.clearbit.com/subaru.com',
  CHERY: 'https://logo.clearbit.com/chery.com',
  JAC: 'https://logo.clearbit.com/jacmotors.com',
  BYD: 'https://logo.clearbit.com/byd.com',
  GWM: 'https://logo.clearbit.com/gwm.com',
  HAVAL: 'https://logo.clearbit.com/haval.com',
  DODGE: 'https://logo.clearbit.com/dodge.com',
  RAM: 'https://logo.clearbit.com/ramtrucks.com',
  PORSCHE: 'https://logo.clearbit.com/porsche.com',
  LAND: 'https://logo.clearbit.com/landrover.com',
}

function extrairMarca(marcaModelo: string): string {
  const limpo = marcaModelo.replace(/^I\//, '').trim()
  const primeira = limpo.split(/[\s\/]/)[0].toUpperCase()
  return primeira
}

function logoUrl(marcaModelo: string): string | null {
  const marca = extrairMarca(marcaModelo)
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
  fonte: string
}

function Row({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  if (!value) return null
  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
      <Icon className="w-5 h-5 text-gray-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-800 truncate">{value}</p>
      </div>
    </div>
  )
}

export default function FipeResultadoPage() {
  const { placa } = useParams<{ placa: string }>()
  const router = useRouter()
  const [dados, setDados] = useState<Dados | null>(null)
  const [erro, setErro]   = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/preview/placa/${placa}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setErro(d.error)
        else setDados(d)
      })
      .catch(() => setErro('Erro ao consultar. Tente novamente.'))
      .finally(() => setLoading(false))
  }, [placa])

  const placaFormatada = (placa ?? '').toUpperCase()
  const logo = dados ? logoUrl(dados.marca) : null
  const marcaNome = dados ? extrairMarca(dados.marca) : ''

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <span className="text-sm font-semibold text-gray-700">Consulta FIPE</span>
        <div className="w-9" />
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {loading && (
          <div className="bg-white rounded-2xl p-10 flex flex-col items-center gap-3 shadow-sm">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-sm text-gray-500">Consultando placa {placaFormatada}...</p>
          </div>
        )}

        {erro && !loading && (
          <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-3 shadow-sm text-center">
            <AlertCircle className="w-10 h-10 text-red-400" />
            <p className="font-semibold text-gray-700">Placa não encontrada</p>
            <p className="text-sm text-gray-500">{erro}</p>
            <Link href="/fipe" className="mt-2 text-blue-600 text-sm font-medium">Tentar outra placa</Link>
          </div>
        )}

        {dados && !loading && (
          <>
            {/* Card principal */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl font-bold text-gray-900 tracking-widest">{dados.placa}</h1>
                  <p className="text-sm text-gray-500 mt-1 truncate">
                    {dados.marca} {dados.modelo}
                  </p>
                  <p className="text-sm text-gray-400">
                    {dados.anoFabricacao}/{dados.anoModelo}
                  </p>
                </div>
                {logo ? (
                  <img
                    src={logo}
                    alt={marcaNome}
                    className="w-14 h-14 object-contain rounded-full border border-gray-100"
                    onError={e => (e.currentTarget.style.display = 'none')}
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                    <Car className="w-7 h-7 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Valor FIPE em destaque */}
              {dados.fipeValor && (
                <div className="mt-4 bg-blue-50 rounded-xl p-4">
                  <p className="text-xs text-blue-500 font-medium uppercase tracking-wide">Valor FIPE</p>
                  <p className="text-2xl font-bold text-blue-700 mt-1">{dados.fipeValor}</p>
                  {dados.fipeMes && <p className="text-xs text-blue-400 mt-1">Referência: {dados.fipeMes}</p>}
                </div>
              )}
            </div>

            {/* Dados basicos */}
            <div className="bg-white rounded-2xl px-5 shadow-sm">
              <Row icon={Palette}  label="Cor"        value={dados.cor} />
              <Row icon={Fuel}     label="Combustível" value={dados.combustivel} />
              <Row icon={MapPin}   label="Município"   value={dados.municipio ? `${dados.municipio} / ${dados.uf}` : ''} />
            </div>

            {/* Secoes bloqueadas */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {[
                { label: 'Restrições e Bloqueios', icon: FileText },
                { label: 'Gravame / Financiamento', icon: Tag },
                { label: 'Histórico de Leilão', icon: FileText },
                { label: 'Roubo e Furto', icon: FileText },
                { label: 'Multas e Débitos', icon: FileText },
                { label: 'Processos Judiciais', icon: FileText },
              ].map(({ label, icon: Icon }) => (
                <div key={label} className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 last:border-0 opacity-50">
                  <Icon className="w-5 h-5 text-gray-400 shrink-0" />
                  <span className="flex-1 text-sm text-gray-600">{label}</span>
                  <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">bloqueado</span>
                </div>
              ))}
            </div>

            <p className="text-center text-xs text-gray-400">
              Dados básicos gratuitos. Relatório completo disponível para assinantes.
            </p>
          </>
        )}

        {/* CTA consulta completa */}
        {!loading && (
          <Link
            href={dados ? `/dashboard/relatorio/${dados.placa}` : '/dashboard/consultar'}
            className="block w-full bg-blue-600 hover:bg-blue-700 text-white text-center font-semibold py-4 rounded-2xl shadow-md transition-colors"
          >
            Ver Consulta Completa
            <ChevronRight className="inline w-5 h-5 ml-1" />
          </Link>
        )}
      </div>
    </div>
  )
}
