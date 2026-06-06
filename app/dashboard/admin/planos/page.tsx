'use client'
import { PLANOS, MODULOS, todosOsPlanos, type PlanoId, type ModuloId } from '@/lib/products'
import { Check, Lock, Zap, ExternalLink } from 'lucide-react'

const FONTE_BADGE: Record<string, { label: string; cor: string }> = {
  assertiva:  { label: 'Assertiva',  cor: 'bg-green-100 text-green-700'  },
  futuredata: { label: 'FutureData', cor: 'bg-purple-100 text-purple-700' },
  datajud:    { label: 'DataJud',    cor: 'bg-blue-100 text-blue-700'    },
  brasilapi:  { label: 'BrasilAPI',  cor: 'bg-orange-100 text-orange-700' },
}

const GRUPOS_MODULOS: { titulo: string; modulos: ModuloId[] }[] = [
  {
    titulo: 'Placa / Veicular — Assertiva + DataJud',
    modulos: [
      'placa_identificacao', 'placa_bin_federal', 'placa_bin_estadual',
      'placa_sinistro', 'placa_gravame', 'placa_leilao', 'placa_fipe',
      'placa_processos_cnj',
    ],
  },
  {
    titulo: 'Placa / Veicular — FutureData (a contratar)',
    modulos: [
      'placa_recall', 'placa_historico_proprietarios', 'placa_sinistro_plus',
      'placa_frota_locadora', 'placa_frota_policial', 'placa_frota_taxi',
      'placa_veiculo_crime', 'placa_transferencia_seguradora',
      'placa_chassi_decoder', 'placa_crlve', 'placa_atpve', 'placa_comunicado_venda',
    ],
  },
  {
    titulo: 'CPF / Pessoa Física — Assertiva',
    modulos: [
      'cpf_basico', 'cpf_contatos', 'cpf_enderecos', 'cpf_score',
      'cpf_processos', 'cpf_protestos', 'cpf_renda', 'cpf_pep',
      'cpf_societario', 'cpf_relacionamentos', 'cpf_veiculos',
    ],
  },
  {
    titulo: 'CPF / Pessoa Física — FutureData (a contratar)',
    modulos: ['cpf_kyc', 'cpf_antecedentes', 'cpf_mandados', 'cpf_cnh'],
  },
  {
    titulo: 'CNPJ / Pessoa Jurídica — Assertiva',
    modulos: [
      'cnpj_basico', 'cnpj_qsa', 'cnpj_score', 'cnpj_processos',
      'cnpj_protestos', 'cnpj_relacionadas',
    ],
  },
  {
    titulo: 'CNPJ / Pessoa Jurídica — FutureData (a contratar)',
    modulos: ['cnpj_kyc', 'cnpj_divida_ativa', 'cnpj_grupo_empresarial', 'cnpj_sintegra'],
  },
  {
    titulo: 'Geral',
    modulos: ['lote'],
  },
]

const ORDEM_PLANOS: PlanoId[] = ['essencial', 'profissional', 'despachante', 'seguradora']

