'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Car, ChevronRight } from 'lucide-react'
import Image from 'next/image'

function formatPlaca(v: string) {
  return v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7)
}

export default function FipeBuscaPage() {
  const router = useRouter()
  const [placa, setPlaca] = useState('')

  function buscar(e: React.FormEvent) {
    e.preventDefault()
    const p = placa.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
    if (p.length < 7) return
    router.push(`/fipe/${p}`)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header azul */}
      <div className="bg-blue-600 px-6 pt-14 pb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Car className="w-6 h-6 text-white" />
            <span className="text-white font-bold text-lg">Ficha Auto</span>
          </div>
        </div>
        <h1 className="text-white text-2xl font-bold mb-1">Consulta FIPE grátis</h1>
        <p className="text-blue-100 text-sm">Digite a placa e veja o valor de mercado</p>
      </div>

      <div className="px-4 -mt-4">
        {/* Card de busca */}
        <div className="bg-white rounded-2xl shadow-md p-5">
          <form onSubmit={buscar} className="space-y-3">
            <div className="relative">
              <input
                type="text"
                value={placa}
                onChange={e => setPlaca(formatPlaca(e.target.value))}
                placeholder="Placa do veículo"
                maxLength={7}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-12 text-base font-mono tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
            <button
              type="submit"
              disabled={placa.length < 7}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              Consultar grátis
              <ChevronRight className="w-5 h-5" />
            </button>
          </form>
        </div>

        {/* Info */}
        <div className="mt-6 space-y-3">
          {[
            { titulo: 'Valor FIPE atualizado', desc: 'Preço de referência do mês vigente' },
            { titulo: 'Marca, modelo e ano', desc: 'Identificação completa do veículo' },
            { titulo: 'Cidade e combustível', desc: 'Dados cadastrais básicos' },
          ].map(({ titulo, desc }) => (
            <div key={titulo} className="bg-white rounded-xl p-4 flex items-center gap-3 shadow-sm">
              <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-800">{titulo}</p>
                <p className="text-xs text-gray-400">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 bg-blue-50 rounded-xl p-4 text-center">
          <p className="text-xs text-blue-600 font-medium">Quer o relatório completo?</p>
          <p className="text-xs text-blue-400 mt-1">Gravame, leilão, roubo, RENAJUD e muito mais</p>
          <a href="/dashboard/consultar" className="mt-3 inline-block text-sm font-semibold text-blue-700 underline">
            Consulta completa por R$ 36,90
          </a>
        </div>
      </div>
    </div>
  )
}
