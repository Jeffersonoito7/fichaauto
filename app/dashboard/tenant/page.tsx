'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2, Users, Search, TrendingUp, Wallet,
  Car, User, ChevronRight, Loader2, RefreshCw,
  Crown, BarChart3, AlertCircle, Eye, EyeOff,
  Plus, Pencil, X, Save, Shield, FileText, CreditCard
} from 'lucide-react'

interface TenantStats {
  totalUsuarios:  number
  consultasMes:   number
  totalConsultas: number
  gastoMes:       number
}

interface Tenant {
  id: string; slug: string; nome: string; nome_fantasia: string | null
  logo_url: string | null; cor_primaria: string; saldo_veiculo: number
  saldo_cpf: number; preco_veiculo: number | null; preco_cpf: number | null
  email_contato: string | null; telefone: string | null
}

interface Consulta {
  id: string; email: string; tipo: string; documento: string
  descricao: string; status: string; custo: string; created_at: string
}

interface Usuario {
  id: string; nome: string | null; email: string
  saldo_veiculo: string; saldo_cpf: string
  tenant_role: string; created_at: string
  pode_placa: boolean; pode_cpf: boolean; pode_cnpj: boolean
  pode_lote: boolean; pode_credito: boolean; ativo: boolean
}

const PERMISSOES = [
  { key: 'pode_placa',   label: 'Consulta Veicular',  icon: Car },
  { key: 'pode_cpf',     label: 'Consulta CPF',        icon: User },
  { key: 'pode_cnpj',    label: 'Consulta CNPJ',       icon: Building2 },
  { key: 'pode_lote',    label: 'Consulta em Lote',    icon: FileText },
  { key: 'pode_credito', label: 'Analise de Credito',  icon: CreditCard },
] as const

