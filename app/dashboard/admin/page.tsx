import { Users, Search, UserCheck, UserX, ChevronRight } from 'lucide-react'
import { createServiceRoleClient } from '@/lib/supabase-server'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  let total = 0, ativos = 0, aguardando = 0, totalConsultas = 0

  try {
    const svc = createServiceRoleClient() as any

    const { data: perfis } = await svc.from('perfis').select('ativo')
    total      = perfis?.length ?? 0
    ativos     = perfis?.filter((p: any) =>  p.ativo).length ?? 0
    aguardando = perfis?.filter((p: any) => !p.ativo).length ?? 0

    const { count } = await svc.from('consultas').select('id', { count: 'exact', head: true })
    totalConsultas = count ?? 0
  } catch {
    // Supabase indisponível ou chave não configurada — exibe zeros
  }

  const stats = [
    { label: 'Total de usuários',   value: String(total),                 icon: Users,     color: 'bg-brand-blue-light text-brand-blue' },
    { label: 'Usuários ativos',     value: String(ativos),                icon: UserCheck, color: 'bg-brand-green-light text-brand-green' },
    { label: 'Aguardando aprovação',value: String(aguardando),            icon: UserX,     color: 'bg-orange-50 text-orange-600' },
    { label: 'Total de consultas',  value: String(totalConsultas ?? 0),   icon: Search,    color: 'bg-purple-50 text-purple-600' },
  ]

  const atalhos = [
    { label: 'Gerenciar usuários', href: '/dashboard/admin/usuarios',   desc: 'Aprovar, editar e controlar acessos' },
    { label: 'Pacotes de crédito', href: '/dashboard/admin/pacotes',    desc: 'Configurar planos e preços'           },
    { label: 'Planos / Módulos',   href: '/dashboard/admin/tenants',    desc: 'Definir módulos por plano'            },
    { label: 'Histórico geral',    href: '/dashboard/historico',        desc: 'Ver todas as consultas realizadas'    },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-dark mb-1">Dashboard Admin</h1>
        <p className="text-brand-gray text-sm">Visão geral da plataforma</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map(s => (
          <div key={s.label} className="card p-5">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs text-brand-gray">{s.label}</p>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.color}`}>
                <s.icon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-brand-dark">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {atalhos.map(a => (
          <Link key={a.href} href={a.href}
            className="card p-5 flex items-center justify-between hover:border-brand-green/40 transition-colors group">
            <div>
              <p className="font-semibold text-brand-dark group-hover:text-brand-green transition-colors">{a.label}</p>
              <p className="text-xs text-brand-gray mt-0.5">{a.desc}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-brand-gray group-hover:text-brand-green transition-colors shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  )
}
