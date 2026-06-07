'use client'

import { MODULOS, type ModuloId } from '@/lib/products'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

interface Props {
  selecionados: ModuloId[]
  onChange: (modulos: ModuloId[]) => void
  readOnly?: boolean
}

const GRUPOS = [
  { id: 'placa', label: 'Veículos',               cor: 'text-brand-blue',  corBg: 'bg-brand-blue-light',  corBorda: 'border-brand-blue/20'  },
  { id: 'cpf',   label: 'CPF — Pessoa Física',    cor: 'text-brand-green', corBg: 'bg-brand-green-light', corBorda: 'border-brand-green/20' },
  { id: 'cnpj',  label: 'CNPJ — Pessoa Jurídica', cor: 'text-purple-600',  corBg: 'bg-purple-50',         corBorda: 'border-purple-200'     },
]

export default function ModulosSelector({ selecionados, onChange, readOnly = false }: Props) {
  const [abertos, setAbertos] = useState<Record<string, boolean>>({
    'Veículos': true,
    'CPF — Pessoa Física': true,
    'CNPJ — Pessoa Jurídica': true,
  })

  const toggle = (id: ModuloId) => {
    if (readOnly) return
    onChange(
      selecionados.includes(id)
        ? selecionados.filter(m => m !== id)
        : [...selecionados, id]
    )
  }

  const toggleGrupo = (grupo: string, modulos: ModuloId[]) => {
    if (readOnly) return
    const todosNoGrupo = modulos.every(m => selecionados.includes(m))
    if (todosNoGrupo) {
      onChange(selecionados.filter(m => !modulos.includes(m)))
    } else {
      const novos = [...selecionados]
      modulos.forEach(m => { if (!novos.includes(m)) novos.push(m) })
      onChange(novos)
    }
  }

  const toggleAberto = (grupo: string) =>
    setAbertos(a => ({ ...a, [grupo]: !a[grupo] }))

  return (
    <div className="space-y-3">
      {/* Contador geral */}
      <div className="flex items-center justify-between px-1">
        <p className="text-sm font-semibold text-brand-dark">
          {selecionados.length} módulo{selecionados.length !== 1 ? 's' : ''} selecionado{selecionados.length !== 1 ? 's' : ''}
        </p>
        {!readOnly && (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => onChange(Object.keys(MODULOS) as ModuloId[])}
              className="text-xs text-brand-blue hover:underline font-medium"
            >
              Selecionar tudo
            </button>
            <span className="text-brand-border">|</span>
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-xs text-brand-gray hover:text-brand-dark hover:underline"
            >
              Limpar
            </button>
          </div>
        )}
      </div>

      {GRUPOS.map(grupo => {
        const modulosDoGrupo = Object.values(MODULOS)
          .filter(m => m.id.startsWith(grupo.id + '_'))
          .map(m => m.id as ModuloId)
        const qtdSelecionada = modulosDoGrupo.filter(m => selecionados.includes(m)).length
        const todosSelecionados = qtdSelecionada === modulosDoGrupo.length
        const aberto = abertos[grupo.id] ?? true

        return (
          <div key={grupo.id} className={`border rounded-2xl overflow-hidden ${grupo.corBorda}`}>
            {/* Header do grupo */}
            <button
              type="button"
              onClick={() => toggleAberto(grupo.id)}
              className={`w-full flex items-center justify-between px-4 py-3 ${grupo.corBg} hover:brightness-95 transition-all`}
            >
              <div className="flex items-center gap-3">
                {!readOnly && (
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); toggleGrupo(grupo.id, modulosDoGrupo) }}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                      todosSelecionados
                        ? 'bg-brand-blue border-brand-blue'
                        : qtdSelecionada > 0
                          ? 'bg-brand-blue/30 border-brand-blue'
                          : 'bg-white border-gray-300'
                    }`}
                  >
                    {todosSelecionados && <Check className="w-3 h-3 text-white" />}
                    {!todosSelecionados && qtdSelecionada > 0 && (
                      <span className="w-2 h-0.5 bg-brand-blue rounded-full" />
                    )}
                  </button>
                )}
                <span className={`font-bold text-sm ${grupo.cor}`}>{grupo.label}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${grupo.corBg} ${grupo.cor} border ${grupo.corBorda}`}>
                  {qtdSelecionada}/{modulosDoGrupo.length}
                </span>
              </div>
              {aberto ? <ChevronUp className="w-4 h-4 text-brand-gray" /> : <ChevronDown className="w-4 h-4 text-brand-gray" />}
            </button>

            {/* Lista de módulos */}
            {aberto && (
              <div className="divide-y divide-gray-100">
                {Object.values(MODULOS)
                  .filter(m => m.id.startsWith(grupo.id + '_'))
                  .map(modulo => {
                    const ativo = selecionados.includes(modulo.id as ModuloId)
                    const indisponivel = !modulo.disponivel
                    return (
                      <button
                        key={modulo.id}
                        type="button"
                        disabled={readOnly || indisponivel}
                        onClick={() => toggle(modulo.id as ModuloId)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                          readOnly || indisponivel ? 'cursor-default' : 'hover:bg-gray-50 cursor-pointer'
                        } ${ativo ? 'bg-gray-50/60' : ''}`}
                      >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                          ativo ? 'bg-brand-green border-brand-green'
                          : indisponivel ? 'bg-gray-100 border-gray-200'
                          : 'bg-white border-gray-300'
                        }`}>
                          {ativo && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold leading-snug ${indisponivel ? 'text-gray-400' : 'text-brand-dark'}`}>
                            {modulo.nome}
                          </p>
                          <p className={`text-xs leading-snug mt-0.5 ${indisponivel ? 'text-gray-300' : 'text-brand-gray'}`}>
                            {modulo.descricao}
                          </p>
                        </div>
                        {indisponivel && (
                          <span className="text-[10px] font-bold text-gray-400 border border-gray-200 rounded-full px-2 py-0.5 shrink-0">
                            Em breve
                          </span>
                        )}
                      </button>
                    )
                  })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
