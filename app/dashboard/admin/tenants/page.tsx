'use client'
import { useState } from 'react'
import { MODULOS, ModuloId, ModuloInfo } from '@/lib/providers/assertiva'
import { PLANOS, Plano } from '@/lib/planos'
import {
  Shield, Building2, Users, Plus, ChevronDown, ChevronUp,
  Check, Car, User, X, Pencil, ToggleLeft, ToggleRight
} from 'lucide-react'

// ─── Mock tenants ──────────────────────────────────────────────
const TENANTS_INICIAL = [
  {
    id: '1', nome: 'Ficha Auto', slug: 'ficha-auto', planoId: 'veicular',
    cor: '#00A651', ativo: true,
    modulos: ['placa','binFederal','sinistro','gravame','leilao','chassi'] as ModuloId[],
  },
  {
    id: '2', nome: 'AutoVille Multimarcas', slug: 'autoville', planoId: 'veicular',
    cor: '#2563EB', ativo: true,
    modulos: ['placa','binFederal','sinistro','gravame','leilao'] as ModuloId[],
  },
  {
    id: '3', nome: 'AVP — Auto Vale Prevenções', slug: 'avp', planoId: 'protecao',
    cor: '#DC2626', ativo: true,
    modulos: PLANOS.find(p => p.id === 'protecao')!.modulos,
  },
]

// ─── Helpers ──────────────────────────────────────────────────
const GRUPOS = ['Veículos', 'CPF — Pessoa Física', 'CNPJ — Pessoa Jurídica'] as const

const ICONE_PLANO: Record<string, React.ElementType> = {
  veicular: Car, pessoa: User, empresa: Building2, protecao: Shield,
}

