import { Menu, Sparkles } from 'lucide-react'
import NotificationBell from '../NotificationBell'

interface MobileHeaderProps {
  onMenuClick: () => void
}

export default function MobileHeader({ onMenuClick }: MobileHeaderProps) {
  return (
    <header className="lg:hidden fixed top-0 left-0 right-0 h-14 glass-strong border-b border-white/10 flex items-center justify-between px-4 z-40">
      <button
        onClick={onMenuClick}
        className="p-2 -ml-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"
      >
        <Menu className="w-6 h-6" />
      </button>

      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <span className="text-sm font-bold text-text-primary">
          Tattoo<span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">Track</span>
        </span>
      </div>

      <NotificationBell />
    </header>
  )
}
