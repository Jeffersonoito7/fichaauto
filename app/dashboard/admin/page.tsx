import { Users, Search, TrendingUp, DollarSign, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react'

const stats = [
  { label: 'Usuários ativos',    value: '47',       delta: '+8 este mês',   up: true,  icon: Users,       color: 'bg-brand-blue-light text-brand-blue' },
  { label: 'Consultas no mês',   value: '312',      delta: '+23% vs mês ant',up: true, icon: Search,      color: 'bg-brand-green-light text-brand-green' },
  { label: 'Receita do mês',     value: 'R$ 6.284', delta: '+R$ 1.420',     up: true,  icon: DollarSign,  color: 'bg-purple-50 text-purple-600' },
  { label: 'Custo API',          value: 'R$ 1.872', delta: '-R$ 210',       up: false, icon: TrendingUp,  color: 'bg-orange-50 text-orange-600' },
]

const ultimas = [
  { placa: 'PKG5A23', usuario: 'Jefferson Soares', data: '06/05/2026 14:33', score: 72,  plano: 'Mensal' },
  { placa: 'ABC1D23', usuario: 'Maria Silva',      data: '06/05/2026 11:20', score: 91,  plano: 'Mensal' },
  { placa: 'XYZ9B87', usuario: 'Carlos Pereira',  data: '05/05/2026 18:45', score: 55,  plano: 'Avulso' },
  { placa: 'DEF4G56', usuario: 'Ana Rodrigues',   data: '05/05/2026 16:10', score: 88,  plano: 'Mensal' },
  { placa: 'GHI7J89', usuario: 'Pedro Santos',    data: '05/05/2026 09:33', score: 43,  plano: 'Avulso' },
]

const topUsuarios = [
  { nome: 'Carlos Pereira', consultas: 28, plano: 'Mensal', gasto: 'R$ 297' },
  { nome: 'Maria Silva',    consultas: 22, plano: 'Mensal', gasto: 'R$ 297' },
  { nome: 'Jefferson S.',   consultas: 18, plano: 'Mensal', gasto: 'R$ 297' },
  { nome: 'Ana Rodrigues',  consultas: 15, plano: 'Mensal', gasto: 'R$ 297' },
  { nome: 'Pedro Santos',   consultas: 12, plano: 'Avulso', gasto: 'R$ 479' },
]

export default function AdminPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-dark mb-1">Dashboard Admin</h1>
        <p className="text-brand-gray text-sm">Visão geral da plataforma · Maio 2026</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map(s => (
          <div key={s.label} className="card p-5">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs text-brand-gray">{s.label}</p>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.color}`}>
                <s.icon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-brand-dark">{s.value}</p>
            <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${s.up ? 'text-brand-green' : 'text-brand-danger'}`}>
              {s.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {s.delta}
            </div>
          </div>
        ))}
      </div>

      {/* Margem do mês */}
      <div className="card p-5 mb-6 gradient-brand text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/60 text-sm">Margem bruta do mês</p>
            <p className="text-3xl font-extrabold mt-1">R$ 4.412</p>
            <p className="text-white/60 text-sm mt-1">70,2% de margem</p>
          </div>
          <div className="text-right">
            <Activity className="w-12 h-12 text-white/20" />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t border-white/20 text-sm">
          <div>
            <p className="text-white/60 text-xs">Receita</p>
            <p className="font-bold">R$ 6.284</p>
          </div>
          <div>
            <p className="text-white/60 text-xs">Custo API</p>
            <p className="font-bold">R$ 1.872</p>
          </div>
          <div>
            <p className="text-white/60 text-xs">Lucro</p>
            <p className="font-bold text-brand-green">R$ 4.412</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Últimas consultas */}
        <div className="card p-6">
          <h2 className="font-semibold text-brand-dark mb-4">Últimas consultas</h2>
          <div className="space-y-3">
            {ultimas.map((c, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-brand-blue-light rounded-lg flex items-center justify-center">
                    <span className="text-xs font-bold text-brand-blue font-mono">{c.placa.slice(0,3)}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-brand-dark font-mono">{c.placa}</p>
                    <p className="text-xs text-brand-gray">{c.usuario}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${c.score >= 80 ? 'text-brand-green' : c.score >= 60 ? 'text-brand-warning' : 'text-brand-danger'}`}>
                    {c.score}
                  </p>
                  <span className={`text-xs ${c.plano === 'Mensal' ? 'badge-info' : 'badge-ok'}`}>{c.plano}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top usuários */}
        <div className="card p-6">
          <h2 className="font-semibold text-brand-dark mb-4">Top usuários do mês</h2>
          <div className="space-y-3">
            {topUsuarios.map((u, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full gradient-hero flex items-center justify-center text-white text-xs font-bold">
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-brand-dark">{u.nome}</p>
                    <p className="text-xs text-brand-gray">{u.consultas} consultas</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-brand-dark">{u.gasto}</p>
                  <span className={`text-xs ${u.plano === 'Mensal' ? 'badge-info' : 'badge-ok'}`}>{u.plano}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
