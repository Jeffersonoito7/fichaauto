'use client'
import { useState, useEffect } from 'react'
import { Users, Search, Pencil, Loader2, X, Save, Plus, Minus, Settings2 } from 'lucide-react'
import { PLANOS, type PlanoId, type ModuloId } from '@/lib/products'
import ModulosSelector from '@/components/ModulosSelector'

interface Usuario {
  user_id: string
  nome: string | null
  email: string
  saldo_consultas: number
  ativo: boolean
  pode_placa: boolean
  pode_cpf: boolean
  pode_cnpj: boolean
  pode_lote: boolean
  obs_admin: string | null
  atualizado_em: string | null
  plano: PlanoId | null
  modulos_liberados: ModuloId[]
}

const PLANO_CORES: Record<string, string> = {
  essencial:     'bg-green-100 text-green-700',
  profissional:  'bg-blue-100 text-blue-700',
  seguradora:    'bg-purple-100 text-purple-700',
  despachante:   'bg-amber-100 text-amber-700',
}

const PERM_LABELS: { key: keyof Usuario; label: string }[] = [
  { key: 'pode_placa', label: 'Consulta Placa' },
  { key: 'pode_cpf',   label: 'Consulta CPF'  },
  { key: 'pode_cnpj',  label: 'Consulta CNPJ' },
  { key: 'pode_lote',  label: 'Lote'          },
]

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading]   = useState(true)
  const [busca, setBusca]       = useState('')
  const [editando, setEditando] = useState<Usuario | null>(null)
  const [form, setForm]         = useState<Partial<Usuario>>({})
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro]         = useState<string | null>(null)

  async function carregar() {
    setLoading(true)
    const res  = await fetch('/api/admin/usuarios')
    const data = await res.json()
    setUsuarios(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  function abrirEditar(u: Usuario) {
    setEditando(u)
    setForm({
      nome: u.nome ?? '',
      saldo_consultas: u.saldo_consultas,
      ativo: u.ativo,
      pode_placa: u.pode_placa,
      pode_cpf: u.pode_cpf,
      pode_cnpj: u.pode_cnpj,
      pode_lote: u.pode_lote,
      obs_admin: u.obs_admin ?? '',
      plano: u.plano,
      modulos_liberados: u.modulos_liberados ?? [],
    })
    setErro(null)
  }

  async function salvar() {
    if (!editando) return
    setSalvando(true)
    setErro(null)
    try {
      const res  = await fetch(`/api/admin/usuarios/${editando.user_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao salvar')
      setEditando(null)
      await carregar()
    } catch (e: any) {
      setErro(e.message)
    } finally {
      setSalvando(false)
    }
  }

  const filtrados = usuarios.filter(u =>
    !busca || (u.email + (u.nome ?? '')).toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-dark">Usuários</h1>
        <p className="text-brand-gray text-sm mt-1">Gerencie saldo e permissões de cada cliente</p>
      </div>

      {/* Busca */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-gray" />
        <input
          className="input-base pl-9"
          placeholder="Buscar por e-mail ou nome..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand-green" /></div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-brand-gray-light border-b border-brand-border">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-brand-gray uppercase tracking-wider">Usuário</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-brand-gray uppercase tracking-wider">Saldo</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-brand-gray uppercase tracking-wider">Permissões</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-brand-gray uppercase tracking-wider">Status</th>
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {filtrados.map(u => (
                <tr key={u.user_id} className="hover:bg-brand-gray-light/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-brand-dark truncate max-w-[200px]">{u.nome ?? '—'}</p>
                    <p className="text-xs text-brand-gray truncate max-w-[200px]">{u.email}</p>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className={`font-bold text-base ${u.saldo_consultas > 0 ? 'text-brand-green' : 'text-brand-danger'}`}>
                      {u.saldo_consultas ?? 0}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-center gap-1 flex-wrap">
                      {u.plano ? (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${PLANO_CORES[u.plano] ?? 'bg-gray-100 text-gray-600'}`}>
                          {PLANOS[u.plano]?.nome ?? u.plano}
                        </span>
                      ) : (
                        PERM_LABELS.map(({ key, label }) => (
                          <span key={key} className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${(u as any)[key] ? 'bg-brand-green-light text-brand-green' : 'bg-gray-100 text-gray-400'}`}>
                            {label}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center">
                    {u.ativo
                      ? <span className="text-[10px] bg-brand-green-light text-brand-green px-2 py-0.5 rounded-full font-medium">Ativo</span>
                      : <span className="text-[10px] bg-red-50 text-brand-danger px-2 py-0.5 rounded-full font-medium">Inativo</span>
                    }
                  </td>
                  <td className="px-3 py-3 text-right">
                    <button
                      onClick={() => abrirEditar(u)}
                      className="w-8 h-8 rounded-lg bg-brand-blue-light text-brand-blue flex items-center justify-center hover:bg-brand-blue hover:text-white transition-colors ml-auto"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-brand-gray">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    {busca ? 'Nenhum usuário encontrado' : 'Nenhum usuário cadastrado ainda'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal editar usuário */}
      {editando && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-4">
            <div className="flex items-center justify-between p-5 border-b border-brand-border">
              <div>
                <h2 className="font-bold text-brand-dark">Editar usuário</h2>
                <p className="text-xs text-brand-gray">{editando.email}</p>
              </div>
              <button onClick={() => setEditando(null)} className="w-8 h-8 rounded-full hover:bg-brand-gray-light flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 grid lg:grid-cols-2 gap-5">

              {/* Coluna esquerda — dados básicos */}
              <div className="space-y-4">
                {/* Nome */}
                <div>
                  <label className="block text-xs text-brand-gray mb-1.5 font-medium">Nome</label>
                  <input className="input-base" value={form.nome ?? ''} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome do cliente" />
                </div>

                {/* Saldo */}
                <div>
                  <label className="block text-xs text-brand-gray mb-1.5 font-medium">Saldo de consultas</label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setForm(f => ({ ...f, saldo_consultas: Math.max(0, (f.saldo_consultas ?? 0) - 1) }))}
                      className="w-9 h-9 rounded-lg bg-brand-gray-light flex items-center justify-center hover:bg-brand-border transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number" min={0}
                      className="input-base flex-1 text-center font-bold text-xl"
                      value={form.saldo_consultas ?? 0}
                      onChange={e => setForm(f => ({ ...f, saldo_consultas: Number(e.target.value) }))}
                    />
                    <button
                      onClick={() => setForm(f => ({ ...f, saldo_consultas: (f.saldo_consultas ?? 0) + 1 }))}
                      className="w-9 h-9 rounded-lg bg-brand-gray-light flex items-center justify-center hover:bg-brand-border transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Plano */}
                <div>
                  <label className="block text-xs text-brand-gray mb-2 font-medium">Plano base</label>
                  <div className="grid grid-cols-2 gap-2">
                    {([null, 'essencial', 'profissional', 'despachante', 'seguradora'] as const).map(pid => {
                      const plano = pid ? PLANOS[pid] : null
                      const ativo = (form as any).plano === pid
                      return (
                        <button
                          key={pid ?? 'sem'}
                          type="button"
                          onClick={() => setForm(f => ({ ...f, plano: pid }))}
                          className={`p-2.5 rounded-xl border-2 text-left transition-all ${ativo ? 'border-brand-blue bg-brand-blue-light' : 'border-brand-border hover:border-brand-blue/40'}`}
                        >
                          <p className={`text-xs font-bold ${ativo ? 'text-brand-blue' : 'text-brand-dark'}`}>
                            {plano ? plano.nome : 'Sem plano'}
                          </p>
                          <p className="text-[10px] text-brand-gray mt-0.5">
                            {plano ? `${plano.creditos} consultas/mês` : 'Só módulos liberados'}
                          </p>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Status */}
                <label className="flex items-center gap-2 cursor-pointer select-none p-3 rounded-xl border border-brand-border hover:bg-brand-gray-light transition-colors">
                  <input type="checkbox" checked={form.ativo ?? true} onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))} className="w-4 h-4 accent-brand-green" />
                  <span className="text-sm font-medium text-brand-dark">Conta ativa</span>
                </label>

                {/* Obs admin */}
                <div>
                  <label className="block text-xs text-brand-gray mb-1.5 font-medium">Observação interna</label>
                  <textarea className="input-base resize-none h-20 text-sm" value={form.obs_admin ?? ''} onChange={e => setForm(f => ({ ...f, obs_admin: e.target.value }))} placeholder="Notas visíveis só para admins" />
                </div>

                {erro && <p className="text-xs text-brand-danger bg-red-50 px-3 py-2 rounded-xl">{erro}</p>}
              </div>

              {/* Coluna direita — módulos liberados */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Settings2 className="w-4 h-4 text-brand-blue" />
                  <label className="text-xs font-semibold text-brand-dark uppercase tracking-wide">
                    Módulos liberados
                  </label>
                </div>
                <p className="text-xs text-brand-gray mb-3">
                  Define exatamente quais dados este cliente pode consultar, independente do plano.
                </p>
                <div className="max-h-[420px] overflow-y-auto pr-1">
                  <ModulosSelector
                    selecionados={(form as any).modulos_liberados ?? []}
                    onChange={mods => setForm(f => ({ ...f, modulos_liberados: mods }))}
                  />
                </div>
              </div>

            </div>

            <div className="flex gap-3 p-5 border-t border-brand-border">
              <button onClick={() => setEditando(null)} className="flex-1 h-10 rounded-xl border border-brand-border text-brand-gray text-sm hover:bg-brand-gray-light transition-colors">
                Cancelar
              </button>
              <button onClick={salvar} disabled={salvando} className="flex-1 btn-primary h-10 flex items-center justify-center gap-2 disabled:opacity-40">
                {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