function fmt(val: number) {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function fmtData(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

const formVazio = {
  nome: '', email: '', senha: '', tenant_role: 'user',
  pode_placa: false, pode_cpf: false, pode_cnpj: false, pode_lote: false, pode_credito: false,
}

export default function TenantPage() {
  const router = useRouter()
  const [tenant,    setTenant]    = useState<Tenant | null>(null)
  const [stats,     setStats]     = useState<TenantStats | null>(null)
  const [consultas, setConsultas] = useState<Consulta[]>([])
  const [usuarios,  setUsuarios]  = useState<Usuario[]>([])
  const [aba,       setAba]       = useState<'consultas' | 'usuarios'>('consultas')
  const [loading,   setLoading]   = useState(true)
  const [saldoVis,  setSaldoVis]  = useState(true)
  const [modalUser, setModalUser] = useState<Usuario | 'novo' | null>(null)
  const [form,      setForm]      = useState<typeof formVazio>(formVazio)
  const [salvando,  setSalvando]  = useState(false)
  const [erroModal, setErroModal] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/tenant/me').then(r => r.json()),
      fetch('/api/tenant/consultas').then(r => r.json()),
      fetch('/api/tenant/usuarios').then(r => r.json()),
    ]).then(([me, c, u]) => {
      if (me.erro) { router.push('/dashboard'); return }
      setTenant(me.tenant)
      setStats(me.stats)
      setConsultas(c.consultas ?? [])
      setUsuarios(Array.isArray(u) ? u : [])
      setLoading(false)
    }).catch(() => { setLoading(false); router.push('/dashboard') })
  }, [router])

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin text-brand-green" />
    </div>
  )
  if (!tenant || !stats) return null

  const saldoTotal = (parseFloat(String(tenant.saldo_veiculo)) + parseFloat(String(tenant.saldo_cpf)))

  function abrirNovo() {
    setForm(formVazio)
    setErroModal('')
    setModalUser('novo')
  }

  function abrirEditar(u: Usuario) {
    setForm({
      nome: u.nome ?? '', email: u.email, senha: '', tenant_role: u.tenant_role,
      pode_placa: u.pode_placa, pode_cpf: u.pode_cpf, pode_cnpj: u.pode_cnpj,
      pode_lote: u.pode_lote, pode_credito: u.pode_credito,
    })
    setErroModal('')
    setModalUser(u)
  }

  async function salvarUsuario() {
    setErroModal('')
    setSalvando(true)
    try {
      if (modalUser === 'novo') {
        const res = await fetch('/api/tenant/usuarios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        const d = await res.json()
        if (!res.ok) { setErroModal(d.erro ?? 'Erro ao criar'); setSalvando(false); return }
      } else {
        const res = await fetch('/api/tenant/usuarios', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usuario_id: (modalUser as Usuario).id, ...form }),
        })
        const d = await res.json()
        if (!res.ok) { setErroModal(d.erro ?? 'Erro ao salvar'); setSalvando(false); return }
      }
      const u = await fetch('/api/tenant/usuarios').then(r => r.json())
      setUsuarios(Array.isArray(u) ? u : [])
      setModalUser(null)
    } catch { setErroModal('Erro de conexao') }
    setSalvando(false)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Crown className="w-5 h-5 text-amber-500" />
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Painel da Revenda</span>
          </div>
          <h1 className="text-2xl font-bold text-brand-dark">{tenant.nome_fantasia ?? tenant.nome}</h1>
          <p className="text-brand-gray text-sm">@{tenant.slug}</p>
        </div>
        <button
          onClick={() => router.push('/dashboard/tenant/recarga')}
          className="flex items-center gap-2 bg-brand-green text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-brand-green/90 transition-colors"
        >
          <Wallet className="w-4 h-4" />
          Solicitar Recarga
        </button>
      </div>

      {/* Cards de saldo e stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Saldo veicular */}
        <div className="bg-white rounded-2xl p-4 border border-brand-border">
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-brand-green-light flex items-center justify-center">
              <Car className="w-4 h-4 text-brand-green" />
            </div>
            <button onClick={() => setSaldoVis(v => !v)} className="text-brand-gray hover:text-brand-dark">
              {saldoVis ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>
          </div>
          <p className="text-xs text-brand-gray mb-0.5">Saldo Veicular</p>
          <p className="text-xl font-bold text-brand-dark">
            {saldoVis ? fmt(parseFloat(String(tenant.saldo_veiculo))) : '••••'}
          </p>
          {tenant.preco_veiculo && (
            <p className="text-xs text-brand-gray mt-1">R$ {tenant.preco_veiculo}/consulta</p>
          )}
        </div>

        {/* Saldo CPF */}
        <div className="bg-white rounded-2xl p-4 border border-brand-border">
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <User className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <p className="text-xs text-brand-gray mb-0.5">Saldo CPF/SPC</p>
          <p className="text-xl font-bold text-brand-dark">
            {saldoVis ? fmt(parseFloat(String(tenant.saldo_cpf))) : '••••'}
          </p>
          {tenant.preco_cpf && (
            <p className="text-xs text-brand-gray mt-1">R$ {tenant.preco_cpf}/consulta</p>
          )}
        </div>

        {/* Consultas no mes */}
        <div className="bg-white rounded-2xl p-4 border border-brand-border">
          <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center mb-3">
            <BarChart3 className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-xs text-brand-gray mb-0.5">Consultas este mês</p>
          <p className="text-xl font-bold text-brand-dark">{stats.consultasMes.toLocaleString('pt-BR')}</p>
          <p className="text-xs text-brand-gray mt-1">{stats.totalConsultas} no total</p>
        </div>

        {/* Usuarios */}
        <div className="bg-white rounded-2xl p-4 border border-brand-border">
          <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center mb-3">
            <Users className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xs text-brand-gray mb-0.5">Usuários ativos</p>
          <p className="text-xl font-bold text-brand-dark">{stats.totalUsuarios}</p>
          <p className="text-xs text-brand-gray mt-1">
            {fmt(stats.gastoMes)} gasto este mês
          </p>
        </div>
      </div>

      {/* Alerta saldo baixo */}
      {saldoTotal < 20 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">Saldo baixo</p>
            <p className="text-xs text-amber-600">Seu saldo total e de {fmt(saldoTotal)}. Solicite uma recarga para continuar consultando.</p>
          </div>
          <button
            onClick={() => router.push('/dashboard/tenant/recarga')}
            className="text-xs font-semibold text-amber-700 bg-amber-100 px-3 py-1.5 rounded-lg hover:bg-amber-200 transition-colors"
          >
            Recarregar
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-brand-border overflow-hidden">
        <div className="flex border-b border-brand-border">
          {([
            { key: 'consultas', label: 'Consultas',  icon: Search },
            { key: 'usuarios',  label: 'Usuários',   icon: Users  },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setAba(key)}
              className={`flex items-center gap-2 px-6 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                aba === key
                  ? 'border-brand-green text-brand-green'
                  : 'border-transparent text-brand-gray hover:text-brand-dark'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Consultas */}
        {aba === 'consultas' && (
          <div>
            {consultas.length === 0 ? (
              <div className="text-center py-16">
                <Search className="w-10 h-10 text-brand-gray/40 mx-auto mb-3" />
                <p className="text-brand-gray text-sm">Nenhuma consulta realizada ainda</p>
              </div>
            ) : (
              <div className="divide-y divide-brand-border">
                {consultas.map(c => (
                  <div key={c.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-brand-off-white transition-colors">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      c.tipo === 'veiculo' ? 'bg-brand-green-light' : 'bg-blue-50'
                    }`}>
                      {c.tipo === 'veiculo'
                        ? <Car  className="w-4 h-4 text-brand-green" />
                        : <User className="w-4 h-4 text-blue-600" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-brand-dark">{c.documento}</p>
                      <p className="text-xs text-brand-gray truncate">{c.descricao || c.email}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-brand-gray">{fmtData(c.created_at)}</p>
                      {parseFloat(c.custo ?? '0') > 0 && (
                        <p className="text-xs font-medium text-brand-danger">{fmt(parseFloat(c.custo))}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Usuarios */}
        {aba === 'usuarios' && (
          <div>
            <div className="flex items-center justify-between px-5 py-3 border-b border-brand-border">
              <p className="text-xs text-brand-gray">{usuarios.length} usuario(s)</p>
              <button
                onClick={abrirNovo}
                className="flex items-center gap-1.5 text-xs font-semibold text-white bg-brand-green px-3 py-1.5 rounded-lg hover:bg-brand-green/90 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Novo Usuario
              </button>
            </div>
            {usuarios.length === 0 ? (
              <div className="text-center py-16">
                <Users className="w-10 h-10 text-brand-gray/40 mx-auto mb-3" />
                <p className="text-brand-gray text-sm">Nenhum usuario cadastrado</p>
                <p className="text-xs text-brand-gray mt-1">Clique em "Novo Usuario" para adicionar</p>
              </div>
            ) : (
              <div className="divide-y divide-brand-border">
                {usuarios.map(u => (
                  <div key={u.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-brand-off-white transition-colors">
                    <div className="w-9 h-9 rounded-full bg-brand-green-light flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-brand-green">
                        {(u.nome || u.email).slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-brand-dark">{u.nome || '—'}</p>
                        {!u.ativo && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold">INATIVO</span>}
                      </div>
                      <p className="text-xs text-brand-gray truncate">{u.email}</p>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {u.pode_placa   && <span className="text-[9px] bg-brand-green-light text-brand-green px-1.5 py-0.5 rounded font-medium">Veiculo</span>}
                        {u.pode_cpf     && <span className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">CPF</span>}
                        {u.pode_cnpj    && <span className="text-[9px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded font-medium">CNPJ</span>}
                        {u.pode_credito && <span className="text-[9px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded font-medium">Credito</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        u.tenant_role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {u.tenant_role === 'admin' ? 'Admin' : 'Usuario'}
                      </span>
                      <button onClick={() => abrirEditar(u)} className="p-1.5 rounded-lg hover:bg-brand-gray-light transition-colors">
                        <Pencil className="w-3.5 h-3.5 text-brand-gray" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      {/* Modal criar/editar usuario */}
      {modalUser !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-brand-border">
              <h2 className="font-bold text-brand-dark">
                {modalUser === 'novo' ? 'Novo Usuario' : 'Editar Usuario'}
              </h2>
              <button onClick={() => setModalUser(null)} className="p-1.5 rounded-lg hover:bg-brand-gray-light transition-colors">
                <X className="w-4 h-4 text-brand-gray" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-brand-gray mb-1.5">Nome completo</label>
                <input className="input-base text-sm" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome do usuario" />
              </div>

              <div>
                <label className="block text-xs font-medium text-brand-gray mb-1.5">E-mail</label>
                <input
                  className="input-base text-sm"
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="email@empresa.com.br"
                  disabled={modalUser !== 'novo'}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-brand-gray mb-1.5">
                  {modalUser === 'novo' ? 'Senha' : 'Nova senha (deixe em branco para nao alterar)'}
                </label>
                <input
                  className="input-base text-sm"
                  type="password"
                  value={form.senha}
                  onChange={e => setForm(f => ({ ...f, senha: e.target.value }))}
                  placeholder="Minimo 6 caracteres"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-brand-gray mb-1.5">Perfil</label>
                <select className="input-base text-sm" value={form.tenant_role} onChange={e => setForm(f => ({ ...f, tenant_role: e.target.value }))}>
                  <option value="user">Usuario comum</option>
                  <option value="admin">Administrador da empresa</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-brand-gray mb-2">Permissoes de consulta</label>
                <div className="space-y-2">
                  {PERMISSOES.map(({ key, label, icon: Icon }) => (
                    <label key={key} className="flex items-center justify-between gap-3 cursor-pointer p-2.5 rounded-xl border border-brand-border hover:bg-brand-gray-light transition-colors">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-brand-gray" />
                        <span className="text-sm font-medium text-brand-dark">{label}</span>
                      </div>
                      <div
                        onClick={() => setForm(f => ({ ...f, [key]: !f[key as keyof typeof f] }))}
                        className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${form[key as keyof typeof form] ? 'bg-brand-green' : 'bg-gray-300'}`}
                      >
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form[key as keyof typeof form] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {erroModal && <p className="text-xs text-brand-danger bg-red-50 px-3 py-2 rounded-xl">{erroModal}</p>}
            </div>

            <div className="flex gap-3 p-5 border-t border-brand-border">
              <button onClick={() => setModalUser(null)} className="flex-1 h-10 rounded-xl border border-brand-border text-brand-gray text-sm hover:bg-brand-gray-light transition-colors">
                Cancelar
              </button>
              <button onClick={salvarUsuario} disabled={salvando} className="flex-1 btn-primary h-10 flex items-center justify-center gap-2 disabled:opacity-40">
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
