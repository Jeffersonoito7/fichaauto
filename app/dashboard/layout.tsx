'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Search, History, Wallet, BarChart3,
  Users, LogOut, Menu, X, ChevronDown, Home, Shield, Package, Layers
} from 'lucide-react'
import { LogoHorizontal, LogoIcon } from '@/components/LogoFichaAuto'

const navItems = [
  { href: '/dashboard',                 icon: Home,      label: 'Home'          },
  { href: '/dashboard/consultar',       icon: Search,    label: 'Nova Consulta' },
  { href: '/dashboard/historico',       icon: History,   label: 'Histórico'     },
  { href: '/dashboard/associacoes',     icon: Shield,    label: 'Associações'   },
  { href: '/dashboard/carteira',        icon: Wallet,    label: 'Carteira'      },
]

const adminItems = [
  { href: '/dashboard/admin',           icon: BarChart3, label: 'Dashboard Admin'  },
  { href: '/dashboard/admin/planos',    icon: Layers,    label: 'Planos / Produtos' },
  { href: '/dashboard/admin/pacotes',   icon: Package,   label: 'Pacotes'           },
  { href: '/dashboard/admin/usuarios',  icon: Users,     label: 'Usuários'          },
  { href: '/dashboard/admin/tenants',   icon: Shield,    label: 'Tenants / Módulos' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  function NavLink({ href, icon: Icon, label }: { href: string; icon: any; label: string }) {
    const active = href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname === href || pathname.startsWith(href + '/')
    return (
      <Link
        href={href}
        onClick={() => setSidebarOpen(false)}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
          active
            ? 'bg-brand-green text-white shadow-green'
            : 'text-brand-gray hover:bg-brand-gray-light hover:text-brand-dark'
        }`}
      >
        <Icon className="w-4 h-4 shrink-0" />
        {label}
      </Link>
    )
  }

  const Sidebar = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-5 border-b border-brand-border">
        <Link href="/dashboard/consultar" className="flex items-center">
          <LogoHorizontal height={32} />
        </Link>
      </div>

      {/* Saldo rápido */}
      <div className="mx-4 mt-4 p-3 bg-brand-green-light rounded-xl border border-brand-green/20">
        <p className="text-xs text-brand-gray mb-0.5">Consultas disponíveis</p>
        <div className="flex items-center justify-between">
          <span className="text-xl font-bold text-brand-green">7</span>
          <Link href="/dashboard/carteira" className="text-xs text-brand-blue font-medium hover:underline">
            Recarregar
          </Link>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(item => <NavLink key={item.href} {...item} />)}

        <div className="pt-4 pb-1">
          <p className="text-xs font-semibold text-brand-gray px-3 mb-2 uppercase tracking-wider">Admin</p>
          {adminItems.map(item => <NavLink key={item.href} {...item} />)}
        </div>
      </nav>

      {/* User */}
      <div className="p-4 border-t border-brand-border">
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-brand-gray-light cursor-pointer transition-colors">
          <div className="w-8 h-8 rounded-full gradient-hero flex items-center justify-center text-white text-xs font-bold shrink-0">
            JS
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-brand-dark truncate">Jefferson Soares</p>
            <p className="text-xs text-brand-gray truncate">Plano Mensal</p>
          </div>
          <ChevronDown className="w-4 h-4 text-brand-gray shrink-0" />
        </div>
        <button
          onClick={async () => {
            await fetch('/api/auth/logout', { method: 'POST' })
            window.location.href = '/login'
          }}
          className="flex items-center gap-2 px-3 py-2 mt-1 text-sm text-brand-gray hover:text-brand-danger rounded-lg hover:bg-red-50 transition-colors w-full"
        >
          <LogOut className="w-4 h-4" /> Sair
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-brand-off-white flex">

      {/* Sidebar desktop */}
      <aside className="hidden lg:flex flex-col w-60 bg-white border-r border-brand-border shrink-0 fixed h-full z-30">
        <Sidebar />
      </aside>

      {/* Sidebar mobile overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-64 bg-white h-full z-50 shadow-2xl">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-brand-gray-light transition-colors"
            >
              <X className="w-4 h-4 text-brand-gray" />
            </button>
            <Sidebar />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 lg:ml-60 flex flex-col min-h-screen">

        {/* Topbar mobile */}
        <header className="lg:hidden bg-white border-b border-brand-border px-4 h-14 flex items-center justify-between sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-brand-gray-light transition-colors">
            <Menu className="w-5 h-5 text-brand-dark" />
          </button>
          <div className="flex items-center gap-1.5">
            <LogoHorizontal height={28} />
          </div>
          <Link href="/dashboard/carteira" className="text-xs font-semibold text-brand-green bg-brand-green-light px-2.5 py-1 rounded-full">
            7 consultas
          </Link>
        </header>

        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
