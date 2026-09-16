'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ChevronRight, Shield, TrendingUp, FileText } from 'lucide-react'

function formatPlaca(v: string) {
  return v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7)
}

// Input visual de placa — o campo de digitacao tem cara de placa brasileira
function PlacaInput({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const isMercosul = value.length >= 5 && /[A-Z]/.test(value[4])
  const display = value.length === 7
    ? isMercosul
      ? `${value.slice(0, 3)} ${value.slice(3)}`
      : `${value.slice(0, 3)}-${value.slice(3)}`
    : value

  return (
    <div
      className="relative mx-auto select-none"
      style={{ width: 280, height: 72 }}
    >
      {/* Corpo da placa */}
      <div
        className="absolute inset-0 rounded-lg overflow-hidden"
        style={{
          background: '#fff',
          border: '3px solid #1a1a2e',
          boxShadow: '0 4px 20px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.8)',
        }}
      >
        {/* Faixa azul */}
        <div
          className="flex items-center justify-between px-3"
          style={{
            background: 'linear-gradient(135deg, #003087 0%, #0044cc 100%)',
            height: 22,
          }}
        >
          <div className="flex items-center gap-1">
            <div className="rounded-sm overflow-hidden" style={{ width: 18, height: 12 }}>
              <svg viewBox="0 0 18 12" width="18" height="12">
                <rect width="18" height="12" fill="#009c3b" />
                <polygon points="9,1 17,6 9,11 1,6" fill="#fedf00" />
                <circle cx="9" cy="6" r="3.2" fill="#002776" />
                <path d="M6.5,5.5 Q9,4 11.5,5.5" stroke="#fff" strokeWidth="0.7" fill="none" />
              </svg>
            </div>
            <span className="text-white font-bold" style={{ fontSize: 8, letterSpacing: 1 }}>BRASIL</span>
          </div>
          <span className="text-white font-bold" style={{ fontSize: 9, letterSpacing: 2 }}>BR</span>
          <span className="text-white opacity-70" style={{ fontSize: 7 }}>MERCOSUL</span>
        </div>

        {/* Campo de digitacao invisivel por cima */}
        <input
          type="text"
          value={display}
          onChange={e => onChange(formatPlaca(e.target.value))}
          maxLength={8}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="AAA0000"
          className="absolute inset-0 w-full h-full opacity-0 cursor-text"
          style={{ zIndex: 10, top: 22 }}
          aria-label="Digite a placa do veículo"
        />

        {/* Exibicao dos caracteres */}
        <div
          className="flex items-center justify-center"
          style={{ height: 46 }}
        >
          {value ? (
            <span
              style={{
                fontFamily: '"Arial Black", "Impact", sans-serif',
                fontSize: 34,
                fontWeight: 900,
                letterSpacing: 5,
                color: '#111',
                lineHeight: 1,
              }}
            >
              {display}
            </span>
          ) : (
            <span
              style={{
                fontFamily: '"Arial Black", "Impact", sans-serif',
                fontSize: 28,
                fontWeight: 900,
                letterSpacing: 8,
                color: '#bbb',
                lineHeight: 1,
              }}
            >
              AAA0000
            </span>
          )}
        </div>
      </div>

      {/* Parafusos */}
      {[{ left: 8 }, { left: 265 }].map((pos, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            left: pos.left,
            top: '50%',
            width: 7,
            height: 7,
            background: 'radial-gradient(circle at 35% 35%, #d0d0d0, #888)',
            border: '1px solid #555',
            transform: 'translateY(-50%)',
            zIndex: 10,
          }}
        />
      ))}
    </div>
  )
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

  const placaValida = placa.replace(/[^a-zA-Z0-9]/g, '').length === 7

  return (
    <div className="min-h-screen" style={{ background: '#f4f6f9' }}>
      {/* Header */}
      <div
        className="px-6 pt-14 pb-10"
        style={{ background: 'linear-gradient(135deg, #14532d 0%, #166534 100%)' }}
      >
        <p className="text-green-300 text-xs font-bold uppercase tracking-widest mb-2">
          Ficha Auto
        </p>
        <h1 className="text-white text-2xl font-bold mb-1">Consulta gratuita</h1>
        <p className="text-green-200 text-sm">
          Digite a placa e veja marca, modelo, ano e valor FIPE
        </p>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-1">
        <form onSubmit={buscar} className="space-y-4">
          {/* Placa visual como campo de digitacao */}
          <div className="bg-white rounded-2xl shadow-md p-6 flex flex-col items-center gap-5">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-widest">
              Digite a placa do veículo
            </p>
            <PlacaInput value={placa} onChange={setPlaca} />
            <button
              type="submit"
              disabled={!placaValida}
              className="w-full font-bold py-3.5 rounded-xl text-white transition-all active:scale-95 disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)' }}
            >
              <span className="flex items-center justify-center gap-2">
                <Search className="w-5 h-5" />
                Consultar grátis
              </span>
            </button>
          </div>
        </form>

        {/* O que a consulta traz */}
        <div className="mt-5 space-y-2.5">
          {[
            { icon: TrendingUp,  titulo: 'Valor FIPE atualizado',    desc: 'Preço de referência do mês vigente' },
            { icon: FileText,    titulo: 'Marca, modelo e ano',       desc: 'Identificação completa do veículo' },
            { icon: Shield,      titulo: 'Dados cadastrais básicos',  desc: 'Cor, combustível e município' },
          ].map(({ icon: Icon, titulo, desc }) => (
            <div key={titulo} className="bg-white rounded-xl p-4 flex items-center gap-3 shadow-sm">
              <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">{titulo}</p>
                <p className="text-xs text-gray-400">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 bg-white rounded-xl p-4 text-center shadow-sm mb-8">
          <p className="text-xs font-bold text-gray-700">Quer o relatório completo?</p>
          <p className="text-xs text-gray-400 mt-1">
            Gravame, leilão, roubo, RENAJUD, histórico e muito mais
          </p>
          <p className="mt-2 text-sm font-bold text-green-700">
            Consulta completa por R$&nbsp;34,00 — sem cadastro
          </p>
        </div>
      </div>
    </div>
  )
}
