'use client'
import { MODULOS, ASSINATURA_B2B, type ModuloId } from '@/lib/products'
import { Shield, Infinity as InfinityIcon, CheckCircle2 } from 'lucide-react'

const FONTE_BADGE: Record<string, { label: string; cor: string }> = {
  assertiva:  { label: 'Assertiva',  cor: 'bg-green-100 text-green-700'  },
  futuredata: { label: 'FutureData', cor: 'bg-purple-100 text-purple-700' },
  datajud:    { label: 'DataJud',    cor: 'bg-blue-100 text-blue-700'    },
  brasilapi:  { label: 'BrasilAPI',  cor: 'bg-orange-100 text-orange-700' },
}

const GRUPOS_MODULOS: { titulo: string; modulos: ModuloId[] }[] = [
  {
    titulo: 'Placa / Veicular',
    modulos: [
      'placa_identificacao', 'placa_bin_federal', 'placa_bin_estadual',
      'placa_sinistro', 'placa_gravame', 'placa_leilao', 'placa_fipe',
      'placa_processos_cnj', 'placa_recall', 'placa_historico_proprietarios',
      'placa_sinistro_plus', 'placa_frota_locadora', 'placa_frota_policial',
      'placa_frota_taxi', 'placa_veiculo_crime', 'placa_transferencia_seguradora',
      'placa_chassi_decoder', 'placa_crlve', 'placa_atpve', 'placa_comunicado_venda',
    ],
  },
  {
    titulo: 'CPF / Pessoa Física',
    modulos: [
      'cpf_basico', 'cpf_contatos', 'cpf_enderecos', 'cpf_score',
      'cpf_processos', 'cpf_protestos', 'cpf_renda', 'cpf_pep',
      'cpf_societario', 'cpf_relacionamentos', 'cpf_veiculos',
      'cpf_kyc', 'cpf_antecedentes', 'cpf_mandados', 'cpf_cnh',
    ],
  },
  {
    titulo: 'CNPJ / Pessoa Jurídica',
    modulos: [
      'cnpj_basico', 'cnpj_qsa', 'cnpj_score', 'cnpj_processos',
      'cnpj_protestos', 'cnpj_relacionadas',
      'cnpj_kyc', 'cnpj_divida_ativa', 'cnpj_grupo_empresarial', 'cnpj_sintegra',
    ],
  },
  {
    titulo: 'Geral',
    modulos: ['lote'],
  },
]

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function PlanosAdminPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900">Assinatura B2B</h1>
        <p className="text-sm text-gray-500 mt-1">Modelo comercial — um preco, todos os modulos.</p>
      </div>

      {/* Card da assinatura */}
      <div className="bg-white rounded-2xl border-2 border-brand-green p-8 mb-10 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm font-semibold text-brand-green uppercase tracking-wide">Plano Unico</p>
            <h2 className="text-2xl font-black text-gray-900 mt-1">Acesso Completo</h2>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center">
            <Shield className="w-6 h-6 text-brand-green" />
          </div>
        </div>

        <div className="space-y-3 mb-8">
          <div className="flex items-center gap-3">
            <InfinityIcon className="w-4 h-4 text-brand-green flex-shrink-0" />
            <span className="text-sm text-gray-700">Consultas ilimitadas em todos os modulos disponiveis</span>
          </div>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-4 h-4 text-brand-green flex-shrink-0" />
            <span className="text-sm text-gray-700">Validade de 30 dias apos o pagamento</span>
          </div>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-4 h-4 text-brand-green flex-shrink-0" />
            <span className="text-sm text-gray-700">Ativacao imediata via Pix</span>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-6">
          <p className="text-xs text-gray-400 mb-1">Valor mensal por empresa</p>
          <p className="text-4xl font-black text-gray-900">{fmt(ASSINATURA_B2B.preco)}</p>
        </div>
      </div>

      {/* Catalogo de modulos */}
      <h2 className="text-lg font-black text-gray-900 mb-4">Catalogo de Modulos</h2>

      <div className="space-y-6">
        {GRUPOS_MODULOS.map(grupo => (
          <div key={grupo.titulo}>
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">{grupo.titulo}</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {grupo.modulos.map(id => {
                const m = MODULOS[id]
                const badge = FONTE_BADGE[m.fonte]
                return (
                  <div
                    key={id}
                    className={`p-4 rounded-xl border ${m.disponivel ? 'bg-white border-gray-200' : 'bg-gray-50 border-dashed border-gray-200'}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className={`text-sm font-semibold ${m.disponivel ? 'text-gray-900' : 'text-gray-400'}`}>{m.nome}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${badge.cor}`}>{badge.label}</span>
                    </div>
                    <p className="text-xs text-gray-500">{m.descricao}</p>
                    {!m.disponivel && (
                      <p className="text-[10px] text-purple-500 font-semibold mt-2">Em breve</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
