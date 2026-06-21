'use client'
import { useState, useEffect } from 'react'
import { Users, Search, Pencil, Loader2, X, Save, CreditCard } from 'lucide-react'

interface Usuario {
  user_id:          string
  nome:             string | null
  email:            string
  saldo_veiculo:    number
  saldo_cpf:        number
  creditos_credito: number
  ativo:            boolean
  pode_placa:       boolean
  pode_cpf:         boolean
  pode_cnpj:        boolean
  pode_lote:        boolean
  pode_credito:     boolean
  obs_admin:        string | null
  atualizado_em:    string | null
}

function moeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer select-none p-2.5 rounded-xl border border-brand-border hover:bg-brand-gray-light transition-colors">
      <span className="text-sm font-medium text-brand-dark">{label}</span>
      <div
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors ${checked ? 'bg-brand-green' : 'bg-gray-200'}`}
      >
        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </div>
    </label>
  )
}

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
      nome:             u.nome ?? '',
      saldo_veiculo:    u.saldo_veiculo ?? 0,
      saldo_cpf:        u.saldo_cpf ?? 0,
      creditos_credito: u.creditos_credito ?? 0,
      ativo:            u.ativo,
      pode_placa:       u.pode_placa,
      pode_cpf:         u.pode_cpf,
      pode_cnpj:        u.pode_cnpj,
      pode_lote:        u.pode_lote,
      pode_credito:     u.pode_credito ?? false,
      obs_admin:        u.obs_admin ?? '',
    })
    setErro(null)
  }

  async function salvar() {
    if (!editando) return
    setSalvando(true)
    setErro(null)
    try {
      const res  = await fetch(`/api/admin/usuarios/${editando.user_id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
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

  const produtosAtivos = (u: Usuario) => {
    const p = []
    if (u.pode_placa)   p.push('P1 Veículo')
    if (u.pode_cpf)     p.push('P2 CPF')
    if (u.pode_cnpj)    p.push('P2 CNPJ')
    if (u.pode_credito) p.push('P3 Crédito')
    return p
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-dark">Usuários</h1>
        <p className="text-brand-gray text-sm mt-1">Gerencie saldo, créditos e produtos de cada cliente</p>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-gray" />
        <input className="input-base pl-9" placeholder="Buscar por e-mail ou nome..." value={busca} onChange={e => setBusca(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand-green" /></div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-brand-gray-light border-b border-brand-border">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-brand-gray uppercase tracking-wider">Usuário</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-brand-gray uppercase tracking-wider">P1 Veicular</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-brand-gray uppercase tracking-wider">P2 Pessoas</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-brand-gray uppercase tracking-wider">Créditos P3</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-brand-gray uppercase tracking-wider">Produtos</th>
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
                    <span className={`font-bold text-sm ${(u.saldo_veiculo ?? 0) > 0 ? 'text-brand-green' : 'text-brand-danger'}`}>
                      {moeda(u.saldo_veiculo ?? 0)}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className={`font-bold text-sm ${(u.saldo_cpf ?? 0) > 0 ? 'text-brand-green' : 'text-brand-danger'}`}>
                      {moeda(u.saldo_cpf ?? 0)}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    {u.pode_credito ? (
                      <span className={`font-bold text-sm flex items-center justify-center gap-1 ${(u.creditos_credito ?? 0) > 0 ? 'text-brand-blue' : 'text-brand-gray'}`}>
                        <CreditCard className="w-3 h-3" /> {u.creditos_credito ?? 0}
                      </span>
                    ) : (
                      <span className="text-xs text-brand-gray">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-center gap-1 flex-wrap">
                      {produtosAtivos(u).map(p => (
                        <span key={p} className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-brand-green-light text-brand-green">{p}</span>
                      ))}
                      {produtosAtivos(u).length === 0 && <span className="text-xs text-brand-gray">Nenhum</span>}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center">
                    {u.ativo
                      ? <span className="text-[10px] bg-brand-green-light text-brand-green px-2 py-0.5 rounded-full font-medium">Ativo</span>
                      : <span className="text-[10px] bg-red-50 text-brand-danger px-2 py-0.5 rounded-full font-medium">Inativo</span>}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <button onClick={() => abrirEditar(u)} className="w-8 h-8 rounded-lg bg-brand-blue-light text-brand-blue flex items-center justify-center hover:bg-brand-blue hover:text-white transition-colors ml-auto">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-brand-gray">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    {busca ? 'Nenhum usuário encontrado' : 'Nenhum usuário cadastrado ainda'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal editar */}
      {editando && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-4">
            <div className="flex items-center justify-between p-5 border-b border-brand-border">
              <div>
                <h2 className="font-bold text-brand-dark">Editar usuário</h2>
                <p className="text-xs text-brand-gray">{editando.email}</p>
              </div>
              <button onClick={() => setEditando(null)} className="w-8 h-8 rounded-full hover:bg-brand-gray-light flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Nome */}
              <div>
                <label className="block text-xs text-brand-gray mb-1.5 font-medium">Nome</label>
                <input className="input-base" value={form.nome ?? ''} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome do cliente" />
              </div>

              {/* Saldos */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-brand-gray mb-1.5 font-medium">P1 Veicular (R$)</label>
                  <input
                    type="number" min={0} step={0.01}
                    className="input-base text-center font-bold"
                    value={form.saldo_veiculo ?? 0}
                    onChange={e => setForm(f => ({ ...f, saldo_veiculo: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <label className="block text-xs text-brand-gray mb-1.5 font-medium">P2 Pessoas (R$)</label>
                  <input
                    type="number" min={0} step={0.01}
                    className="input-base text-center font-bold"
                    value={form.saldo_cpf ?? 0}
                    onChange={e => setForm(f => ({ ...f, saldo_cpf: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <label className="block text-xs text-brand-gray mb-1.5 font-medium">Créditos P3</label>
                  <input
                    type="number" min={0} step={1}
                    className="input-base text-center font-bold"
                    value={form.creditos_credito ?? 0}
                    onChange={e => setForm(f => ({ ...f, creditos_credito: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              {/* Produtos liberados */}
              <div>
                <label className="block text-xs text-brand-gray mb-2 font-medium uppercase tracking-wide">Produtos liberados</label>
                <div className="space-y-2">
                  <Toggle label="Produto 1 — Consulta Veicular (Placa)" checked={!!form.pode_placa} onChange={v => setForm(f => ({ ...f, pode_placa: v }))} />
                  <Toggle label="Produto 2 — Consulta CPF" checked={!!form.pode_cpf} onChange={v => setForm(f => ({ ...f, pode_cpf: v }))} />
                  <Toggle label="Produto 2 — Consulta CNPJ" checked={!!form.pode_cnpj} onChange={v => setForm(f => ({ ...f, pode_cnpj: v }))} />
                  <Toggle label="Consulta em Lote (CSV)" checked={!!form.pode_lote} onChange={v => setForm(f => ({ ...f, pode_lote: v }))} />
                  <div className="border border-brand-blue/30 rounded-xl overflow-hidden">
                    <Toggle label="Produto 3 — Análise de Crédito (SPC/Serasa)" checked={!!form.pode_credito} onChange={v => setForm(f => ({ ...f, pode_credito: v }))} />
                  </div>
                </div>
              </div>

              {/* Status */}
              <Toggle label="Conta ativa" checked={!!form.ativo} onChange={v => setForm(f => ({ ...f, ativo: v }))} />

              {/* Obs */}
              <div>
                <label className="block text-xs text-brand-gray mb-1.5 font-medium">Observação interna</label>
                <textarea className="input-base resize-none h-16 text-sm" value={form.obs_admin ?? ''} onChange={e => setForm(f => ({ ...f, obs_admin: e.target.value }))} placeholder="Visível só para admins" />
              </div>

              {erro && <p className="text-xs text-brand-danger bg-red-50 px-3 py-2 rounded-xl">{erro}</p>}
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
