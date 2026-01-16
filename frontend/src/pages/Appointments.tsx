import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  User,
  Save,
  Trash2,
  CheckCircle,
  AlertCircle,
  PlayCircle,
  XCircle,
  DollarSign,
  TrendingUp,
  CalendarCheck,
  Filter,
  X,
} from 'lucide-react'
import { Card, CardContent, Button, Input, Modal, SearchableSelect } from '../components/ui'
import BatchStockOutModal from '../components/BatchStockOutModal'
import { appointmentsApi, clientsApi } from '../services/api'
import { formatDate } from '../utils/date'
import type { Appointment, CreateAppointmentData, AppointmentStatus, Client } from '../types'

const DAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; color: string; icon: React.ReactNode }> = {
  scheduled: { label: 'Agendado', color: '#38bdf8', icon: <Calendar className="w-4 h-4" /> },
  confirmed: { label: 'Confirmado', color: '#a78bfa', icon: <CheckCircle className="w-4 h-4" /> },
  in_progress: { label: 'Em Andamento', color: '#fbbf24', icon: <PlayCircle className="w-4 h-4" /> },
  completed: { label: 'Concluído', color: '#34d399', icon: <CheckCircle className="w-4 h-4" /> },
  cancelled: { label: 'Cancelado', color: '#f87171', icon: <XCircle className="w-4 h-4" /> },
}

const HOURS_OPTIONS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 7, 8, 10, 12]

interface AppointmentFormData {
  clientId: string
  title: string
  description: string
  date: string
  startTime: string
  estimatedHours: number
  status: AppointmentStatus
  price: string
  depositAmount: string
  depositPaid: boolean
  notes: string
}

const initialFormData: AppointmentFormData = {
  clientId: '',
  title: '',
  description: '',
  date: '',
  startTime: '10:00',
  estimatedHours: 2,
  status: 'scheduled',
  price: '',
  depositAmount: '',
  depositPaid: false,
  notes: '',
}

