import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, Users, Calendar, DollarSign, Package, Tag, Settings, LogOut, Bug, Shield, X } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import ReportBugModal from '../ReportBugModal'
import NotificationBell from '../NotificationBell'

const navigation = [
  { name: 'Dashboard', href: '/app', icon: LayoutDashboard },
  { name: 'Clientes', href: '/app/clients', icon: Users },
  { name: 'Agendamentos', href: '/app/appointments', icon: Calendar },
  { name: 'Financeiro', href: '/app/finances', icon: DollarSign },
  { name: 'Estoque', href: '/app/inventory', icon: Package },
  { name: 'Tags', href: '/app/tags', icon: Tag },
  { name: 'Configurações', href: '/app/settings', icon: Settings },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuth()
  const [showReportModal, setShowReportModal] = useState(false)
  const location = useLocation()

  // Close sidebar on route change (mobile)
  useEffect(() => {
    onClose()
  }, [location.pathname])

  // Close sidebar on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  return (
    <>
      {/* Overlay for mobile */}
      <div
        className={`lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen w-64 glass-strong border-r border-white/10 flex flex-col z-50 transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h1 className="text-xl font-bold text-text-primary tracking-tight">
            Tattoo<span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">Track</span>
          </h1>
          <div className="flex items-center gap-2">
            <div className="hidden lg:block">
              <NotificationBell />
            </div>
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-1">
            {navigation.map((item) => (
              <li key={item.name}>
                <NavLink
                  to={item.href}
                  end={item.href === '/app'}
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

          {/* Admin link */}
          {user?.isAdmin && (
            <NavLink
              to="/app/admin/reports"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 mb-2 ${
                  isActive
                    ? 'bg-violet-500/20 text-violet-400'
                    : 'text-text-secondary hover:text-violet-400 hover:bg-violet-500/10'
                }`
              }
            >
              <Shield className="w-5 h-5" />
              Admin Reports
            </NavLink>
          )}

          {/* Report bug button */}
          <button
            onClick={() => setShowReportModal(true)}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:text-amber-400 hover:bg-amber-500/10 transition-all duration-200 mb-2"
          >
            <Bug className="w-5 h-5" />
            Reportar Problema
          </button>

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

        {/* Report Bug Modal */}
        <ReportBugModal isOpen={showReportModal} onClose={() => setShowReportModal(false)} />
      </aside>
    </>
  )
}
