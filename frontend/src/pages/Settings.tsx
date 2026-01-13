import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, Button, Input, Modal } from '../components/ui'
import {
  Settings as SettingsIcon,
  Info,
  Calendar,
  CheckCircle,
  XCircle,
  Loader2,
  ExternalLink,
  RefreshCw,
  User,
  Lock,
  LogOut,
  Users,
  Palette,
  Bell,
  Shield,
  Save,
  Edit,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import { clientsApi } from '../services/api'

export default function Settings() {
  const queryClient = useQueryClient()
  const { user, updateUser, logout } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [isConnecting, setIsConnecting] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [calendarStatus, setCalendarStatus] = useState<'connected' | 'disconnected' | 'loading'>('loading')
  const [googleEmail, setGoogleEmail] = useState<string | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{ total: number; newEvents: number; imported: number } | null>(null)
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Profile editing
  const [showEditProfileModal, setShowEditProfileModal] = useState(false)
  const [editName, setEditName] = useState('')
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)

  // Password change
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  // Fetch conversion stats for account overview
  const { data: conversionStats } = useQuery({
    queryKey: ['conversionStats'],
    queryFn: clientsApi.getConversionStats,
  })

  // Check for URL params (callback from Google OAuth)
  useEffect(() => {
    const googleParam = searchParams.get('google')
    const errorParam = searchParams.get('error')

    if (googleParam === 'connected') {
      setNotification({ type: 'success', message: 'Google Calendar conectado com sucesso!' })
      setCalendarStatus('connected')
      if (user) {
        updateUser({ ...user, calendarConnected: true })
      }
      setSearchParams({})
    } else if (errorParam) {
      setNotification({ type: 'error', message: 'Erro ao conectar com Google Calendar. Tente novamente.' })
      setSearchParams({})
    }
  }, [searchParams, setSearchParams, user, updateUser])

  // Check calendar status on mount
  useEffect(() => {
    checkCalendarStatus()
  }, [])

  // Clear notification after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [notification])

  const checkCalendarStatus = async () => {
    try {
      const token = localStorage.getItem('token')
      const { data } = await api.get('/auth/google/status', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setCalendarStatus(data.connected ? 'connected' : 'disconnected')
      setGoogleEmail(data.email || null)
      setLastSyncAt(data.lastSyncAt || null)
    } catch {
      setCalendarStatus('disconnected')
      setGoogleEmail(null)
      setLastSyncAt(null)
    }
  }

  const handleConnectGoogle = async () => {
    setIsConnecting(true)
    try {
      const token = localStorage.getItem('token')
      const { data } = await api.get('/auth/google/connect', {
        headers: { Authorization: `Bearer ${token}` }
      })
      window.location.href = data.url
    } catch {
      setNotification({ type: 'error', message: 'Erro ao iniciar conexão com Google. Tente novamente.' })
      setIsConnecting(false)
    }
  }

  const handleDisconnectGoogle = async () => {
    setIsDisconnecting(true)
    try {
      const token = localStorage.getItem('token')
      await api.post('/auth/google/disconnect', {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setCalendarStatus('disconnected')
      setGoogleEmail(null)
      setSyncResult(null)
      setNotification({ type: 'success', message: 'Google Calendar desconectado com sucesso.' })
      if (user) {
        updateUser({ ...user, calendarConnected: false })
      }
    } catch {
      setNotification({ type: 'error', message: 'Erro ao desconectar Google Calendar.' })
    } finally {
      setIsDisconnecting(false)
    }
  }

  const handleSyncCalendar = async () => {
    setIsSyncing(true)
    setSyncResult(null)
    try {
      const token = localStorage.getItem('token')
      const { data } = await api.post('/auth/google/sync', {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setSyncResult({ total: data.totalGoogleEvents, newEvents: data.newEventsCount, imported: data.importedCount })
      setLastSyncAt(data.lastSyncAt)
      setNotification({
        type: 'success',
        message: `Sincronização concluída! ${data.totalGoogleEvents} eventos encontrados, ${data.importedCount} importados.`
      })
    } catch {
      setNotification({ type: 'error', message: 'Erro ao sincronizar com Google Calendar.' })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleUpdateProfile = async () => {
    if (!editName.trim()) return
    setIsUpdatingProfile(true)
    try {
      const token = localStorage.getItem('token')
      const { data } = await api.put('/auth/profile', { name: editName }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (user) {
        updateUser({ ...user, name: data.name })
      }
      setNotification({ type: 'success', message: 'Perfil atualizado com sucesso!' })
      setShowEditProfileModal(false)
    } catch {
      setNotification({ type: 'error', message: 'Erro ao atualizar perfil.' })
    } finally {
      setIsUpdatingProfile(false)
    }
  }

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setNotification({ type: 'error', message: 'As senhas não coincidem.' })
      return
    }
    if (newPassword.length < 6) {
      setNotification({ type: 'error', message: 'A nova senha deve ter pelo menos 6 caracteres.' })
      return
    }
    setIsChangingPassword(true)
    try {
      const token = localStorage.getItem('token')
      await api.put('/auth/password', { currentPassword, newPassword }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setNotification({ type: 'success', message: 'Senha alterada com sucesso!' })
      setShowChangePasswordModal(false)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch {
      setNotification({ type: 'error', message: 'Erro ao alterar senha. Verifique a senha atual.' })
    } finally {
      setIsChangingPassword(false)
    }
  }

  const formatLastSyncDate = (dateString: string | null) => {
    if (!dateString) return null
    const date = new Date(dateString)
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const openEditProfileModal = () => {
    setEditName(user?.name || '')
    setShowEditProfileModal(true)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Configurações</h1>
          <p className="text-sm text-text-secondary">Gerencie sua conta e preferências</p>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div
          className={`p-3 rounded-lg flex items-center gap-3 ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/10 border border-red-500/30 text-red-400'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 flex-shrink-0" />
          )}
          <span className="text-sm">{notification.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column - Profile & Account */}
        <div className="space-y-4">
          {/* User Profile Card */}
          <Card className="glass-strong">
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold mb-4">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <h3 className="text-lg font-semibold text-text-primary">{user?.name || 'Usuário'}</h3>
                <p className="text-sm text-text-secondary">@{user?.username}</p>

                <div className="flex gap-2 mt-4 w-full">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={openEditProfileModal}
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Editar
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={() => setShowChangePasswordModal(true)}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    Senha
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Stats */}
          <Card>
            <div className="px-4 py-3 border-b border-white/10">
              <h2 className="font-medium text-text-primary text-sm flex items-center gap-2">
                <Shield className="w-4 h-4 text-violet-400" />
                Resumo da Conta
              </h2>
            </div>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Clientes</span>
                <span className="text-sm font-medium text-text-primary">{conversionStats?.overview.totalClients || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Agendamentos</span>
                <span className="text-sm font-medium text-text-primary">{conversionStats?.appointments.total || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Tatuagens</span>
                <span className="text-sm font-medium text-text-primary">{conversionStats?.tattoos.total || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Taxa de Conversão</span>
                <span className="text-sm font-medium text-emerald-400">{conversionStats?.overview.conversionRate || 0}%</span>
              </div>
            </CardContent>
          </Card>

          {/* Logout */}
          <Card className="hover:border-red-500/30 transition-colors">
            <CardContent className="p-4">
              <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 text-red-400 hover:text-red-300 transition-colors py-2"
              >
                <LogOut className="w-4 h-4" />
                <span className="font-medium">Sair da Conta</span>
              </button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Integrations & Settings */}
        <div className="lg:col-span-2 space-y-4">
          {/* Google Calendar Integration */}
          <Card>
            <div className="px-4 py-3 border-b border-white/10">
              <h2 className="font-medium text-text-primary text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-400" />
                Google Calendar
              </h2>
            </div>
            <CardContent className="p-4 space-y-4">
              <p className="text-text-secondary text-sm">
                Sincronize seus agendamentos com o Google Calendar automaticamente.
              </p>

              <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
                    <svg className="w-6 h-6" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-text-primary font-medium text-sm">Google Calendar</p>
                    <p className="text-xs text-text-secondary">
                      {calendarStatus === 'loading' ? (
                        'Verificando...'
                      ) : calendarStatus === 'connected' ? (
                        <span className="text-emerald-400">Conectado{googleEmail && ` • ${googleEmail}`}</span>
                      ) : (
                        'Não conectado'
                      )}
                    </p>
                  </div>
                </div>

                {calendarStatus === 'loading' ? (
                  <Loader2 className="w-5 h-5 text-text-secondary animate-spin" />
                ) : calendarStatus === 'connected' ? (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleSyncCalendar}
                      disabled={isSyncing}
                    >
                      {isSyncing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={handleDisconnectGoogle}
                      disabled={isDisconnecting}
                    >
                      {isDisconnecting ? 'Desconectando...' : 'Desconectar'}
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    onClick={handleConnectGoogle}
                    disabled={isConnecting}
                  >
                    {isConnecting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ExternalLink className="w-4 h-4" />
                    )}
                    {isConnecting ? 'Conectando...' : 'Conectar'}
                  </Button>
                )}
              </div>

              {lastSyncAt && (
                <div className="flex items-center gap-2 text-xs text-text-secondary">
                  <Calendar className="w-3.5 h-3.5" />
                  Última sincronização: {formatLastSyncDate(lastSyncAt)}
                </div>
              )}

              {syncResult && (
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 text-sm">
                  {syncResult.total} eventos no Google, {syncResult.imported} importados.
                </div>
              )}
            </CardContent>
          </Card>

          {/* System Info */}
          <Card>
            <div className="px-4 py-3 border-b border-white/10">
              <h2 className="font-medium text-text-primary text-sm flex items-center gap-2">
                <Info className="w-4 h-4 text-cyan-400" />
                Sobre o Sistema
              </h2>
            </div>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-white/5">
                  <p className="text-xs text-text-secondary">Versão</p>
                  <p className="text-sm font-medium text-text-primary">1.0.0</p>
                </div>
                <div className="p-3 rounded-lg bg-white/5">
                  <p className="text-xs text-text-secondary">Sistema</p>
                  <p className="text-sm font-medium text-text-primary">TattooTrack</p>
                </div>
                <div className="p-3 rounded-lg bg-white/5 col-span-2">
                  <p className="text-xs text-text-secondary">Stack</p>
                  <p className="text-sm font-medium text-text-primary">React + TypeScript + Node.js + MongoDB</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Future Settings Placeholder */}
          <Card className="border-dashed">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                <SettingsIcon className="w-6 h-6 text-text-secondary" />
              </div>
              <p className="text-text-secondary text-sm">
                Mais configurações em breve
              </p>
              <p className="text-text-secondary/60 text-xs mt-1">
                Notificações, temas, preferências e mais
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={showEditProfileModal}
        onClose={() => setShowEditProfileModal(false)}
        title="Editar Perfil"
      >
        <div className="space-y-4">
          <Input
            label="Nome"
            placeholder="Seu nome"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            autoFocus
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowEditProfileModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleUpdateProfile}
              disabled={!editName.trim() || isUpdatingProfile}
            >
              {isUpdatingProfile ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Salvar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        isOpen={showChangePasswordModal}
        onClose={() => {
          setShowChangePasswordModal(false)
          setCurrentPassword('')
          setNewPassword('')
          setConfirmPassword('')
        }}
        title="Alterar Senha"
      >
        <div className="space-y-4">
          <Input
            label="Senha Atual"
            type="password"
            placeholder="Digite sua senha atual"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoFocus
          />
          <Input
            label="Nova Senha"
            type="password"
            placeholder="Digite a nova senha"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Input
            label="Confirmar Nova Senha"
            type="password"
            placeholder="Confirme a nova senha"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          {newPassword && confirmPassword && newPassword !== confirmPassword && (
            <p className="text-xs text-red-400">As senhas não coincidem</p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setShowChangePasswordModal(false)
                setCurrentPassword('')
                setNewPassword('')
                setConfirmPassword('')
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={!currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword || isChangingPassword}
            >
              {isChangingPassword ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
              Alterar Senha
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
