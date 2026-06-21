'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2, Users, Search, TrendingUp, Wallet,
  Car, User, ChevronRight, Loader2, RefreshCw,
  Crown, BarChart3, AlertCircle, Eye, EyeOff
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
  id: string; nome: string; email: string
  saldo_veiculo: string; saldo_cpf: string
  tenant_role: string; created_at: string
}

function fmt(val: number) {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function fmtData(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
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
            {usuarios.length === 0 ? (
              <div className="text-center py-16">
                <Users className="w-10 h-10 text-brand-gray/40 mx-auto mb-3" />
                <p className="text-brand-gray text-sm">Nenhum usuário vinculado ainda</p>
                <p className="text-xs text-brand-gray mt-1">Entre em contato com o suporte para vincular usuarios</p>
              </div>
            ) : (
              <div className="divide-y divide-brand-border">
                {usuarios.map(u => (
                  <div key={u.id} className="flex items-center gap-4 px-5 py-3.5">
                    <div className="w-9 h-9 rounded-full bg-brand-green-light flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-brand-green">
                        {(u.nome || u.email).slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-brand-dark">{u.nome || '—'}</p>
                      <p className="text-xs text-brand-gray truncate">{u.email}</p>
                    </div>
                    <div className="text-right shrink-0 space-y-0.5">
                      <p className="text-xs font-medium text-brand-green">{fmt(parseFloat(u.saldo_veiculo ?? '0'))}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        u.tenant_role === 'admin'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {u.tenant_role === 'admin' ? 'Admin' : 'Usuario'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