export default function Appointments() {
  const queryClient = useQueryClient()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null)
  const [formData, setFormData] = useState<AppointmentFormData>(initialFormData)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [conflictError, setConflictError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | 'all'>('all')
  const [showStockOutModal, setShowStockOutModal] = useState(false)
  const [pendingAppointmentUpdate, setPendingAppointmentUpdate] = useState<{ id: string; data: Partial<CreateAppointmentData> } | null>(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth() + 1

  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments', year, month],
    queryFn: () => appointmentsApi.getByMonth(year, month),
  })

  const { data: clients = [] } = useQuery({
    queryKey: ['clients-list'],
    queryFn: () => clientsApi.list({}, 1, 1000).then(res => res.data),
  })

  // Stats
  const stats = useMemo(() => {
    const total = appointments.length
    const scheduled = appointments.filter(a => a.status === 'scheduled' || a.status === 'confirmed').length
    const completed = appointments.filter(a => a.status === 'completed').length
    const totalRevenue = appointments
      .filter(a => a.status === 'completed' && a.price)
      .reduce((sum, a) => sum + (a.price || 0), 0)
    const pendingDeposits = appointments
      .filter(a => a.depositAmount && !a.depositPaid && a.status !== 'cancelled' && a.status !== 'completed')
      .reduce((sum, a) => sum + (a.depositAmount || 0), 0)

    return { total, scheduled, completed, totalRevenue, pendingDeposits }
  }, [appointments])

  // Filtered appointments
  const filteredAppointments = useMemo(() => {
    if (statusFilter === 'all') return appointments
    return appointments.filter(a => a.status === statusFilter)
  }, [appointments, statusFilter])

  const createMutation = useMutation({
    mutationFn: (data: CreateAppointmentData) => appointmentsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      closeModal()
    },
    onError: (error: any) => {
      if (error.response?.status === 409) {
        setConflictError(error.response.data.message)
      }
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateAppointmentData> }) =>
      appointmentsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      closeModal()
    },
    onError: (error: any) => {
      if (error.response?.status === 409) {
        setConflictError(error.response.data.message)
      }
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => appointmentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      closeModal()
    },
  })

  // Calendar logic
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1)
    const lastDay = new Date(year, month, 0)
    const daysInMonth = lastDay.getDate()
    const startDayOfWeek = firstDay.getDay()

    const days: { date: Date; isCurrentMonth: boolean }[] = []

    // Previous month days
    const prevMonthLastDay = new Date(year, month - 1, 0).getDate()
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 2, prevMonthLastDay - i),
        isCurrentMonth: false,
      })
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month - 1, i),
        isCurrentMonth: true,
      })
    }

    // Next month days
    const remainingDays = 42 - days.length
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: false,
      })
    }

    return days
  }, [year, month])

  const appointmentsByDate = useMemo(() => {
    const map: Record<string, Appointment[]> = {}
    filteredAppointments.forEach((apt) => {
      const dateKey = apt.date.split('T')[0]
      if (!map[dateKey]) map[dateKey] = []
      map[dateKey].push(apt)
    })
    return map
  }, [filteredAppointments])

  const selectedDateAppointments = useMemo(() => {
    if (!selectedDate) return []
    const dateKey = selectedDate.toISOString().split('T')[0]
    return (appointmentsByDate[dateKey] || []).sort((a, b) => a.startTime.localeCompare(b.startTime))
  }, [selectedDate, appointmentsByDate])

  const navigateMonth = (direction: number) => {
    setCurrentDate(new Date(year, month - 1 + direction, 1))
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const openNewAppointment = (date?: Date) => {
    const targetDate = date || selectedDate || new Date()
    setFormData({
      ...initialFormData,
      date: targetDate.toISOString().split('T')[0],
    })
    setEditingAppointment(null)
    setShowModal(true)
  }

  const openEditAppointment = (appointment: Appointment) => {
    setFormData({
      clientId: appointment.clientId,
      title: appointment.title,
      description: appointment.description || '',
      date: appointment.date.split('T')[0],
      startTime: appointment.startTime,
      estimatedHours: appointment.estimatedHours,
      status: appointment.status,
      price: appointment.price?.toString() || '',
      depositAmount: appointment.depositAmount?.toString() || '',
      depositPaid: appointment.depositPaid || false,
      notes: appointment.notes || '',
    })
    setEditingAppointment(appointment)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingAppointment(null)
    setShowDeleteConfirm(false)
    setFormData(initialFormData)
    setConflictError(null)
  }

  const handleSubmit = () => {
    setConflictError(null)
    const data: CreateAppointmentData = {
      clientId: formData.clientId,
      title: formData.title,
      description: formData.description || undefined,
      date: formData.date,
      startTime: formData.startTime,
      estimatedHours: formData.estimatedHours,
      status: formData.status,
      price: formData.price ? parseFloat(formData.price) : undefined,
      depositAmount: formData.depositAmount ? parseFloat(formData.depositAmount) : undefined,
      depositPaid: formData.depositPaid,
      notes: formData.notes || undefined,
    }

    // Se estiver mudando status para "completed", mostrar modal de materiais
    if (editingAppointment && formData.status === 'completed' && editingAppointment.status !== 'completed') {
      setPendingAppointmentUpdate({ id: editingAppointment.id, data })
      setShowStockOutModal(true)
      return
    }

    if (editingAppointment) {
      updateMutation.mutate({ id: editingAppointment.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleStockOutComplete = async () => {
    // Registrou os materiais, agora salvar o agendamento
    if (pendingAppointmentUpdate) {
      updateMutation.mutate(pendingAppointmentUpdate)
    }
    setShowStockOutModal(false)
    setPendingAppointmentUpdate(null)
  }

  const handleStockOutSkip = () => {
    // Pulou os materiais, salvar o agendamento direto
    if (pendingAppointmentUpdate) {
      updateMutation.mutate(pendingAppointmentUpdate)
    }
    setShowStockOutModal(false)
    setPendingAppointmentUpdate(null)
  }

  const handleDelete = () => {
    if (editingAppointment) {
      deleteMutation.mutate(editingAppointment.id)
    }
  }

  const formatEndTime = (startTime: string, hours: number) => {
    const [h, m] = startTime.split(':').map(Number)
    const totalMinutes = h * 60 + m + hours * 60
    const endH = Math.floor(totalMinutes / 60) % 24
    const endM = totalMinutes % 60
    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`
  }

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  }

  return (
    <div className="space-y-4">
      {/* Header compacto */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-text-primary">Agendamentos</h1>
          <p className="text-xs sm:text-sm text-text-secondary">Gerencie sua agenda de sessões</p>
        </div>
        <Button size="sm" onClick={() => openNewAppointment()} className="w-full sm:w-auto">
          <Plus className="w-4 h-4" />
          Novo Agendamento
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="glass-strong">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-500/20">
              <CalendarCheck className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-text-primary">{stats.total}</p>
              <p className="text-xs text-text-secondary">Total do Mês</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-strong">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/20">
              <Clock className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-text-primary">{stats.scheduled}</p>
              <p className="text-xs text-text-secondary">Agendados</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-strong">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-text-primary">{stats.completed}</p>
              <p className="text-xs text-text-secondary">Concluídos</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-strong">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <DollarSign className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-text-primary">R$ {formatCurrency(stats.totalRevenue)}</p>
              <p className="text-xs text-text-secondary">Faturado</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navegação do mês + Filtros */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Navegação do mês */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => navigateMonth(-1)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-text-secondary hover:text-text-primary transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-1.5 rounded-lg hover:bg-white/10 text-text-primary font-medium text-sm min-w-[120px] text-center"
              >
                {MONTHS_SHORT[month - 1]} {year}
              </button>
              <button
                onClick={() => navigateMonth(1)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-text-secondary hover:text-text-primary transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Separador */}
            <div className="h-6 w-px bg-white/10 hidden sm:block" />

            {/* Filtro por status */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              <Filter className="w-3.5 h-3.5 text-text-secondary shrink-0" />
              <div className="flex gap-1">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-2 py-1 text-xs rounded-lg transition-all whitespace-nowrap ${
                    statusFilter === 'all'
                      ? 'bg-violet-500/20 text-violet-400'
                      : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                  }`}
                >
                  Todos
                </button>
                {Object.entries(STATUS_CONFIG).slice(0, 4).map(([key, { label, color }]) => (
                  <button
                    key={key}
                    onClick={() => setStatusFilter(key as AppointmentStatus)}
                    className={`px-2 py-1 text-xs rounded-lg transition-all whitespace-nowrap ${
                      statusFilter === key
                        ? 'ring-1 ring-white/20'
                        : 'opacity-60 hover:opacity-100'
                    }`}
                    style={{
                      backgroundColor: statusFilter === key ? `${color}20` : 'transparent',
                      color: color,
                    }}
                  >
                    <span className="hidden sm:inline">{label}</span>
                    <span className="sm:hidden">{label.slice(0, 4)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Limpar filtro */}
            {statusFilter !== 'all' && (
              <button
                onClick={() => setStatusFilter('all')}
                className="flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary ml-auto"
              >
                <X className="w-3 h-3" />
                Limpar
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardContent className="p-3">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-1">
              {DAYS_PT.map((day) => (
                <div key={day} className="text-center text-xs font-medium text-text-secondary py-1.5">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map(({ date, isCurrentMonth }, idx) => {
                const dateKey = date.toISOString().split('T')[0]
                const dayAppointments = appointmentsByDate[dateKey] || []
                const isSelected = selectedDate?.toDateString() === date.toDateString()

                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDate(date)}
                    className={`
                      relative p-1.5 min-h-[70px] rounded-lg text-left transition-all
                      ${isCurrentMonth ? 'text-text-primary' : 'text-text-secondary/40'}
                      ${isSelected ? 'bg-violet-500/20 ring-1 ring-violet-500/50' : 'hover:bg-white/5'}
                      ${isToday(date) && !isSelected ? 'ring-1 ring-violet-400/30' : ''}
                    `}
                  >
                    <span className={`
                      text-xs font-medium
                      ${isToday(date) ? 'bg-violet-500 text-white px-1.5 py-0.5 rounded-full' : ''}
                    `}>
                      {date.getDate()}
                    </span>
                    {dayAppointments.length > 0 && (
                      <div className="mt-0.5 space-y-0.5">
                        {dayAppointments.slice(0, 2).map((apt) => (
                          <div
                            key={apt.id}
                            className="text-[10px] px-1 py-0.5 rounded truncate leading-tight"
                            style={{
                              backgroundColor: `${STATUS_CONFIG[apt.status].color}20`,
                              color: STATUS_CONFIG[apt.status].color,
                            }}
                          >
                            {apt.startTime.slice(0, 5)}
                          </div>
                        ))}
                        {dayAppointments.length > 2 && (
                          <div className="text-[10px] text-text-secondary/70 px-1">
                            +{dayAppointments.length - 2}
                          </div>
                        )}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Day detail */}
        <Card>
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <h2 className="font-medium text-text-primary text-sm">
              {selectedDate
                ? formatDate(selectedDate)
                : 'Selecione um dia'}
            </h2>
            {selectedDate && (
              <Button size="sm" variant="ghost" onClick={() => openNewAppointment(selectedDate)}>
                <Plus className="w-4 h-4" />
              </Button>
            )}
          </div>
          <div className="overflow-auto max-h-[400px] scrollbar-thin">
            {!selectedDate ? (
              <div className="p-6 text-center text-text-secondary">
                <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Clique em um dia</p>
              </div>
            ) : selectedDateAppointments.length === 0 ? (
              <div className="p-6 text-center text-text-secondary">
                <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhum agendamento</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => openNewAppointment(selectedDate)}
                >
                  <Plus className="w-4 h-4" />
                  Adicionar
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {selectedDateAppointments.map((apt) => (
                  <button
                    key={apt.id}
                    onClick={() => openEditAppointment(apt)}
                    className="w-full p-3 text-left hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-start gap-2.5">
                      <div
                        className="w-1 h-full min-h-[50px] rounded-full shrink-0"
                        style={{ backgroundColor: STATUS_CONFIG[apt.status].color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded-full"
                            style={{
                              backgroundColor: `${STATUS_CONFIG[apt.status].color}20`,
                              color: STATUS_CONFIG[apt.status].color,
                            }}
                          >
                            {STATUS_CONFIG[apt.status].label}
                          </span>
                        </div>
                        <p className="font-medium text-sm text-text-primary truncate">{apt.title}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-text-secondary">
                          <Clock className="w-3 h-3" />
                          {apt.startTime} - {formatEndTime(apt.startTime, apt.estimatedHours)}
                          <span className="text-text-secondary/50">({apt.estimatedHours}h)</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-text-secondary">
                          <User className="w-3 h-3" />
                          {apt.client.name}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {apt.price && (
                            <span className="text-xs text-emerald-400 font-medium">
                              R$ {apt.price.toFixed(0)}
                            </span>
                          )}
                          {apt.depositAmount && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                              apt.depositPaid
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-amber-500/20 text-amber-400'
                            }`}>
                              {apt.depositPaid ? '✓ Sinal' : 'Sinal pendente'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Próximos agendamentos (lista compacta) */}
      {stats.scheduled > 0 && (
        <Card>
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <h2 className="font-medium text-text-primary text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              Próximos Agendamentos
            </h2>
            <span className="text-xs text-text-secondary">{stats.scheduled} pendentes</span>
          </div>
          <div className="max-h-[200px] overflow-auto scrollbar-thin">
            <div className="divide-y divide-white/5">
              {appointments
                .filter(a => a.status === 'scheduled' || a.status === 'confirmed')
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .slice(0, 5)
                .map((apt) => (
                  <div
                    key={apt.id}
                    onClick={() => openEditAppointment(apt)}
                    className="px-4 py-2.5 flex items-center justify-between hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: STATUS_CONFIG[apt.status].color }}
                      />
                      <div className="min-w-0">
                        <p className="text-sm text-text-primary truncate">{apt.title}</p>
                        <p className="text-xs text-text-secondary">
                          {apt.client.name} • {apt.startTime}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-xs text-text-primary">
                        {new Date(apt.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      </p>
                      {apt.price && (
                        <p className="text-xs text-emerald-400">R$ {formatCurrency(apt.price)}</p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </Card>
      )}

      {/* Appointment Modal */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editingAppointment ? 'Editar Agendamento' : 'Novo Agendamento'}
        size="md"
      >
        <div className="space-y-4">
          {/* Conflict error alert */}
          {conflictError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-300/80">{conflictError}</p>
            </div>
          )}

          {/* Cliente */}
          <SearchableSelect
            label="Cliente *"
            placeholder="Buscar cliente..."
            value={formData.clientId}
            onChange={(value) => setFormData({ ...formData, clientId: value })}
            options={clients.map((client: Client) => ({
              value: client.id,
              label: client.name,
              sublabel: client.phone,
            }))}
          />

          {/* Título */}
          <Input
            label="Título *"
            placeholder="Ex: Sessão de fechamento"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />

          {/* Data, Horário, Duração e Status */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Data *"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />
            <Input
              label="Horário *"
              type="time"
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="w-full">
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Duração *</label>
              <select
                className="w-full px-3 py-2 bg-surface-solid rounded-xl text-text-primary border border-white/10 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"
                value={formData.estimatedHours}
                onChange={(e) => setFormData({ ...formData, estimatedHours: parseFloat(e.target.value) })}
              >
                {HOURS_OPTIONS.map((h) => (
                  <option key={h} value={h} className="bg-surface-solid">{h}h</option>
                ))}
              </select>
            </div>
            <div className="w-full">
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Status</label>
              <select
                className="w-full px-3 py-2 bg-surface-solid rounded-xl text-text-primary border border-white/10 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as AppointmentStatus })}
              >
                {Object.entries(STATUS_CONFIG).map(([value, { label }]) => (
                  <option key={value} value={value} className="bg-surface-solid">{label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Valor Total e Sinal */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Valor Total (R$)"
              type="number"
              placeholder="0.00"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            />
            <div className="w-full">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-text-secondary">Sinal (R$)</label>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, depositPaid: !formData.depositPaid })}
                  className="flex items-center gap-1.5 text-xs"
                >
                  <span className={formData.depositPaid ? 'text-emerald-400' : 'text-text-secondary/70'}>
                    {formData.depositPaid ? 'Pago' : 'Pendente'}
                  </span>
                  <div className={`relative w-8 h-4 rounded-full transition-colors ${
                    formData.depositPaid ? 'bg-emerald-500' : 'bg-white/20'
                  }`}>
                    <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${
                      formData.depositPaid ? 'left-4' : 'left-0.5'
                    }`} />
                  </div>
                </button>
              </div>
              <input
                type="number"
                placeholder="0.00"
                value={formData.depositAmount}
                onChange={(e) => setFormData({ ...formData, depositAmount: e.target.value })}
                className="w-full px-3 py-2 bg-surface-solid rounded-xl text-text-primary border border-white/10 placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Observações</label>
            <textarea
              className="w-full px-3 py-2 bg-surface-solid rounded-xl text-sm text-text-primary border border-white/10 placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all resize-none"
              rows={2}
              placeholder="Notas adicionais..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="flex flex-col gap-3 pt-4 mt-1 border-t border-white/10">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="w-full px-4 py-2.5 rounded-xl text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-white/5 border border-white/10 transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!formData.clientId || !formData.title || !formData.date || createMutation.isPending || updateMutation.isPending}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/20"
              >
                {(createMutation.isPending || updateMutation.isPending) ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Salvar
              </button>
            </div>
            {editingAppointment && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center justify-center gap-2 py-2 text-sm text-red-400/70 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Excluir agendamento
              </button>
            )}
          </div>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Excluir Agendamento"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-text-secondary text-sm">
            Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowDeleteConfirm(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleDelete}
              isLoading={deleteMutation.isPending}
              className="bg-red-500 hover:bg-red-600"
            >
              <Trash2 className="w-4 h-4" />
              Excluir
            </Button>
          </div>
        </div>
      </Modal>

      {/* Stock Out Modal - shown when completing appointment */}
      <BatchStockOutModal
        isOpen={showStockOutModal}
        appointment={editingAppointment ? {
          id: editingAppointment.id,
          title: editingAppointment.title,
          client: editingAppointment.client,
        } : null}
        onComplete={handleStockOutComplete}
        onSkip={handleStockOutSkip}
      />
    </div>
  )
}
