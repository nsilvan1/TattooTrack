import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  User,
  Phone,
  Instagram,
  X,
  Save,
  Trash2,
  CheckCircle,
  AlertCircle,
  PlayCircle,
  XCircle,
} from 'lucide-react'
import { Card, CardContent, Button, Input, Modal, SearchableSelect } from '../components/ui'
import { appointmentsApi, clientsApi } from '../services/api'
import { formatDate } from '../utils/date'
import type { Appointment, CreateAppointmentData, AppointmentStatus, Client } from '../types'

const DAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

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

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth() + 1

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['appointments', year, month],
    queryFn: () => appointmentsApi.getByMonth(year, month),
  })

  const { data: clients = [] } = useQuery({
    queryKey: ['clients-list'],
    queryFn: () => clientsApi.list({}, 1, 1000).then(res => res.data),
  })

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
    appointments.forEach((apt) => {
      const dateKey = apt.date.split('T')[0]
      if (!map[dateKey]) map[dateKey] = []
      map[dateKey].push(apt)
    })
    return map
  }, [appointments])

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

    if (editingAppointment) {
      updateMutation.mutate({ id: editingAppointment.id, data })
    } else {
      createMutation.mutate(data)
    }
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Agendamentos</h1>
          <p className="text-text-secondary mt-1">Gerencie sua agenda de sessões</p>
        </div>
        <Button onClick={() => openNewAppointment()}>
          <Plus className="w-4 h-4" />
          Novo Agendamento
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
            <h2 className="font-semibold text-text-primary flex items-center gap-2">
              <Calendar className="w-5 h-5 text-violet-400" />
              {MONTHS_PT[month - 1]} {year}
            </h2>
            <div className="flex gap-1">
              <button
                onClick={() => navigateMonth(-1)}
                className="p-2 rounded-lg hover:bg-white/10 text-text-secondary hover:text-text-primary transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-1 rounded-lg hover:bg-white/10 text-text-secondary hover:text-text-primary text-sm transition-colors"
              >
                Hoje
              </button>
              <button
                onClick={() => navigateMonth(1)}
                className="p-2 rounded-lg hover:bg-white/10 text-text-secondary hover:text-text-primary transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
          <CardContent className="p-4">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-2">
              {DAYS_PT.map((day) => (
                <div key={day} className="text-center text-xs font-medium text-text-secondary py-2">
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
                      relative p-2 min-h-[80px] rounded-xl text-left transition-all
                      ${isCurrentMonth ? 'text-text-primary' : 'text-text-secondary/50'}
                      ${isSelected ? 'bg-violet-500/20 ring-1 ring-violet-500/50' : 'hover:bg-white/5'}
                      ${isToday(date) ? 'ring-1 ring-violet-400/50' : ''}
                    `}
                  >
                    <span className={`
                      text-sm font-medium
                      ${isToday(date) ? 'bg-violet-500 text-white px-1.5 py-0.5 rounded-full' : ''}
                    `}>
                      {date.getDate()}
                    </span>
                    {dayAppointments.length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {dayAppointments.slice(0, 2).map((apt) => (
                          <div
                            key={apt.id}
                            className="text-xs px-1.5 py-0.5 rounded truncate"
                            style={{
                              backgroundColor: `${STATUS_CONFIG[apt.status].color}20`,
                              color: STATUS_CONFIG[apt.status].color,
                            }}
                          >
                            {apt.startTime} {apt.client.name.split(' ')[0]}
                          </div>
                        ))}
                        {dayAppointments.length > 2 && (
                          <div className="text-xs text-text-secondary px-1">
                            +{dayAppointments.length - 2} mais
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
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
            <h2 className="font-semibold text-text-primary">
              {selectedDate
                ? formatDate(selectedDate)
                : 'Selecione um dia'}
            </h2>
            {selectedDate && (
              <Button size="sm" onClick={() => openNewAppointment(selectedDate)}>
                <Plus className="w-4 h-4" />
              </Button>
            )}
          </div>
          <div className="overflow-auto max-h-[500px]">
            {!selectedDate ? (
              <div className="p-6 text-center text-text-secondary">
                <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Clique em um dia para ver os agendamentos</p>
              </div>
            ) : selectedDateAppointments.length === 0 ? (
              <div className="p-6 text-center text-text-secondary">
                <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum agendamento neste dia</p>
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
              <div className="divide-y divide-white/10">
                {selectedDateAppointments.map((apt) => (
                  <button
                    key={apt.id}
                    onClick={() => openEditAppointment(apt)}
                    className="w-full p-4 text-left hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-1 h-full min-h-[60px] rounded-full"
                        style={{ backgroundColor: STATUS_CONFIG[apt.status].color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: `${STATUS_CONFIG[apt.status].color}20`,
                              color: STATUS_CONFIG[apt.status].color,
                            }}
                          >
                            {STATUS_CONFIG[apt.status].label}
                          </span>
                        </div>
                        <p className="font-medium text-text-primary truncate">{apt.title}</p>
                        <div className="flex items-center gap-2 mt-1 text-sm text-text-secondary">
                          <Clock className="w-3.5 h-3.5" />
                          {apt.startTime} - {formatEndTime(apt.startTime, apt.estimatedHours)}
                          <span className="text-text-secondary/50">({apt.estimatedHours}h)</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-sm text-text-secondary">
                          <User className="w-3.5 h-3.5" />
                          {apt.client.name}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          {apt.price && (
                            <span className="text-sm text-emerald-400">
                              R$ {apt.price.toFixed(2)}
                            </span>
                          )}
                          {apt.depositAmount && (
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              apt.depositPaid
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-amber-500/20 text-amber-400'
                            }`}>
                              {apt.depositPaid ? '✓ Sinal' : '$ Sinal pendente'}
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
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
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
                className="w-full px-3 py-2 glass rounded-xl text-text-primary bg-transparent focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:bg-white/10 transition-all duration-300"
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
                className="w-full px-3 py-2 glass rounded-xl text-text-primary bg-transparent focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:bg-white/10 transition-all duration-300"
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
                <label className="text-sm font-medium text-text-secondary">Valor do Sinal (R$)</label>
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
                className="w-full px-3 py-2 glass rounded-xl text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:bg-white/10 transition-all duration-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Observações</label>
            <textarea
              className="w-full px-3 py-2 glass rounded-xl text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all resize-none"
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
                {editingAppointment ? 'Salvar' : 'Salvar'}
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
          <p className="text-text-secondary">
            Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
              Cancelar
            </Button>
            <Button
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
    </div>
  )
}
