import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Bug,
  Lightbulb,
  HelpCircle,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  MessageSquare,
  ChevronRight,
  Send,
  Image as ImageIcon,
  User,
  Filter,
  BarChart3,
  ArrowLeft,
} from 'lucide-react'
import { Card, CardContent, Button, Input, Modal } from '../components/ui'
import { reportsApi, notificationsApi } from '../services/api'
import type { Report, ReportStatus, ReportType, ReportPriority } from '../types'

const TYPE_CONFIG: Record<ReportType, { label: string; icon: React.ReactNode; color: string }> = {
  bug: { label: 'Bug', icon: <Bug className="w-4 h-4" />, color: '#ef4444' },
  feature: { label: 'Sugestao', icon: <Lightbulb className="w-4 h-4" />, color: '#eab308' },
  other: { label: 'Outro', icon: <HelpCircle className="w-4 h-4" />, color: '#6b7280' },
}

const STATUS_CONFIG: Record<ReportStatus, { label: string; icon: React.ReactNode; color: string }> = {
  open: { label: 'Aberto', icon: <AlertCircle className="w-4 h-4" />, color: '#3b82f6' },
  in_progress: { label: 'Em Andamento', icon: <Clock className="w-4 h-4" />, color: '#eab308' },
  resolved: { label: 'Resolvido', icon: <CheckCircle className="w-4 h-4" />, color: '#22c55e' },
  closed: { label: 'Fechado', icon: <XCircle className="w-4 h-4" />, color: '#6b7280' },
}

const PRIORITY_CONFIG: Record<ReportPriority, { label: string; color: string }> = {
  low: { label: 'Baixa', color: '#22c55e' },
  medium: { label: 'Media', color: '#eab308' },
  high: { label: 'Alta', color: '#f97316' },
  critical: { label: 'Critica', color: '#ef4444' },
}

