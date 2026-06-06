'use client'
import { useState } from 'react'
import { PLANOS, MODULOS, type PlanoId, type ModuloId } from '@/lib/products'
import {
  Shield, Building2, Users, Plus, ChevronDown, ChevronUp,
  Check, Car, User, X, Lock
} from 'lucide-react'

// ─── Grupos de módulos para exibição ──────────────────────────
const GRUPOS: { titulo: string; modulos: ModuloId[] }[] = [
  {
    titulo: 'Placa / Veicular',
    modulos: [
      'placa_identificacao', 'placa_bin_federal', 'placa_bin_estadual',
      'placa_sinistro', 'placa_gravame', 'placa_leilao', 'placa_fipe',
      'placa_processos_cnj',
    ],
  },
  {
    titulo: 'CPF / Pessoa Física',
    modulos: [
      'cpf_basico', 'cpf_contatos', 'cpf_enderecos', 'cpf_score',
      'cpf_processos', 'cpf_protestos', 'cpf_renda', 'cpf_pep',
      'cpf_societario', 'cpf_relacionamentos', 'cpf_veiculos',
    ],
  },
  {
    titulo: 'CNPJ / Pessoa Jurídica',
    modulos: [
      'cnpj_basico', 'cnpj_qsa', 'cnpj_score', 'cnpj_processos',
      'cnpj_protestos', 'cnpj_relacionadas',
    ],
  },
]

const COR_PLANO: Record<PlanoId, string> = {
  essencial:    '#00703C',
  profissional: '#2563EB',
  despachante:  '#D97706',
  seguradora:   '#7C3AED',
}

// ─── Tenant mockado — estrutura para futura integração com DB ──
const TENANTS_INICIAL = [
  {
    id: '1', nome: 'Ficha Auto Demo', slug: 'ficha-auto', planoId: 'essencial' as PlanoId,
    ativo: true, modulos: PLANOS.essencial.modulos as ModuloId[],
  },
  {
    id: '2', nome: 'AVP — Auto Vale Prevenções', slug: 'avp', planoId: 'seguradora' as PlanoId,
    ativo: true, modulos: PLANOS.seguradora.modulos as ModuloId[],
  },
]