export default function PlanosPage() {
  const planos = ORDEM_PLANOS.map(id => PLANOS[id])

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-dark">Catálogo de Planos e Produtos</h1>
        <p className="text-brand-gray text-sm mt-1">
          Todos os módulos disponíveis por plano. Módulos FutureData ativam automaticamente quando a chave API for configurada.
        </p>
      </div>

      {/* Cards dos planos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {planos.map(p => (
          <div key={p.id} className={`rounded-2xl p-5 text-white relative overflow-hidden ${p.destaque ? 'ring-4 ring-offset-2' : ''}`}
               style={{ background: `linear-gradient(135deg, ${p.cor}, ${p.cor}CC)`, ...(p.destaque ? { ringColor: p.cor } : {}) }}>
            {p.destaque && (
              <div className="absolute top-3 right-3 bg-white/20 rounded-full px-2 py-0.5 text-[10px] font-bold">
                POPULAR
              </div>
            )}
            <p className="text-xs font-bold opacity-70 uppercase tracking-wider mb-1">{p.id}</p>
            <h2 className="text-xl font-black mb-1">{p.nome}</h2>
            <p className="text-3xl font-black mb-1">R$ {p.preco}<span className="text-sm font-normal opacity-70">/mês</span></p>
            <p className="text-xs opacity-70 mb-3">{p.creditos} consultas incluídas</p>
            <div className="text-xs opacity-80 space-y-0.5">
              {p.publico.map(pub => (
                <p key={pub} className="flex items-center gap-1">
                  <Check className="w-3 h-3 shrink-0" /> {pub}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Tabela de módulos por plano */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-brand-gray-light border-b border-brand-border">
                <th className="text-left px-4 py-3 text-xs font-semibold text-brand-gray uppercase tracking-wider w-64">
                  Módulo
                </th>
                <th className="text-center px-2 py-3 text-xs font-semibold text-brand-gray uppercase tracking-wider">
                  Fonte
                </th>
                {planos.map(p => (
                  <th key={p.id} className="text-center px-4 py-3 text-xs font-bold uppercase tracking-wider"
                      style={{ color: p.cor }}>
                    {p.nome}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {GRUPOS_MODULOS.map(grupo => (
                <>
                  {/* Linha de grupo */}
                  <tr key={grupo.titulo} className="bg-gray-50 border-y border-brand-border">
                    <td colSpan={2 + planos.length} className="px-4 py-2">
                      <p className="text-xs font-bold text-brand-dark uppercase tracking-wide">{grupo.titulo}</p>
                    </td>
                  </tr>
                  {/* Módulos do grupo */}
                  {grupo.modulos.map(modId => {
                    const mod = MODULOS[modId]
                    const fonteCfg = FONTE_BADGE[mod.fonte]
                    return (
                      <tr key={modId} className="border-b border-brand-border hover:bg-brand-gray-light/30 transition-colors">
                        <td className="px-4 py-2.5">
                          <div className="flex items-start gap-2">
                            {!mod.disponivel && <Lock className="w-3 h-3 text-purple-400 shrink-0 mt-0.5" />}
                            <div>
                              <p className="text-xs font-semibold text-brand-dark leading-tight">{mod.nome}</p>
                              <p className="text-[10px] text-brand-gray leading-tight mt-0.5">{mod.descricao}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-2.5 text-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${fonteCfg.cor}`}>
                            {fonteCfg.label}
                          </span>
                        </td>
                        {planos.map(p => {
                          const incluso = p.modulos.includes(modId)
                          return (
                            <td key={p.id} className="px-4 py-2.5 text-center">
                              {incluso
                                ? <Check className="w-4 h-4 mx-auto" style={{ color: p.cor }} />
                                : <span className="text-brand-border">—</span>
                              }
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Nota FutureData */}
      <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-xl flex items-start gap-3">
        <Lock className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-purple-800">Módulos FutureData aguardando contrato</p>
          <p className="text-xs text-purple-700 mt-1">
            Recall, histórico de proprietários, frota, crime, KYC, CNH e demais módulos marcados com cadeado
            estão completamente estruturados no código. Assim que o contrato com a FutureData for firmado
            e a chave API configurada no servidor, todos ativam automaticamente sem nenhuma alteração de código.
          </p>
          <div className="flex gap-3 mt-2">
            <a href="https://futuredata.com.br/contato" target="_blank"
               className="text-xs text-purple-700 font-semibold hover:underline flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> futuredata.com.br/contato
            </a>
            <span className="text-xs text-purple-600">WhatsApp: (81) 98894-9075</span>
          </div>
        </div>
      </div>

      {/* Status do ambiente */}
      <div className="mt-4 p-4 bg-brand-gray-light rounded-xl">
        <p className="text-xs font-bold text-brand-dark mb-2 flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-brand-green" /> Status das integrações
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {[
            { nome: 'Assertiva',  ativo: true,  detalhe: 'OAuth2 ativo' },
            { nome: 'DataJud',    ativo: true,  detalhe: 'Chave pública ativa' },
            { nome: 'BrasilAPI',  ativo: true,  detalhe: 'Gratuito — sem autenticação' },
            { nome: 'FutureData', ativo: false, detalhe: 'Aguardando contrato' },
          ].map(s => (
            <div key={s.nome} className={`rounded-lg p-2.5 border ${s.ativo ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <div className={`w-2 h-2 rounded-full ${s.ativo ? 'bg-green-500' : 'bg-gray-300'}`} />
                <p className="text-xs font-bold text-brand-dark">{s.nome}</p>
              </div>
              <p className="text-[10px] text-brand-gray">{s.detalhe}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