export default function AdminReports() {
  const queryClient = useQueryClient()
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<ReportType | 'all'>('all')
  const [responseMessage, setResponseMessage] = useState('')
  const [showImageModal, setShowImageModal] = useState(false)
  const [selectedImage, setSelectedImage] = useState('')
  const [showNotifyModal, setShowNotifyModal] = useState(false)
  const [pendingStatusChange, setPendingStatusChange] = useState<{ reportId: string; userId: string; status: ReportStatus; title: string } | null>(null)
  const [notifyMessage, setNotifyMessage] = useState('')
  const [isSendingNotification, setIsSendingNotification] = useState(false)

  // Fetch reports
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['reports', statusFilter, typeFilter],
    queryFn: () => reportsApi.list({
      status: statusFilter !== 'all' ? statusFilter : undefined,
      type: typeFilter !== 'all' ? typeFilter : undefined,
    }),
  })

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['reportStats'],
    queryFn: () => reportsApi.getStats(),
  })

  // Fetch single report with responses
  const { data: reportDetail, refetch: refetchDetail } = useQuery({
    queryKey: ['report', selectedReport?.id],
    queryFn: () => selectedReport ? reportsApi.get(selectedReport.id) : null,
    enabled: !!selectedReport,
  })

  // Update status mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { status?: ReportStatus; priority?: ReportPriority } }) =>
      reportsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: ['reportStats'] })
      refetchDetail()
    },
  })

  // Add response mutation
  const responseMutation = useMutation({
    mutationFn: ({ reportId, message }: { reportId: string; message: string }) =>
      reportsApi.addResponse(reportId, message),
    onSuccess: () => {
      setResponseMessage('')
      refetchDetail()
    },
  })

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const openImage = (url: string) => {
    setSelectedImage(url)
    setShowImageModal(true)
  }

  const handleStatusChange = (reportId: string, userId: string, newStatus: ReportStatus, reportTitle: string) => {
    // Se está mudando para resolvido ou fechado, mostrar modal de notificação
    if (newStatus === 'resolved' || newStatus === 'closed') {
      const defaultMessage = newStatus === 'resolved'
        ? `Seu report "${reportTitle}" foi resolvido! Obrigado pelo feedback.`
        : `Seu report "${reportTitle}" foi fechado.`
      setNotifyMessage(defaultMessage)
      setPendingStatusChange({ reportId, userId, status: newStatus, title: reportTitle })
      setShowNotifyModal(true)
    } else {
      // Para outros status, apenas atualiza
      updateMutation.mutate({ id: reportId, data: { status: newStatus } })
    }
  }

  const handleSendNotification = async (sendNotification: boolean) => {
    if (!pendingStatusChange) return

    setIsSendingNotification(true)
    try {
      // Atualiza o status
      await updateMutation.mutateAsync({
        id: pendingStatusChange.reportId,
        data: { status: pendingStatusChange.status }
      })

      // Envia notificação se solicitado
      if (sendNotification && notifyMessage.trim()) {
        await notificationsApi.send({
          userId: pendingStatusChange.userId,
          title: pendingStatusChange.status === 'resolved' ? 'Report Resolvido' : 'Report Fechado',
          message: notifyMessage,
          type: 'report',
          reportId: pendingStatusChange.reportId,
        })
      }
    } catch (error) {
      console.error('Erro ao processar:', error)
    } finally {
      setIsSendingNotification(false)
      setShowNotifyModal(false)
      setPendingStatusChange(null)
      setNotifyMessage('')
    }
  }

  if (selectedReport && reportDetail) {
    return (
      <div className="space-y-4">
        {/* Back button */}
        <button
          onClick={() => setSelectedReport(null)}
          className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Voltar para lista</span>
        </button>

        {/* Report detail */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="px-2 py-1 rounded-full text-xs flex items-center gap-1"
                    style={{
                      backgroundColor: `${TYPE_CONFIG[reportDetail.type].color}20`,
                      color: TYPE_CONFIG[reportDetail.type].color,
                    }}
                  >
                    {TYPE_CONFIG[reportDetail.type].icon}
                    {TYPE_CONFIG[reportDetail.type].label}
                  </span>
                  <span
                    className="px-2 py-1 rounded-full text-xs"
                    style={{
                      backgroundColor: `${PRIORITY_CONFIG[reportDetail.priority].color}20`,
                      color: PRIORITY_CONFIG[reportDetail.priority].color,
                    }}
                  >
                    {PRIORITY_CONFIG[reportDetail.priority].label}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-text-primary">{reportDetail.title}</h2>
                <p className="text-sm text-text-secondary mt-1">
                  Por {reportDetail.user.name} ({reportDetail.user.username}) - {formatDate(reportDetail.createdAt)}
                </p>
              </div>

              {/* Status selector */}
              <select
                value={reportDetail.status}
                onChange={(e) => handleStatusChange(
                  reportDetail.id,
                  reportDetail.userId,
                  e.target.value as ReportStatus,
                  reportDetail.title
                )}
                className="px-3 py-2 rounded-lg text-sm border border-white/10 bg-surface-solid text-text-primary focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                style={{
                  backgroundColor: `${STATUS_CONFIG[reportDetail.status].color}20`,
                  color: STATUS_CONFIG[reportDetail.status].color,
                }}
              >
                {Object.entries(STATUS_CONFIG).map(([value, { label }]) => (
                  <option key={value} value={value} className="bg-surface-solid text-text-primary">
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="p-4 rounded-lg bg-white/5 border border-white/10 mb-4">
              <p className="text-text-primary whitespace-pre-wrap">{reportDetail.description}</p>
            </div>

            {/* Screenshots */}
            {reportDetail.screenshots.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-text-secondary mb-2 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Screenshots ({reportDetail.screenshots.length})
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {reportDetail.screenshots.map((url, index) => (
                    <button
                      key={index}
                      onClick={() => openImage(url)}
                      className="aspect-video rounded-lg overflow-hidden bg-white/5 hover:ring-2 hover:ring-violet-500/50 transition-all"
                    >
                      <img
                        src={url.startsWith('/') ? `${import.meta.env.VITE_API_URL?.replace('/api', '')}${url}` : url}
                        alt={`Screenshot ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Additional info */}
            {(reportDetail.pageUrl || reportDetail.userAgent) && (
              <div className="text-xs text-text-secondary/70 space-y-1 mb-4">
                {reportDetail.pageUrl && <p>URL: {reportDetail.pageUrl}</p>}
                {reportDetail.userAgent && <p>Browser: {reportDetail.userAgent.slice(0, 100)}...</p>}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Responses */}
        <Card>
          <div className="px-4 py-3 border-b border-white/10">
            <h3 className="font-medium text-text-primary flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Respostas ({reportDetail.responses?.length || 0})
            </h3>
          </div>
          <CardContent className="p-4">
            {/* Response list */}
            <div className="space-y-3 mb-4 max-h-80 overflow-y-auto">
              {reportDetail.responses?.map((response) => (
                <div
                  key={response.id}
                  className={`p-3 rounded-lg ${
                    response.isAdmin
                      ? 'bg-violet-500/10 border border-violet-500/20 ml-4'
                      : 'bg-white/5 border border-white/10 mr-4'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <User className="w-3 h-3 text-text-secondary" />
                    <span className="text-xs font-medium text-text-primary">
                      {response.user.name}
                      {response.isAdmin && (
                        <span className="ml-1 px-1.5 py-0.5 rounded bg-violet-500/30 text-violet-300 text-[10px]">
                          Admin
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-text-secondary">
                      {formatDate(response.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-text-primary">{response.message}</p>
                </div>
              ))}

              {(!reportDetail.responses || reportDetail.responses.length === 0) && (
                <p className="text-center text-text-secondary text-sm py-4">
                  Nenhuma resposta ainda
                </p>
              )}
            </div>

            {/* New response form */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Escreva uma resposta..."
                value={responseMessage}
                onChange={(e) => setResponseMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && responseMessage.trim()) {
                    responseMutation.mutate({ reportId: reportDetail.id, message: responseMessage })
                  }
                }}
                className="flex-1 px-3 py-2 rounded-lg text-sm border border-white/10 bg-white/5 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              />
              <Button
                onClick={() => {
                  if (responseMessage.trim()) {
                    responseMutation.mutate({ reportId: reportDetail.id, message: responseMessage })
                  }
                }}
                disabled={!responseMessage.trim() || responseMutation.isPending}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Image modal */}
        <Modal isOpen={showImageModal} onClose={() => setShowImageModal(false)} title="Screenshot" size="xl">
          <img
            src={selectedImage.startsWith('/') ? `${import.meta.env.VITE_API_URL?.replace('/api', '')}${selectedImage}` : selectedImage}
            alt="Screenshot"
            className="w-full rounded-lg"
          />
        </Modal>

        {/* Notify user modal */}
        <Modal
          isOpen={showNotifyModal}
          onClose={() => {
            if (!isSendingNotification) {
              setShowNotifyModal(false)
              setPendingStatusChange(null)
            }
          }}
          title="Notificar Usuario"
          size="md"
        >
          <div className="space-y-4">
            <p className="text-text-secondary text-sm">
              Deseja enviar uma notificacao ao usuario informando sobre a resolucao do report?
            </p>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                Mensagem para o usuario
              </label>
              <textarea
                value={notifyMessage}
                onChange={(e) => setNotifyMessage(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm text-text-primary border border-white/10 placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all resize-none bg-white/5"
                rows={4}
                placeholder="Escreva a mensagem que sera enviada ao usuario..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                onClick={() => handleSendNotification(false)}
                disabled={isSendingNotification}
              >
                Nao Notificar
              </Button>
              <Button
                onClick={() => handleSendNotification(true)}
                disabled={isSendingNotification || !notifyMessage.trim()}
              >
                {isSendingNotification ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Enviar Notificacao
                  </>
                )}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-text-primary">Reports</h1>
        <p className="text-sm text-text-secondary">Gerencie bugs e sugestoes dos usuarios</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="glass-strong">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <BarChart3 className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-text-primary">{stats.total}</p>
                <p className="text-xs text-text-secondary">Total</p>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-strong">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/20">
                <AlertCircle className="w-4 h-4 text-yellow-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-text-primary">{stats.byStatus.open}</p>
                <p className="text-xs text-text-secondary">Abertos</p>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-strong">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/20">
                <Clock className="w-4 h-4 text-orange-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-text-primary">{stats.byStatus.inProgress}</p>
                <p className="text-xs text-text-secondary">Em Andamento</p>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-strong">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <CheckCircle className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-text-primary">{stats.byStatus.resolved}</p>
                <p className="text-xs text-text-secondary">Resolvidos</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-3">
            <Filter className="w-4 h-4 text-text-secondary" />

            {/* Status filter */}
            <div className="flex gap-1">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2 py-1 text-xs rounded-lg transition-all ${
                  statusFilter === 'all'
                    ? 'bg-violet-500/20 text-violet-400'
                    : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                }`}
              >
                Todos
              </button>
              {Object.entries(STATUS_CONFIG).map(([key, { label, color }]) => (
                <button
                  key={key}
                  onClick={() => setStatusFilter(key as ReportStatus)}
                  className={`px-2 py-1 text-xs rounded-lg transition-all ${
                    statusFilter === key ? 'ring-1 ring-white/20' : 'opacity-60 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: statusFilter === key ? `${color}20` : 'transparent',
                    color: color,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="h-4 w-px bg-white/10" />

            {/* Type filter */}
            <div className="flex gap-1">
              {Object.entries(TYPE_CONFIG).map(([key, { label, color, icon }]) => (
                <button
                  key={key}
                  onClick={() => setTypeFilter(typeFilter === key ? 'all' : key as ReportType)}
                  className={`px-2 py-1 text-xs rounded-lg transition-all flex items-center gap-1 ${
                    typeFilter === key ? 'ring-1 ring-white/20' : 'opacity-60 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: typeFilter === key ? `${color}20` : 'transparent',
                    color: typeFilter === key ? color : undefined,
                  }}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports list */}
      <Card>
        <div className="divide-y divide-white/5">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mx-auto" />
            </div>
          ) : reports.length === 0 ? (
            <div className="p-8 text-center">
              <Bug className="w-12 h-12 mx-auto text-text-secondary/30 mb-3" />
              <p className="text-text-secondary">Nenhum report encontrado</p>
            </div>
          ) : (
            reports.map((report) => (
              <button
                key={report.id}
                onClick={() => setSelectedReport(report)}
                className="w-full p-4 text-left hover:bg-white/5 transition-colors flex items-center gap-4"
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${TYPE_CONFIG[report.type].color}20` }}
                >
                  <span style={{ color: TYPE_CONFIG[report.type].color }}>
                    {TYPE_CONFIG[report.type].icon}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px]"
                      style={{
                        backgroundColor: `${STATUS_CONFIG[report.status].color}20`,
                        color: STATUS_CONFIG[report.status].color,
                      }}
                    >
                      {STATUS_CONFIG[report.status].label}
                    </span>
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px]"
                      style={{
                        backgroundColor: `${PRIORITY_CONFIG[report.priority].color}20`,
                        color: PRIORITY_CONFIG[report.priority].color,
                      }}
                    >
                      {PRIORITY_CONFIG[report.priority].label}
                    </span>
                  </div>
                  <p className="font-medium text-text-primary truncate">{report.title}</p>
                  <p className="text-xs text-text-secondary">
                    {report.user.name} - {formatDate(report.createdAt)}
                  </p>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  {report.screenshots.length > 0 && (
                    <span className="flex items-center gap-1 text-xs text-text-secondary">
                      <ImageIcon className="w-3 h-3" />
                      {report.screenshots.length}
                    </span>
                  )}
                  {report._count && report._count.responses > 0 && (
                    <span className="flex items-center gap-1 text-xs text-text-secondary">
                      <MessageSquare className="w-3 h-3" />
                      {report._count.responses}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-text-secondary" />
                </div>
              </button>
            ))
          )}
        </div>
      </Card>
    </div>
  )
}