// ─── Componente: card de plano ─────────────────────────────────
function PlanoCard({ planoId, selecionado, onClick }: {
  planoId: PlanoId; selecionado: boolean; onClick: () => void
}) {
  const plano = PLANOS[planoId]
  const cor   = COR_PLANO[planoId]
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
        selecionado ? '' : 'border-brand-border hover:border-gray-300'
      }`}
      style={selecionado ? { borderColor: cor, backgroundColor: cor + '10' } : {}}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-brand-dark text-sm">{plano.nome}</p>
          <p className="text-xs text-brand-gray mt-0.5">{plano.descricao}</p>
          <p className="text-xs font-bold mt-1.5" style={{ color: cor }}>
            R$ {plano.preco}/mês · {plano.creditos} créditos
          </p>
        </div>
        {selecionado && <Check className="w-4 h-4 shrink-0 mt-0.5" style={{ color: cor }} />}
      </div>
    </button>
  )
}

// ─── Modal: novo tenant ────────────────────────────────────────
function ModalNovoTenant({ onClose, onCreate }: {
  onClose: () => void
  onCreate: (t: any) => void
}) {
  const [etapa, setEtapa]     = useState<1 | 2>(1)
  const [planoId, setPlanoId] = useState<PlanoId | ''>('')
  const [nome, setNome]       = useState('')
  const [slug, setSlug]       = useState('')
  const [modulos, setModulos] = useState<ModuloId[]>([])

  function selecionarPlano(id: PlanoId) {
    setPlanoId(id)
    setModulos([...PLANOS[id].modulos])
  }

  function toggleMod(id: ModuloId) {
    setModulos(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id])
  }

  function gerarSlug(v: string) {
    return v.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }

  function handleNome(v: string) {
    setNome(v)
    setSlug(gerarSlug(v))
  }

  function handleCriar() {
    if (!nome || !planoId) return
    onCreate({ id: Date.now().toString(), nome, slug, planoId, ativo: true, modulos })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between p-6 border-b border-brand-border sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-lg font-bold text-brand-dark">Novo Cliente / Tenant</h2>
            <p className="text-xs text-brand-gray">Etapa {etapa} de 2</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-brand-gray-light transition-colors">
            <X className="w-5 h-5 text-brand-gray" />
          </button>
        </div>

        <div className="p-6">

          {etapa === 1 && (
            <div>
              <p className="text-sm text-brand-gray mb-4">Selecione o plano base. Os módulos serão configurados automaticamente.</p>
              <div className="grid sm:grid-cols-2 gap-3">
                {(Object.keys(PLANOS) as PlanoId[]).map(pid => (
                  <PlanoCard
                    key={pid}
                    planoId={pid}
                    selecionado={planoId === pid}
                    onClick={() => selecionarPlano(pid)}
                  />
                ))}
              </div>
              <button
                onClick={() => setEtapa(2)}
                disabled={!planoId}
                className="w-full mt-6 py-3 bg-brand-green hover:opacity-90 disabled:opacity-40 text-white font-semibold rounded-xl transition-all"
              >
                Próximo
              </button>
            </div>
          )}

          {etapa === 2 && (
            <div className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-brand-dark mb-1.5">Nome do cliente</label>
                  <input
                    type="text"
                    value={nome}
                    onChange={e => handleNome(e.target.value)}
                    placeholder="Ex: AutoVille Multimarcas"
                    className="input-base"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-brand-dark mb-1.5">Slug</label>
                  <input
                    type="text"
                    value={slug}
                    onChange={e => setSlug(e.target.value)}
                    placeholder="autoville"
                    className="input-base font-mono"
                  />
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-brand-dark mb-3">
                  Módulos incluídos — {modulos.length} selecionados
                </p>
                {GRUPOS.map(g => (
                  <div key={g.titulo} className="mb-4">
                    <p className="text-xs font-bold text-brand-gray uppercase tracking-wide mb-2">{g.titulo}</p>
                    <div className="grid sm:grid-cols-2 gap-1.5">
                      {g.modulos.map(mid => {
                        const mod = MODULOS[mid]
                        const on  = modulos.includes(mid)
                        return (
                          <button
                            key={mid}
                            onClick={() => toggleMod(mid)}
                            className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-all ${
                              on ? 'border-brand-green bg-brand-green-light' : 'border-brand-border hover:border-brand-green/40'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${
                              on ? 'bg-brand-green' : 'bg-brand-gray-light border border-brand-border'
                            }`}>
                              {on && <Check className="w-2.5 h-2.5 text-white" />}
                            </div>
                            <div className="min-w-0">
                              <p className={`text-xs font-medium leading-tight ${on ? 'text-brand-green' : 'text-brand-dark'}`}>
                                {mod.nome}
                              </p>
                              {!mod.disponivel && (
                                <p className="text-[10px] text-purple-500 flex items-center gap-0.5 mt-0.5">
                                  <Lock className="w-2.5 h-2.5" /> FutureData
                                </p>
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setEtapa(1)} className="flex-1 py-3 border border-brand-border text-brand-gray hover:bg-brand-gray-light font-semibold rounded-xl text-sm transition-colors">
                  Voltar
                </button>
                <button onClick={handleCriar} disabled={!nome} className="flex-1 py-3 bg-brand-green hover:opacity-90 disabled:opacity-40 text-white font-semibold rounded-xl text-sm transition-all">
                  Criar cliente
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ──────────────────────────────────────────
export default function TenantsPage() {
  const [tenants, setTenants]     = useState(TENANTS_INICIAL)
  const [expandido, setExpandido] = useState<string | null>(null)
  const [modal, setModal]         = useState(false)

  function handleCreate(tenant: any) {
    setTenants(prev => [...prev, tenant])
  }

  function toggleModulo(tenantId: string, moduloId: ModuloId) {
    setTenants(prev => prev.map(t => {
      if (t.id !== tenantId) return t
      const tem = t.modulos.includes(moduloId)
      return { ...t, modulos: tem ? t.modulos.filter(m => m !== moduloId) : [...t.modulos, moduloId] }
    }))
  }

  function aplicarPlano(tenantId: string, pid: PlanoId) {
    setTenants(prev => prev.map(t =>
      t.id === tenantId ? { ...t, planoId: pid, modulos: [...PLANOS[pid].modulos] } : t
    ))
  }

  return (
    <div className="max-w-5xl mx-auto">

      {modal && <ModalNovoTenant onClose={() => setModal(false)} onCreate={handleCreate} />}

      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark flex items-center gap-2">
            <Shield className="w-6 h-6 text-brand-green" /> Tenants / Clientes
          </h1>
          <p className="text-sm text-brand-gray mt-1">Gerencie os clientes e os módulos habilitados para cada um</p>
        </div>
        <button
          onClick={() => setModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-green text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-all"
        >
          <Plus className="w-4 h-4" /> Novo cliente
        </button>
      </div>

      {/* Resumo de planos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-7">
        {(Object.keys(PLANOS) as PlanoId[]).map(pid => {
          const plano = PLANOS[pid]
          const qtd   = tenants.filter(t => t.planoId === pid).length
          const cor   = COR_PLANO[pid]
          return (
            <div key={pid} className="card p-4">
              <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: cor }}>{plano.nome}</p>
              <p className="text-2xl font-extrabold text-brand-dark">{qtd}</p>
              <p className="text-xs text-brand-gray">cliente{qtd !== 1 ? 's' : ''}</p>
              <p className="text-xs text-brand-gray mt-1">{plano.modulos.length} módulos base</p>
            </div>
          )
        })}
      </div>

      {/* Lista de tenants */}
      <div className="space-y-3">
        {tenants.map(tenant => {
          const aberto = expandido === tenant.id
          const plano  = PLANOS[tenant.planoId]
          const cor    = COR_PLANO[tenant.planoId] ?? '#00703C'

          return (
            <div key={tenant.id} className="card overflow-hidden">
              <button
                className="w-full flex items-center justify-between p-5 hover:bg-brand-gray-light/50 transition-colors text-left"
                onClick={() => setExpandido(aberto ? null : tenant.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
                       style={{ background: cor }}>
                    {tenant.nome.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-brand-dark">{tenant.nome}</p>
                      {plano && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                              style={{ background: cor + '15', color: cor }}>
                          {plano.nome}
                        </span>
                      )}
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        tenant.ativo ? 'bg-brand-green-light text-brand-green' : 'bg-red-50 text-brand-danger'
                      }`}>{tenant.ativo ? 'Ativo' : 'Inativo'}</span>
                    </div>
                    <p className="text-xs text-brand-gray mt-0.5">
                      {tenant.modulos.length} módulos · <span className="font-mono">{tenant.slug}</span>
                    </p>
                  </div>
                </div>
                {aberto
                  ? <ChevronUp className="w-5 h-5 text-brand-gray shrink-0" />
                  : <ChevronDown className="w-5 h-5 text-brand-gray shrink-0" />
                }
              </button>

              {aberto && (
                <div className="border-t border-brand-border p-5">
                  {/* Trocar plano */}
                  <div className="mb-5">
                    <p className="text-xs font-semibold text-brand-dark mb-2">Aplicar plano base</p>
                    <div className="flex flex-wrap gap-2">
                      {(Object.keys(PLANOS) as PlanoId[]).map(pid => (
                        <button
                          key={pid}
                          onClick={() => aplicarPlano(tenant.id, pid)}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                            tenant.planoId === pid ? 'text-white border-transparent' : 'border-brand-border text-brand-gray hover:border-gray-400'
                          }`}
                          style={tenant.planoId === pid ? { background: COR_PLANO[pid] } : {}}
                        >
                          {tenant.planoId === pid && <Check className="w-3 h-3" />}
                          {PLANOS[pid].nome}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Módulos por grupo */}
                  {GRUPOS.map(g => (
                    <div key={g.titulo} className="mb-5">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-bold text-brand-dark uppercase tracking-wide">{g.titulo}</p>
                        <div className="flex gap-3">
                          <button onClick={() => g.modulos.forEach(m => !tenant.modulos.includes(m) && toggleModulo(tenant.id, m))}
                            className="text-xs text-brand-green hover:underline font-medium">Tudo on</button>
                          <button onClick={() => setTenants(prev => prev.map(t => t.id !== tenant.id ? t : { ...t, modulos: t.modulos.filter(m => !g.modulos.includes(m)) }))}
                            className="text-xs text-brand-danger hover:underline font-medium">Tudo off</button>
                        </div>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-2">
                        {g.modulos.map(mid => {
                          const mod = MODULOS[mid]
                          const on  = tenant.modulos.includes(mid)
                          return (
                            <button
                              key={mid}
                              onClick={() => toggleModulo(tenant.id, mid)}
                              className={`flex items-start gap-3 p-3 rounded-xl border transition-all text-left ${
                                on ? 'border-brand-green bg-brand-green-light' : 'border-brand-border bg-white hover:border-brand-green/40'
                              }`}
                            >
                              <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 ${
                                on ? 'bg-brand-green' : 'bg-brand-gray-light border border-brand-border'
                              }`}>
                                {on && <Check className="w-3 h-3 text-white" />}
                              </div>
                              <div>
                                <p className={`text-xs font-semibold ${on ? 'text-brand-green' : 'text-brand-dark'}`}>{mod.nome}</p>
                                <p className="text-xs text-brand-gray leading-tight mt-0.5">{mod.descricao}</p>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}

                  <div className="flex justify-end pt-4 border-t border-brand-border mt-2">
                    <p className="text-xs text-brand-gray italic">Integração com banco de dados em desenvolvimento</p>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