function PlanoCard({ plano, selecionado, onClick }: { plano: Plano; selecionado: boolean; onClick: () => void }) {
  const Icone = ICONE_PLANO[plano.id] ?? Shield
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
        selecionado
          ? 'border-current bg-opacity-5'
          : 'border-brand-border hover:border-gray-300'
      }`}
      style={selecionado ? { borderColor: plano.cor, backgroundColor: plano.cor + '10' } : {}}
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
             style={{ background: plano.cor + '20' }}>
          <Icone className="w-5 h-5" style={{ color: plano.cor }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-brand-dark text-sm">{plano.nome}</p>
            {selecionado && <Check className="w-4 h-4" style={{ color: plano.cor }} />}
          </div>
          <p className="text-xs text-brand-gray mt-0.5 leading-tight">{plano.descricao}</p>
          <p className="text-xs font-semibold mt-1.5" style={{ color: plano.cor }}>{plano.preco}</p>
          <p className="text-xs text-brand-gray mt-0.5">{plano.modulos.length} módulos incluídos</p>
        </div>
      </div>
    </button>
  )
}

// ─── Modal novo tenant ─────────────────────────────────────────
function ModalNovoTenant({ onClose, onCreate }: {
  onClose: () => void
  onCreate: (tenant: any) => void
}) {
  const [etapa, setEtapa]       = useState<1 | 2>(1)
  const [planoId, setPlanoId]   = useState('')
  const [nome, setNome]         = useState('')
  const [slug, setSlug]         = useState('')
  const [cor, setCor]           = useState('#00A651')
  const [modulos, setModulos]   = useState<ModuloId[]>([])

  function selecionarPlano(id: string) {
    const plano = PLANOS.find(p => p.id === id)!
    setPlanoId(id)
    setModulos([...plano.modulos])
    setCor(plano.cor)
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
    onCreate({ id: Date.now().toString(), nome, slug, planoId, cor, ativo: true, modulos })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-brand-border sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-lg font-bold text-brand-dark">Novo Tenant</h2>
            <p className="text-xs text-brand-gray">Etapa {etapa} de 2 — {etapa === 1 ? 'Escolha o plano' : 'Dados e módulos'}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-brand-gray-light transition-colors">
            <X className="w-5 h-5 text-brand-gray" />
          </button>
        </div>

        <div className="p-6">

          {/* Etapa 1 — Escolha o plano */}
          {etapa === 1 && (
            <div>
              <p className="text-sm text-brand-gray mb-5">
                Selecione o pacote de serviços. Os módulos serão pré-configurados automaticamente e você poderá ajustar na etapa seguinte.
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {PLANOS.map(plano => (
                  <PlanoCard
                    key={plano.id}
                    plano={plano}
                    selecionado={planoId === plano.id}
                    onClick={() => selecionarPlano(plano.id)}
                  />
                ))}
              </div>

              {planoId && (
                <div className="mt-5 p-4 rounded-xl bg-brand-gray-light">
                  <p className="text-xs font-semibold text-brand-dark mb-2">Modelos de negócio sugeridos:</p>
                  <div className="flex flex-wrap gap-2">
                    {PLANOS.find(p => p.id === planoId)!.modelos.map(m => (
                      <span key={m} className="text-xs bg-white border border-brand-border px-2.5 py-1 rounded-full text-brand-dark">{m}</span>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => setEtapa(2)}
                disabled={!planoId}
                className="w-full mt-6 py-3 bg-brand-green hover:bg-brand-green-dark disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
              >
                Próximo: Dados do cliente
              </button>
            </div>
          )}

          {/* Etapa 2 — Dados e módulos */}
          {etapa === 2 && (
            <div className="space-y-5">

              {/* Dados básicos */}
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
                  <label className="block text-xs font-medium text-brand-dark mb-1.5">Slug (URL)</label>
                  <input
                    type="text"
                    value={slug}
                    onChange={e => setSlug(e.target.value)}
                    placeholder="autoville"
                    className="input-base font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div>
                  <label className="block text-xs font-medium text-brand-dark mb-1.5">Cor principal</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={cor} onChange={e => setCor(e.target.value)}
                      className="w-10 h-10 rounded-lg border border-brand-border cursor-pointer" />
                    <span className="text-xs font-mono text-brand-gray">{cor}</span>
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-brand-dark mb-1.5">Plano selecionado</label>
                  <div className="flex items-center gap-2 p-2 bg-brand-gray-light rounded-lg">
                    <span className="text-sm font-semibold text-brand-dark">
                      {PLANOS.find(p => p.id === planoId)?.nome}
                    </span>
                    <button onClick={() => setEtapa(1)} className="text-xs text-brand-green hover:underline ml-auto">
                      Alterar
                    </button>
                  </div>
                </div>
              </div>

              {/* Módulos */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-bold text-brand-dark">Módulos habilitados</p>
                  <span className="text-xs text-brand-gray">{modulos.length}/{MODULOS.length} selecionados</span>
                </div>

                {GRUPOS.map(grupo => (
                  <div key={grupo} className="mb-4">
                    <p className="text-xs font-semibold text-brand-gray uppercase tracking-wide mb-2">{grupo}</p>
                    <div className="grid sm:grid-cols-2 gap-1.5">
                      {MODULOS.filter(m => m.grupo === grupo).map((mod: ModuloInfo) => {
                        const on = modulos.includes(mod.id)
                        return (
                          <button
                            key={mod.id}
                            onClick={() => toggleMod(mod.id)}
                            className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-all ${
                              on
                                ? 'border-brand-green bg-brand-green-light'
                                : 'border-brand-border hover:border-brand-green/40'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${
                              on ? 'bg-brand-green' : 'bg-brand-gray-light border border-brand-border'
                            }`}>
                              {on && <Check className="w-2.5 h-2.5 text-white" />}
                            </div>
                            <span className={`text-xs font-medium ${on ? 'text-brand-green' : 'text-brand-dark'}`}>
                              {mod.label}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setEtapa(1)}
                  className="flex-1 py-3 border border-brand-border text-brand-gray hover:bg-brand-gray-light font-semibold rounded-lg transition-colors text-sm"
                >
                  Voltar
                </button>
                <button
                  onClick={handleCriar}
                  disabled={!nome}
                  className="flex-1 py-3 bg-brand-green hover:bg-brand-green-dark disabled:opacity-50 text-white font-semibold rounded-lg transition-colors text-sm"
                >
                  Criar tenant
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
  const [salvando, setSalvando]   = useState(false)

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

  function habilitarGrupo(tenantId: string, grupo: string, habilitar: boolean) {
    const ids = MODULOS.filter(m => m.grupo === grupo).map(m => m.id)
    setTenants(prev => prev.map(t => {
      if (t.id !== tenantId) return t
      if (habilitar) return { ...t, modulos: [...new Set([...t.modulos, ...ids])] }
      return { ...t, modulos: t.modulos.filter(m => !ids.includes(m)) }
    }))
  }

  function aplicarPlano(tenantId: string, planoId: string) {
    const plano = PLANOS.find(p => p.id === planoId)
    if (!plano) return
    setTenants(prev => prev.map(t =>
      t.id === tenantId ? { ...t, planoId, modulos: [...plano.modulos] } : t
    ))
  }

  async function salvar(tenantId: string) {
    setSalvando(true)
    await new Promise(r => setTimeout(r, 600))
    setSalvando(false)
  }

  return (
    <div className="max-w-5xl mx-auto">

      {modal && (
        <ModalNovoTenant onClose={() => setModal(false)} onCreate={handleCreate} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark flex items-center gap-2">
            <Shield className="w-6 h-6 text-brand-green" /> Tenants e Planos
          </h1>
          <p className="text-sm text-brand-gray mt-1">Gerencie os clientes e controle quais módulos cada um pode usar</p>
        </div>
        <button
          onClick={() => setModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-green hover:bg-brand-green-dark text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" /> Novo Tenant
        </button>
      </div>

      {/* Cards de planos disponíveis */}
      <div className="grid grid-cols-4 gap-3 mb-7">
        {PLANOS.map(plano => {
          const Icone = ICONE_PLANO[plano.id] ?? Shield
          const qtd = tenants.filter(t => t.planoId === plano.id).length
          return (
            <div key={plano.id} className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                     style={{ background: plano.cor + '20' }}>
                  <Icone className="w-4 h-4" style={{ color: plano.cor }} />
                </div>
                <span className="text-xs font-bold text-brand-dark leading-tight">{plano.nome}</span>
              </div>
              <p className="text-2xl font-extrabold text-brand-dark">{qtd}</p>
              <p className="text-xs text-brand-gray">cliente{qtd !== 1 ? 's' : ''}</p>
              <p className="text-xs font-medium mt-1" style={{ color: plano.cor }}>{plano.modulos.length} módulos</p>
            </div>
          )
        })}
      </div>

      {/* Lista de tenants */}
      <div className="space-y-3">
        {tenants.map(tenant => {
          const aberto = expandido === tenant.id
          const plano  = PLANOS.find(p => p.id === tenant.planoId)
          const Icone  = plano ? (ICONE_PLANO[plano.id] ?? Shield) : Shield

          return (
            <div key={tenant.id} className="card overflow-hidden">

              {/* Row do tenant */}
              <button
                className="w-full flex items-center justify-between p-5 hover:bg-brand-gray-light/50 transition-colors text-left"
                onClick={() => setExpandido(aberto ? null : tenant.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
                       style={{ background: tenant.cor }}>
                    {tenant.nome.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-brand-dark">{tenant.nome}</p>
                      {plano && (
                        <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                              style={{ background: plano.cor + '15', color: plano.cor }}>
                          <Icone className="w-3 h-3" /> {plano.nome}
                        </span>
                      )}
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        tenant.ativo ? 'bg-brand-green-light text-brand-green' : 'bg-red-50 text-brand-danger'
                      }`}>{tenant.ativo ? 'Ativo' : 'Inativo'}</span>
                    </div>
                    <p className="text-xs text-brand-gray mt-0.5">
                      {tenant.modulos.length}/{MODULOS.length} módulos · slug: <span className="font-mono">{tenant.slug}</span>
                    </p>
                  </div>
                </div>
                {aberto
                  ? <ChevronUp className="w-5 h-5 text-brand-gray shrink-0" />
                  : <ChevronDown className="w-5 h-5 text-brand-gray shrink-0" />
                }
              </button>

              {/* Painel expandido */}
              {aberto && (
                <div className="border-t border-brand-border p-5">

                  {/* Trocar plano rapidamente */}
                  <div className="mb-5">
                    <p className="text-xs font-semibold text-brand-dark mb-2">Aplicar plano base</p>
                    <div className="flex flex-wrap gap-2">
                      {PLANOS.map(p => (
                        <button
                          key={p.id}
                          onClick={() => aplicarPlano(tenant.id, p.id)}
                          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                            tenant.planoId === p.id
                              ? 'text-white border-transparent'
                              : 'border-brand-border text-brand-gray hover:border-gray-400'
                          }`}
                          style={tenant.planoId === p.id ? { background: p.cor, borderColor: p.cor } : {}}
                        >
                          {tenant.planoId === p.id && <Check className="w-3 h-3" />}
                          {p.nome}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-brand-gray mt-1.5">Aplicar um plano substitui os módulos pelos padrões do plano. Você pode ajustar abaixo.</p>
                  </div>

                  {/* Toggles de módulos */}
                  {GRUPOS.map(grupo => (
                    <div key={grupo} className="mb-5 last:mb-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-bold text-brand-dark uppercase tracking-wide">{grupo}</h3>
                        <div className="flex gap-3">
                          <button onClick={() => habilitarGrupo(tenant.id, grupo, true)}
                            className="text-xs text-brand-green hover:underline font-medium">Tudo on</button>
                          <button onClick={() => habilitarGrupo(tenant.id, grupo, false)}
                            className="text-xs text-brand-danger hover:underline font-medium">Tudo off</button>
                        </div>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-2">
                        {MODULOS.filter(m => m.grupo === grupo).map((mod: ModuloInfo) => {
                          const on = tenant.modulos.includes(mod.id)
                          return (
                            <button
                              key={mod.id}
                              onClick={() => toggleModulo(tenant.id, mod.id)}
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
                                <p className={`text-xs font-semibold ${on ? 'text-brand-green' : 'text-brand-dark'}`}>{mod.label}</p>
                                <p className="text-xs text-brand-gray leading-tight mt-0.5">{mod.descricao}</p>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}

                  <div className="flex justify-end pt-4 border-t border-brand-border mt-4">
                    <button
                      onClick={() => salvar(tenant.id)}
                      disabled={salvando}
                      className="px-6 py-2.5 bg-brand-green hover:bg-brand-green-dark disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                      {salvando ? 'Salvando...' : 'Salvar permissões'}
                    </button>
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
