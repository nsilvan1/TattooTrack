import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, Check, CheckCheck, Trash2, Info, CheckCircle2, AlertTriangle, MessageSquare } from 'lucide-react'
import { notificationsApi } from '../services/api'
import type { Notification, NotificationType } from '../types'

const TYPE_CONFIG: Record<NotificationType, { icon: React.ReactNode; color: string }> = {
  info: { icon: <Info className="w-4 h-4" />, color: '#3b82f6' },
  success: { icon: <CheckCircle2 className="w-4 h-4" />, color: '#22c55e' },
  warning: { icon: <AlertTriangle className="w-4 h-4" />, color: '#eab308' },
  report: { icon: <MessageSquare className="w-4 h-4" />, color: '#8b5cf6' },
}

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()

  // Buscar contagem de não lidas
  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: notificationsApi.getUnreadCount,
    refetchInterval: 30000,
  })

  // Buscar notificações quando abrir o dropdown
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.list,
    enabled: isOpen,
  })

  // Marcar como lida
  const markAsReadMutation = useMutation({
    mutationFn: notificationsApi.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] })
    },
  })

  // Marcar todas como lidas
  const markAllAsReadMutation = useMutation({
    mutationFn: notificationsApi.markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] })
    },
  })

  // Deletar notificação
  const deleteMutation = useMutation({
    mutationFn: notificationsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] })
    },
  })

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Atualizar posição do dropdown
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + 8,
        left: rect.left,
      })
    }
  }, [isOpen])

  const formatDate = (date: string) => {
    const now = new Date()
    const notifDate = new Date(date)
    const diffMs = now.getTime() - notifDate.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Agora'
    if (diffMins < 60) return `${diffMins}min`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays < 7) return `${diffDays}d`
    return notifDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  }

  const unreadCount = unreadData?.count || 0

  const dropdownContent = (
    <div
      ref={dropdownRef}
      className="fixed w-80 bg-[#1a1f35] border border-white/10 rounded-xl shadow-2xl z-[200] overflow-hidden"
      style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <h3 className="font-semibold text-text-primary">Notificacoes</h3>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllAsReadMutation.mutate()}
            className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Marcar todas
          </button>
        )}
      </div>

      {/* List */}
      <div className="max-h-80 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-8 text-center">
            <Bell className="w-8 h-8 text-text-secondary mx-auto mb-2 opacity-50" />
            <p className="text-sm text-text-secondary">Nenhuma notificacao</p>
          </div>
        ) : (
          notifications.map((notification: Notification) => {
            const typeConfig = TYPE_CONFIG[notification.type] || TYPE_CONFIG.info

            return (
              <div
                key={notification.id}
                className={`px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors ${
                  !notification.read ? 'bg-violet-500/5' : ''
                }`}
              >
                <div className="flex gap-3">
                  <div
                    className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${typeConfig.color}20`, color: typeConfig.color }}
                  >
                    {typeConfig.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className={`text-sm font-medium truncate ${!notification.read ? 'text-text-primary' : 'text-text-secondary'}`}>
                        {notification.title}
                      </h4>
                      <span className="text-xs text-text-secondary flex-shrink-0">
                        {formatDate(notification.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">
                      {notification.message}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      {!notification.read && (
                        <button
                          onClick={() => markAsReadMutation.mutate(notification.id)}
                          className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          Marcar como lida
                        </button>
                      )}
                      <button
                        onClick={() => deleteMutation.mutate(notification.id)}
                        className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 ml-auto"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )

  return (
    <>
      {/* Bell Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-xs font-bold bg-red-500 text-white rounded-full px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown via Portal */}
      {isOpen && createPortal(dropdownContent, document.body)}
    </>
  )
}
