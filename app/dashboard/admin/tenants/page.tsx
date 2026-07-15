'use client'
import { useState, useEffect } from 'react'
import {
  Building2, Plus, XCircle, Pencil, Wallet,
  Globe, Mail, ChevronDown, ChevronUp, Loader2, X, Check
} from 'lucide-react'

interface Tenant {
  id: string; slug: string; nome: string; nome_fantasia: string | null
  dominio: string | null; logo_url: string | null
  cor_primaria: string; cor_secundaria: string; cor_texto: string
  telefone: string | null; email_contato: string | null
  ativo: boolean; saldo_veiculo: number; saldo_cpf: number
  preco_veiculo: number | null; preco_cpf: number | null
  criado_em: string
}

const VAZIO: Omit<Tenant, 'id' | 'criado_em'> = {
  slug: '', nome: '', nome_fantasia: '', dominio: '', logo_url: '',
  cor_primaria: '#00A651', cor_secundaria: '#0055A4', cor_texto: '#FFFFFF',
  telefone: '', email_contato: '', ativo: true,
  saldo_veiculo: 0, saldo_cpf: 0, preco_veiculo: null, preco_cpf: null,
}

function moeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR')
}

// ── Modal de cadastro / edicao ─────────────────────────────────────────────────
function ModalTenant({
  inicial, onSalvar, onFechar, salvando
}: {
  inicial: Partial<Tenant>
  onSalvar: (dados: any) => void
  onFechar: () => void
  salvando: boolean
}) {
  const [form, setForm] = useState({ ...VAZIO, ...inicial })

  function campo(k: keyof typeof form, v: any) {
    setForm(p => ({ ...p, [k]: v }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            {inicial.id ? 'Editar Tenant' : 'Nova Empresa'}
          </h2>
          <button onClick={onFechar} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Identidade */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Identidade</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome da empresa *</label>
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                  value={form.nome} onChange={e => campo('nome', e.target.value)} placeholder="Revenda ABC Veículos" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome fantasia</label>
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                  value={form.nome_fantasia ?? ''} onChange={e => campo('nome_fantasia', e.target.value)} placeholder="Revenda ABC" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug (ID unico) *</label>
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-green"
                  value={form.slug}
                  onChange={e => campo('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="revenda-abc" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dominio proprio</label>
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-green"
                  value={form.dominio ?? ''} onChange={e => campo('dominio', e.target.value)} placeholder="consulta.revenda-abc.com.br" />
              </div>
            </div>
          </div>

          {/* Visual */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Visual / Marca</p>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL da logo</label>
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                  value={form.logo_url ?? ''} onChange={e => campo('logo_url', e.target.value)}
                  placeholder="https://revenda-abc.com.br/logo.png" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cor primaria</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={form.cor_primaria}
                      onChange={e => campo('cor_primaria', e.target.value)}
                      className="w-10 h-9 rounded border border-gray-200 cursor-pointer p-0.5" />
                    <input className="flex-1 border border-gray-200 rounded-lg px-2 py-2 text-xs font-mono focus:outline-none"
                      value={form.cor_primaria} onChange={e => campo('cor_primaria', e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cor secundaria</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={form.cor_secundaria}
                      onChange={e => campo('cor_secundaria', e.target.value)}
                      className="w-10 h-9 rounded border border-gray-200 cursor-pointer p-0.5" />
                    <input className="flex-1 border border-gray-200 rounded-lg px-2 py-2 text-xs font-mono focus:outline-none"
                      value={form.cor_secundaria} onChange={e => campo('cor_secundaria', e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cor do texto</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={form.cor_texto}
                      onChange={e => campo('cor_texto', e.target.value)}
                      className="w-10 h-9 rounded border border-gray-200 cursor-pointer p-0.5" />
                    <input className="flex-1 border border-gray-200 rounded-lg px-2 py-2 text-xs font-mono focus:outline-none"
                      value={form.cor_texto} onChange={e => campo('cor_texto', e.target.value)} />
                  </div>
                </div>
              </div>
              {(form.logo_url || form.nome_fantasia || form.nome) && (
                <div className="rounded-xl p-4 flex items-center gap-3"
                     style={{ background: form.cor_primaria }}>
                  {form.logo_url && (
                    <img src={form.logo_url} alt="logo" className="h-8 object-contain"
                         onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                  )}
                  <span className="font-bold text-sm" style={{ color: form.cor_texto }}>
                    {form.nome_fantasia || form.nome || 'Preview'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Contato */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Contato</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                  value={form.telefone ?? ''} onChange={e => campo('telefone', e.target.value)} placeholder="(87) 99999-0000" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail de contato</label>
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                  value={form.email_contato ?? ''} onChange={e => campo('email_contato', e.target.value)} placeholder="contato@revenda-abc.com.br" />
              </div>
            </div>
          </div>

          {/* Financeiro */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Saldo inicial / Precos</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Saldo veicular (R$)</label>
                <input type="number" step="0.01" min="0"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                  value={form.saldo_veiculo} onChange={e => campo('saldo_veiculo', parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Saldo CPF/CNPJ (R$)</label>
                <input type="number" step="0.01" min="0"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                  value={form.saldo_cpf} onChange={e => campo('saldo_cpf', parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preco veicular cobrado (R$)</label>
                <input type="number" step="0.01" min="0"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                  value={form.preco_veiculo ?? ''} onChange={e => campo('preco_veiculo', e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder="Ex: 49,90" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preco CPF/CNPJ cobrado (R$)</label>
                <input type="number" step="0.01" min="0"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                  value={form.preco_cpf ?? ''} onChange={e => campo('preco_cpf', e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder="Ex: 39,90" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="ativo" checked={form.ativo}
              onChange={e => campo('ativo', e.target.checked)}
              className="w-4 h-4 accent-brand-green" />
            <label htmlFor="ativo" className="text-sm text-gray-700">Empresa ativa</label>
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t border-gray-100">
          <button onClick={onFechar}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button onClick={() => onSalvar(form)} disabled={salvando || !form.nome || !form.slug}
            className="flex-1 py-2.5 rounded-xl bg-brand-green text-white text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {inicial.id ? 'Salvar alteracoes' : 'Criar tenant'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Pagina principal ───────────────────────────────────────────────────────────
export default function TenantsAdminPage() {
  const [tenants, setTenants]     = useState<Tenant[]>([])
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState<Partial<Tenant> | null>(null)
  const [salvando, setSalvando]   = useState(false)
  const [expandido, setExpandido] = useState<string | null>(null)
  const [creditando, setCreditando] = useState<string | null>(null)
  const [credForm, setCredForm]   = useState({ produto: 'veiculo', valor: '' })

  async function carregar() {
    setLoading(true)
    const res = await fetch('/api/admin/tenants')
    if (res.ok) setTenants(await res.json())
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  async function salvar(dados: any) {
    setSalvando(true)
    const isEdicao = !!dados.id
    const url    = isEdicao ? `/api/admin/tenants/${dados.id}` : '/api/admin/tenants'
    const method = isEdicao ? 'PATCH' : 'POST'
    const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados) })
    setSalvando(false)
    if (res.ok) { setModal(null); carregar() }
    else { const d = await res.json(); alert(d.erro ?? 'Erro ao salvar') }
  }

  async function desativar(id: string) {
    if (!confirm('Desativar este tenant?')) return
    await fetch(`/api/admin/tenants/${id}`, { method: 'DELETE' })
    carregar()
  }

  async function creditar(id: string) {
    if (!credForm.valor) return
    const res = await fetch(`/api/admin/tenants/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ produto: credForm.produto, valor: parseFloat(credForm.valor) }),
    })
    if (res.ok) { setCreditando(null); setCredForm({ produto: 'veiculo', valor: '' }); carregar() }
    else { const d = await res.json(); alert(d.erro ?? 'Erro ao creditar') }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 text-brand-green animate-spin" />
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Empresas Clientes</h1>
          <p className="text-sm text-gray-500 mt-0.5">{tenants.length} empresas cadastradas</p>
        </div>
        <button onClick={() => setModal({})}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-green text-white rounded-xl text-sm font-bold hover:opacity-90 transition-all">
          <Plus className="w-4 h-4" /> Nova Empresa
        </button>
      </div>

      {tenants.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
          <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nenhuma empresa cadastrada ainda.</p>
          <button onClick={() => setModal({})}
            className="mt-4 text-sm text-brand-green font-semibold hover:underline">
            Criar a primeira empresa
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {tenants.map(t => (
            <div key={t.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-4 p-5">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
                     style={{ background: t.cor_primaria }}>
                  {t.logo_url
                    ? <img src={t.logo_url} alt={t.nome} className="w-9 h-9 object-contain"
                           onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                    : <Building2 className="w-6 h-6" style={{ color: t.cor_texto }} />
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-gray-900">{t.nome_fantasia ?? t.nome}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${t.ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {t.ativo ? 'ATIVO' : 'INATIVO'}
                    </span>
                    <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{t.slug}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {t.dominio && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Globe className="w-3 h-3" />{t.dominio}
                      </span>
                    )}
                    {t.email_contato && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Mail className="w-3 h-3" />{t.email_contato}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">desde {fmtData(t.criado_em)}</span>
                  </div>
                </div>

                <div className="hidden md:flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">Veicular</p>
                    <p className="font-bold text-brand-green text-sm">{moeda(t.saldo_veiculo)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">CPF/CNPJ</p>
                    <p className="font-bold text-brand-blue text-sm">{moeda(t.saldo_cpf)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setModal(t)}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors" title="Editar">
                    <Pencil className="w-4 h-4 text-gray-500" />
                  </button>
                  <button onClick={() => setCreditando(creditando === t.id ? null : t.id)}
                    className="p-2 rounded-lg hover:bg-emerald-50 transition-colors" title="Adicionar saldo">
                    <Wallet className="w-4 h-4 text-brand-green" />
                  </button>
                  <button onClick={() => setExpandido(expandido === t.id ? null : t.id)}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                    {expandido === t.id
                      ? <ChevronUp className="w-4 h-4 text-gray-400" />
                      : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </button>
                </div>
              </div>

              {creditando === t.id && (
                <div className="px-5 pb-4 pt-2 bg-emerald-50 border-t border-emerald-100">
                  <p className="text-xs font-bold text-emerald-700 mb-3">Adicionar saldo</p>
                  <div className="flex items-end gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Produto</label>
                      <select value={credForm.produto} onChange={e => setCredForm(p => ({ ...p, produto: e.target.value }))}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
                        <option value="veiculo">Veicular</option>
                        <option value="cpf">CPF/CNPJ</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-600 mb-1">Valor (R$)</label>
                      <input type="number" step="0.01" min="0"
                        value={credForm.valor} onChange={e => setCredForm(p => ({ ...p, valor: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                        placeholder="500,00" />
                    </div>
                    <button onClick={() => creditar(t.id)}
                      className="px-4 py-2 bg-brand-green text-white rounded-lg text-sm font-semibold hover:opacity-90">
                      Creditar
                    </button>
                    <button onClick={() => setCreditando(null)} className="p-2 rounded-lg hover:bg-gray-100">
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </div>
              )}

              {expandido === t.id && (
                <div className="px-5 pb-5 pt-2 bg-gray-50 border-t border-gray-100">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Preco veicular</p>
                      <p className="font-semibold text-sm text-gray-800">{t.preco_veiculo ? moeda(t.preco_veiculo) : '— padrao sistema'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Preco CPF/CNPJ</p>
                      <p className="font-semibold text-sm text-gray-800">{t.preco_cpf ? moeda(t.preco_cpf) : '— padrao sistema'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Cores</p>
                      <div className="flex gap-1.5">
                        <div className="w-5 h-5 rounded" style={{ background: t.cor_primaria }} title={t.cor_primaria} />
                        <div className="w-5 h-5 rounded" style={{ background: t.cor_secundaria }} title={t.cor_secundaria} />
                        <div className="w-5 h-5 rounded border border-gray-200" style={{ background: t.cor_texto }} title={t.cor_texto} />
                      </div>
                    </div>
                    <div className="flex items-end">
                      <button onClick={() => desativar(t.id)}
                        className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1 hover:underline">
                        <XCircle className="w-3.5 h-3.5" />
                        {t.ativo ? 'Desativar' : 'Ja inativo'}
                      </button>
                    </div>
                  </div>
                  {t.dominio && (
                    <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700">
                      <p className="font-bold mb-1">Instrucoes DNS para o cliente:</p>
                      <p>Aponte <span className="font-mono font-bold">{t.dominio}</span> com CNAME para <span className="font-mono font-bold">fichaauto.com.br</span></p>
                      <p className="mt-0.5 text-blue-500">SSL gerado automaticamente pelo Traefik.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modal !== null && (
        <ModalTenant
          inicial={modal}
          onSalvar={salvar}
          onFechar={() => setModal(null)}
          salvando={salvando}
        />
      )}
    </div>
  )
}
