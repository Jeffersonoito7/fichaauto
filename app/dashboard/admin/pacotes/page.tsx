'use client'
import { useState, useEffect } from 'react'
import { Package, Plus, Pencil, Trash2, CheckCircle2, Star, Loader2, X, Save } from 'lucide-react'

interface Plano {
  id: string
  nome: string
  consultas: number
  preco: number
  descricao: string | null
  destaque: boolean
  economia_texto: string | null
  ativo: boolean
  ordem: number
}

const VAZIO: Omit<Plano, 'id'> = {
  nome: '', consultas: 1, preco: 0, descricao: '', destaque: false, economia_texto: '', ativo: true, ordem: 0,
}

export default function PacotesPage() {
  const [planos, setPlanos]     = useState<Plano[]>([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState<'criar' | 'editar' | null>(null)
  const [form, setForm]         = useState<Omit<Plano, 'id'>>(VAZIO)
  const [editId, setEditId]     = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro]         = useState<string | null>(null)

  async function carregar() {
    setLoading(true)
    const res = await fetch('/api/admin/pacotes')
    const data = await res.json()
    setPlanos(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  function abrirCriar() {
    setForm(VAZIO)
    setEditId(null)
    setErro(null)
    setModal('criar')
  }

  function abrirEditar(p: Plano) {
    setForm({ nome: p.nome, consultas: p.consultas, preco: p.preco, descricao: p.descricao ?? '', destaque: p.destaque, economia_texto: p.economia_texto ?? '', ativo: p.ativo, ordem: p.ordem })
    setEditId(p.id)
    setErro(null)
    setModal('editar')
  }

  async function salvar() {
    setSalvando(true)
    setErro(null)
    try {
      const url    = modal === 'editar' ? `/api/admin/pacotes/${editId}` : '/api/admin/pacotes'
      const method = modal === 'editar' ? 'PATCH' : 'POST'
      const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data   = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao salvar')
      setModal(null)
      await carregar()
    } catch (e: any) {
      setErro(e.message)
    } finally {
      setSalvando(false)
    }
  }

  async function toggleAtivo(p: Plano) {
    await fetch(`/api/admin/pacotes/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: !p.ativo }),
    })
    await carregar()
  }

  function campo(k: keyof typeof form, valor: any) {
    setForm(prev => ({ ...prev, [k]: valor }))
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">Pacotes de Recarga</h1>
          <p className="text-brand-gray text-sm mt-1">Crie e gerencie os pacotes disponíveis na carteira</p>
        </div>
        <button onClick={abrirCriar} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Novo pacote
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand-green" /></div>
      ) : (
        <div className="space-y-3">
          {planos.map(p => (
            <div key={p.id} className={`card p-5 flex items-center gap-4 ${!p.ativo ? 'opacity-50' : ''}`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${p.destaque ? 'bg-brand-green' : 'bg-brand-blue-light'}`}>
                <Package className={`w-6 h-6 ${p.destaque ? 'text-white' : 'text-brand-blue'}`} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-semibold text-brand-dark">{p.nome}</span>
                  {p.destaque && <Star className="w-3.5 h-3.5 text-brand-green fill-brand-green" />}
                  {!p.ativo && <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">INATIVO</span>}
                </div>
                <p className="text-sm text-brand-gray">{p.consultas} consultas{p.economia_texto ? ` · ${p.economia_texto}` : ''}</p>
              </div>

              <div className="text-right shrink-0">
                <p className="text-xl font-extrabold text-brand-blue">R$ {Number(p.preco).toFixed(2).replace('.', ',')}</p>
                <p className="text-xs text-brand-gray">R$ {(p.preco / p.consultas).toFixed(2).replace('.', ',')} / consulta</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => toggleAtivo(p)}
                  title={p.ativo ? 'Desativar' : 'Ativar'}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${p.ativo ? 'bg-brand-green-light text-brand-green hover:bg-brand-green hover:text-white' : 'bg-gray-100 text-gray-400 hover:bg-brand-green-light hover:text-brand-green'}`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => abrirEditar(p)}
                  className="w-8 h-8 rounded-lg bg-brand-blue-light text-brand-blue flex items-center justify-center hover:bg-brand-blue hover:text-white transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {planos.length === 0 && (
            <div className="card p-12 text-center text-brand-gray">
              <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Nenhum pacote cadastrado. Crie o primeiro!</p>
            </div>
          )}
        </div>
      )}

      {/* Modal criar/editar */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-brand-border">
              <h2 className="font-bold text-brand-dark">{modal === 'criar' ? 'Novo pacote' : 'Editar pacote'}</h2>
              <button onClick={() => setModal(null)} className="w-8 h-8 rounded-full hover:bg-brand-gray-light flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-brand-gray mb-1.5 font-medium">Nome do pacote</label>
                <input className="input-base" value={form.nome} onChange={e => campo('nome', e.target.value)} placeholder="Ex: Pacote Básico" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-brand-gray mb-1.5 font-medium">Consultas</label>
                  <input className="input-base" type="number" min={1} value={form.consultas} onChange={e => campo('consultas', Number(e.target.value))} />
                </div>
                <div>
                  <label className="block text-xs text-brand-gray mb-1.5 font-medium">Preço (R$)</label>
                  <input className="input-base" type="number" min={0} step={0.01} value={form.preco} onChange={e => campo('preco', Number(e.target.value))} />
                </div>
              </div>

              <div>
                <label className="block text-xs text-brand-gray mb-1.5 font-medium">Texto de economia (opcional)</label>
                <input className="input-base" value={form.economia_texto ?? ''} onChange={e => campo('economia_texto', e.target.value)} placeholder="Ex: Economize R$ 62,90" />
              </div>

              <div>
                <label className="block text-xs text-brand-gray mb-1.5 font-medium">Ordem de exibição</label>
                <input className="input-base" type="number" min={0} value={form.ordem} onChange={e => campo('ordem', Number(e.target.value))} />
              </div>

              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={form.destaque} onChange={e => campo('destaque', e.target.checked)} className="w-4 h-4 accent-brand-green" />
                  <span className="text-sm text-brand-dark">Destaque (mais popular)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={form.ativo} onChange={e => campo('ativo', e.target.checked)} className="w-4 h-4 accent-brand-green" />
                  <span className="text-sm text-brand-dark">Ativo</span>
                </label>
              </div>

              {erro && <p className="text-xs text-brand-danger">{erro}</p>}
            </div>

            <div className="flex gap-3 p-5 border-t border-brand-border">
              <button onClick={() => setModal(null)} className="flex-1 h-10 rounded-xl border border-brand-border text-brand-gray text-sm hover:bg-brand-gray-light transition-colors">
                Cancelar
              </button>
              <button onClick={salvar} disabled={salvando || !form.nome || !form.consultas || !form.preco} className="flex-1 btn-primary h-10 flex items-center justify-center gap-2 disabled:opacity-40">
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
