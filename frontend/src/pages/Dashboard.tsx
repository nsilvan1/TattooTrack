import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import {
  Users,
  CalendarCheck,
  TrendingUp,
  TrendingDown,
  Edit,
  Phone,
  ExternalLink,
  Save,
  Mail,
  Instagram,
  DollarSign,
  Clock,
  Calendar,
  ArrowRight,
  Wallet,
  AlertCircle,
} from 'lucide-react'
import { Card, CardContent, Button, Input, Modal } from '../components/ui'
import { clientsApi, tagsApi, appointmentsApi, financesApi, transactionsApi } from '../services/api'
import type { Client, Tag as TagType, Appointment, Transaction } from '../types'

export default function Dashboard() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [editForm, setEditForm] = useState({ name: '', phone: '', notes: '' })

  // Current month dates
  const now = new Date()
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const startDate = firstDayOfMonth.toISOString().split('T')[0]
  const endDate = lastDayOfMonth.toISOString().split('T')[0]

  // Today and next 7 days for appointments
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const nextWeek = new Date(today)
  nextWeek.setDate(nextWeek.getDate() + 7)

  const { data: clientsData } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientsApi.list({}, 1, 1000),
  })

  const { data: tags } = useQuery({
    queryKey: ['tags'],
    queryFn: tagsApi.list,
  })

  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments'],
    queryFn: appointmentsApi.list,
  })

  const { data: financeSummary } = useQuery({
    queryKey: ['finances-summary', startDate, endDate],
    queryFn: () => financesApi.getSummary(startDate, endDate),
  })

  const { data: recentTransactions = [] } = useQuery({
    queryKey: ['transactions-recent'],
    queryFn: () => transactionsApi.list({ limit: 5 }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => clientsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      setEditingClient(null)
    },
  })

  const clients = clientsData?.data || []

  // Filter upcoming appointments (next 7 days)
  const upcomingAppointments = appointments
    .filter((apt: Appointment) => {
      const aptDate = new Date(apt.date)
      aptDate.setHours(0, 0, 0, 0)
      return aptDate >= today && aptDate <= nextWeek && apt.status !== 'cancelled'
    })
    .sort((a: Appointment, b: Appointment) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5)

  // Today's appointments
  const todayAppointments = appointments.filter((apt: Appointment) => {
    const aptDate = new Date(apt.date)
    aptDate.setHours(0, 0, 0, 0)
    return aptDate.getTime() === today.getTime() && apt.status !== 'cancelled'
  })

  // Stats
  const stats = {
    totalClients: clients.length,
    scheduledAppointments: appointments.filter((a: Appointment) => a.status === 'scheduled' || a.status === 'confirmed').length,
    completedThisMonth: appointments.filter((a: Appointment) => {
      const aptDate = new Date(a.date)
      return a.status === 'completed' && aptDate >= firstDayOfMonth && aptDate <= lastDayOfMonth
    }).length,
    monthlyIncome: financeSummary?.totalIncome || 0,
    monthlyExpense: financeSummary?.totalExpense || 0,
    monthlyBalance: financeSummary?.balance || 0,
  }

  const openEditModal = (client: Client) => {
    setEditingClient(client)
    setEditForm({
      name: client.name,
      phone: client.phone,
      notes: client.notes || '',
    })
  }

  const handleSave = () => {
    if (editingClient) {
      updateMutation.mutate({ id: editingClient.id, data: editForm })
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const aptDate = new Date(date)
    aptDate.setHours(0, 0, 0, 0)

    if (aptDate.getTime() === today.getTime()) return 'Hoje'
    if (aptDate.getTime() === tomorrow.getTime()) return 'Amanhã'

    return date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'text-blue-400 bg-blue-500/20'
      case 'confirmed': return 'text-emerald-400 bg-emerald-500/20'
      case 'in_progress': return 'text-amber-400 bg-amber-500/20'
      case 'completed': return 'text-violet-400 bg-violet-500/20'
      default: return 'text-text-secondary bg-white/10'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'scheduled': return 'Agendado'
      case 'confirmed': return 'Confirmado'
      case 'in_progress': return 'Em andamento'
      case 'completed': return 'Concluído'
      default: return status
    }
  }

  const monthName = now.toLocaleDateString('pt-BR', { month: 'long' })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-text-secondary text-sm">Visão geral do seu negócio</p>
        </div>
        <p className="text-sm text-text-secondary">
          {now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Today's Alert */}
      {todayAppointments.length > 0 && (
        <Card className="bg-violet-500/10 border-violet-500/30">
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-violet-500/20">
                  <Clock className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {todayAppointments.length} agendamento{todayAppointments.length > 1 ? 's' : ''} hoje
                  </p>
                  <p className="text-xs text-text-secondary">
                    {todayAppointments.map((a: Appointment) => `${a.startTime} - ${a.client.name}`).join(' • ')}
                  </p>
                </div>
              </div>
              <Link to="/calendar">
                <Button size="sm" variant="ghost" className="text-violet-400">
                  Ver agenda <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-text-secondary">Clientes</p>
                <p className="text-xl font-bold text-text-primary">{stats.totalClients}</p>
              </div>
              <Users className="w-5 h-5 text-violet-400/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-text-secondary">Agendados</p>
                <p className="text-xl font-bold text-text-primary">{stats.scheduledAppointments}</p>
              </div>
              <CalendarCheck className="w-5 h-5 text-blue-400/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-text-secondary">Concluídos ({monthName.slice(0, 3)})</p>
                <p className="text-xl font-bold text-text-primary">{stats.completedThisMonth}</p>
              </div>
              <TrendingUp className="w-5 h-5 text-emerald-400/50" />
            </div>
          </CardContent>
        </Card>

        <Card className={stats.monthlyBalance >= 0 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}>
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-text-secondary">Saldo ({monthName.slice(0, 3)})</p>
                <p className={`text-xl font-bold ${stats.monthlyBalance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatCurrency(stats.monthlyBalance)}
                </p>
              </div>
              <DollarSign className={`w-5 h-5 ${stats.monthlyBalance >= 0 ? 'text-emerald-400/50' : 'text-red-400/50'}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Upcoming Appointments */}
        <Card>
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-violet-400" />
              <h2 className="font-medium text-text-primary text-sm">Próximos Agendamentos</h2>
            </div>
            <Link to="/calendar" className="text-xs text-violet-400 hover:text-violet-300">
              Ver todos
            </Link>
          </div>
          <div className="max-h-[280px] overflow-y-auto scrollbar-thin">
            {upcomingAppointments.length === 0 ? (
              <div className="text-center py-8 px-4">
                <Calendar className="w-8 h-8 mx-auto mb-2 text-text-secondary/30" />
                <p className="text-text-secondary text-sm">Nenhum agendamento próximo</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {upcomingAppointments.map((apt: Appointment) => (
                  <div
                    key={apt.id}
                    className="px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => navigate('/calendar')}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{apt.client.name}</p>
                        <p className="text-xs text-text-secondary truncate">{apt.title}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${getStatusColor(apt.status)}`}>
                        {getStatusLabel(apt.status)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-text-secondary">
                      <span className="font-medium text-violet-400">{formatDate(apt.date)}</span>
                      <span>•</span>
                      <span>{apt.startTime}</span>
                      <span>•</span>
                      <span>{apt.estimatedHours}h</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Financial Summary */}
        <Card>
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-violet-400" />
              <h2 className="font-medium text-text-primary text-sm">Financeiro ({monthName.slice(0, 3)})</h2>
            </div>
            <Link to="/finances" className="text-xs text-violet-400 hover:text-violet-300">
              Detalhes
            </Link>
          </div>
          <CardContent className="py-3">
            <div className="space-y-3">
              {/* Income */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-sm text-text-secondary">Receitas</span>
                </div>
                <span className="text-sm font-semibold text-emerald-400">
                  {formatCurrency(stats.monthlyIncome)}
                </span>
              </div>

              {/* Expense */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                    <TrendingDown className="w-4 h-4 text-red-400" />
                  </div>
                  <span className="text-sm text-text-secondary">Despesas</span>
                </div>
                <span className="text-sm font-semibold text-red-400">
                  {formatCurrency(stats.monthlyExpense)}
                </span>
              </div>

              {/* Divider */}
              <div className="border-t border-white/10 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-primary font-medium">Saldo</span>
                  <span className={`text-lg font-bold ${stats.monthlyBalance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatCurrency(stats.monthlyBalance)}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              {(stats.monthlyIncome + stats.monthlyExpense) > 0 && (
                <div className="h-2 bg-white/5 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-emerald-400 transition-all duration-500"
                    style={{
                      width: `${(stats.monthlyIncome / (stats.monthlyIncome + stats.monthlyExpense)) * 100}%`
                    }}
                  />
                  <div
                    className="h-full bg-red-400 transition-all duration-500"
                    style={{
                      width: `${(stats.monthlyExpense / (stats.monthlyIncome + stats.monthlyExpense)) * 100}%`
                    }}
                  />
                </div>
              )}

              {/* Quick action */}
              <Link to="/finances" className="block">
                <Button variant="secondary" className="w-full mt-2" size="sm">
                  <DollarSign className="w-4 h-4 mr-1.5" />
                  Adicionar transação
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions / Status Overview */}
        <Card>
          <div className="px-4 py-3 border-b border-white/10">
            <h2 className="font-medium text-text-primary text-sm">Ações Rápidas</h2>
          </div>
          <CardContent className="py-3">
            <div className="space-y-2">
              <Link to="/clients/new" className="block">
                <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/5 transition-colors group">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
                    <Users className="w-4 h-4 text-violet-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-text-primary group-hover:text-violet-400 transition-colors">Novo Cliente</p>
                    <p className="text-xs text-text-secondary">Cadastrar cliente</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-text-secondary group-hover:text-violet-400 transition-colors" />
                </div>
              </Link>

              <Link to="/calendar" className="block">
                <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/5 transition-colors group">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <CalendarCheck className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-text-primary group-hover:text-blue-400 transition-colors">Agendar</p>
                    <p className="text-xs text-text-secondary">Novo agendamento</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-text-secondary group-hover:text-blue-400 transition-colors" />
                </div>
              </Link>

              <Link to="/finances" className="block">
                <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/5 transition-colors group">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-text-primary group-hover:text-emerald-400 transition-colors">Lançamento</p>
                    <p className="text-xs text-text-secondary">Receita ou despesa</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-text-secondary group-hover:text-emerald-400 transition-colors" />
                </div>
              </Link>
            </div>

            {/* Tags quick view */}
            {tags && tags.length > 0 && (
              <div className="mt-4 pt-3 border-t border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-text-secondary">Tags ativas</p>
                  <Link to="/tags" className="text-xs text-violet-400 hover:text-violet-300">
                    Gerenciar
                  </Link>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {tags.slice(0, 6).map((tag: TagType) => {
                    const count = clients.filter(c => c.tags.some(t => t.tag.id === tag.id)).length
                    return (
                      <span
                        key={tag.id}
                        className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full"
                        style={{
                          backgroundColor: `${tag.color}15`,
                          color: tag.color,
                        }}
                      >
                        {tag.name}
                        <span className="opacity-60">{count}</span>
                      </span>
                    )
                  })}
                  {tags.length > 6 && (
                    <span className="text-xs text-text-secondary px-2 py-1">
                      +{tags.length - 6}
                    </span>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Clients & Transactions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Clients */}
        <Card>
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-violet-400" />
              <h2 className="font-medium text-text-primary text-sm">Clientes Recentes</h2>
            </div>
            <Link to="/clients" className="text-xs text-violet-400 hover:text-violet-300">
              Ver todos
            </Link>
          </div>
          <div className="max-h-[260px] overflow-y-auto scrollbar-thin">
            {clients.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-8 h-8 mx-auto mb-2 text-text-secondary/30" />
                <p className="text-text-secondary text-sm">Nenhum cliente</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {clients.slice(0, 5).map((client) => (
                  <div
                    key={client.id}
                    className="px-4 py-2.5 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer group"
                    onClick={() => navigate(`/clients/${client.id}`)}
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-text-primary text-sm truncate">{client.name}</p>
                      <p className="text-xs text-text-secondary flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {client.phone}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {client.tags.slice(0, 1).map((t) => (
                        <span
                          key={t.tagId}
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: `${t.tag.color}20`,
                            color: t.tag.color,
                          }}
                        >
                          {t.tag.name}
                        </span>
                      ))}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          openEditModal(client)
                        }}
                        className="p-1 rounded hover:bg-white/10 text-text-secondary hover:text-text-primary opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-violet-400" />
              <h2 className="font-medium text-text-primary text-sm">Últimas Transações</h2>
            </div>
            <Link to="/finances" className="text-xs text-violet-400 hover:text-violet-300">
              Ver todas
            </Link>
          </div>
          <div className="max-h-[260px] overflow-y-auto scrollbar-thin">
            {recentTransactions.length === 0 ? (
              <div className="text-center py-8">
                <DollarSign className="w-8 h-8 mx-auto mb-2 text-text-secondary/30" />
                <p className="text-text-secondary text-sm">Nenhuma transação</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {recentTransactions.slice(0, 5).map((transaction: Transaction) => (
                  <div
                    key={transaction.id}
                    className="px-4 py-2.5 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => navigate('/finances')}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${transaction.category?.color || '#8b5cf6'}15` }}
                      >
                        {transaction.type === 'income' ? (
                          <TrendingUp className="w-4 h-4" style={{ color: transaction.category?.color || '#34d399' }} />
                        ) : (
                          <TrendingDown className="w-4 h-4" style={{ color: transaction.category?.color || '#f87171' }} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-text-primary truncate">{transaction.description}</p>
                        <p className="text-xs text-text-secondary">
                          {new Date(transaction.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                          {transaction.category && (
                            <span style={{ color: transaction.category.color }}> • {transaction.category.name}</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <p className={`text-sm font-semibold shrink-0 ${
                      transaction.type === 'income' ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Quick Edit Modal */}
      <Modal
        isOpen={!!editingClient}
        onClose={() => setEditingClient(null)}
        title="Edição Rápida"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Nome"
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
          />
          <Input
            label="Telefone"
            value={editForm.phone}
            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Observações
            </label>
            <textarea
              className="w-full px-3 py-2.5 bg-surface border border-white/10 rounded-xl text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none text-sm"
              rows={3}
              value={editForm.notes}
              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
            />
          </div>
          {editingClient && editingClient.tags.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Tags</label>
              <div className="flex flex-wrap gap-1.5">
                {editingClient.tags.map((t) => (
                  <span
                    key={t.tagId}
                    className="text-xs px-2.5 py-1 rounded-full"
                    style={{
                      backgroundColor: `${t.tag.color}20`,
                      color: t.tag.color,
                    }}
                  >
                    {t.tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t border-white/10">
            <Link to={editingClient ? `/clients/${editingClient.id}` : '#'}>
              <Button variant="ghost" size="sm">
                Ver perfil completo
              </Button>
            </Link>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setEditingClient(null)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleSave} isLoading={updateMutation.isPending}>
                <Save className="w-4 h-4 mr-1" />
                Salvar
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
