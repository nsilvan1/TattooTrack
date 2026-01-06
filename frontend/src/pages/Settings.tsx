import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Card, CardContent } from '../components/ui'
import { Settings as SettingsIcon, Info, Calendar, CheckCircle, XCircle, Loader2, ExternalLink, RefreshCw } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'

export default function Settings() {
  const { user, updateUser } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [isConnecting, setIsConnecting] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [calendarStatus, setCalendarStatus] = useState<'connected' | 'disconnected' | 'loading'>('loading')
  const [googleEmail, setGoogleEmail] = useState<string | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{ total: number; newEvents: number; imported: number } | null>(null)
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

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
      // Clear params
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
      // Redirect to Google OAuth
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

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Configurações</h1>
        <p className="text-text-secondary mt-1">Gerencie as configurações do sistema</p>
      </div>

      {/* Notification */}
      {notification && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 ${
            notification.type === 'success'
              ? 'bg-green-500/10 border border-green-500/30 text-green-400'
              : 'bg-red-500/10 border border-red-500/30 text-red-400'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <XCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span className="text-sm">{notification.message}</span>
        </div>
      )}

      {/* Google Calendar Integration */}
      <Card>
        <div className="px-6 py-4 border-b border-white/10">
          <h2 className="font-semibold text-text-primary flex items-center gap-2">
            <Calendar className="w-4 h-4 text-text-secondary" />
            Integração Google Calendar
          </h2>
        </div>
        <CardContent className="space-y-4">
          <p className="text-text-secondary text-sm">
            Conecte sua conta Google para sincronizar seus agendamentos automaticamente com o Google Calendar.
          </p>

          <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-3">
              {/* Google Calendar Icon */}
              <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              </div>
              <div>
                <p className="text-text-primary font-medium">Google Calendar</p>
                <p className="text-text-secondary text-sm">
                  {calendarStatus === 'loading' ? (
                    'Verificando status...'
                  ) : calendarStatus === 'connected' ? (
                    <span className="text-green-400">Conectado{googleEmail && ` • ${googleEmail}`}</span>
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
                <button
                  onClick={handleSyncCalendar}
                  disabled={isSyncing}
                  className="px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 text-sm font-medium hover:bg-blue-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSyncing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sincronizando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Sincronizar
                    </>
                  )}
                </button>
                <button
                  onClick={handleDisconnectGoogle}
                  disabled={isDisconnecting}
                  className="px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isDisconnecting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Desconectando...
                    </>
                  ) : (
                    'Desconectar'
                  )}
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnectGoogle}
                disabled={isConnecting}
                className="px-4 py-2 rounded-lg bg-violet-500/20 border border-violet-500/30 text-violet-400 text-sm font-medium hover:bg-violet-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Conectando...
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4" />
                    Conectar
                  </>
                )}
              </button>
            )}
          </div>

          {lastSyncAt && (
            <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-text-secondary text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Última sincronização: {formatLastSyncDate(lastSyncAt)}
            </div>
          )}

          {syncResult && (
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 text-sm">
              Resultado: {syncResult.total} eventos no Google Calendar, {syncResult.imported} importados para TattooTrack.
            </div>
          )}

          <p className="text-text-secondary text-xs">
            Ao conectar, seus agendamentos serão sincronizados automaticamente com seu Google Calendar.
            Você pode desconectar a qualquer momento.
          </p>
        </CardContent>
      </Card>

      <Card>
        <div className="px-6 py-4 border-b border-white/10">
          <h2 className="font-semibold text-text-primary flex items-center gap-2">
            <Info className="w-4 h-4 text-text-secondary" />
            Sobre o Sistema
          </h2>
        </div>
        <CardContent className="space-y-4">
          <div className="flex justify-between py-2 border-b border-white/10">
            <span className="text-text-secondary">Versão</span>
            <span className="text-text-primary">1.0.0</span>
          </div>
          <div className="flex justify-between py-2 border-b border-white/10">
            <span className="text-text-secondary">Sistema</span>
            <span className="text-text-primary">TattooTrack</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-text-secondary">Desenvolvido com</span>
            <span className="text-text-primary">React + TypeScript + TailwindCSS</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <div className="px-6 py-4 border-b border-white/10">
          <h2 className="font-semibold text-text-primary flex items-center gap-2">
            <SettingsIcon className="w-4 h-4 text-text-secondary" />
            Configurações Gerais
          </h2>
        </div>
        <CardContent>
          <p className="text-text-secondary text-sm">
            Mais configurações serão adicionadas em futuras atualizações.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
