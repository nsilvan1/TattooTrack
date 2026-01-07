import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, Calendar, DollarSign, Tag, Settings, LogOut } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Clientes', href: '/clients', icon: Users },
  { name: 'Agendamentos', href: '/appointments', icon: Calendar },
  { name: 'Financeiro', href: '/finances', icon: DollarSign },
  { name: 'Tags', href: '/tags', icon: Tag },
  { name: 'Configuracoes', href: '/settings', icon: Settings },
]

export default function Sidebar() {
  const { user, logout } = useAuth()

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 glass-strong border-r border-white/10 flex flex-col">
      <div className="p-6 border-b border-white/10">
        <h1 className="text-xl font-bold text-text-primary tracking-tight">
          Tattoo<span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">Track</span>
        </h1>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navigation.map((item) => (
            <li key={item.name}>
              <NavLink
                to={item.href}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-violet-500/20 to-cyan-500/20 text-white'
                      : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t border-white/10">
        {/* User info */}
        {user && (
          <div className="flex items-center gap-3 px-2 mb-3">
            {user.picture ? (
              <img
                src={user.picture}
                alt={user.name}
                className="w-9 h-9 rounded-full object-cover ring-2 ring-violet-500/30"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-violet-500/20 flex items-center justify-center">
                <span className="text-sm font-medium text-violet-400">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">{user.name}</p>
              <p className="text-xs text-text-secondary truncate">@{user.username}</p>
            </div>
          </div>
        )}

        {/* Logout button */}
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
          Sair
        </button>

        <div className="mt-3 px-4 py-2 rounded-lg bg-white/5">
          <p className="text-xs text-text-secondary">Versão 1.0.0</p>
        </div>
      </div>
    </aside>
  )
}
