import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Trash2,
  ArrowUpCircle,
  ArrowDownCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  PieChart,
  Wallet,
  Filter,
} from 'lucide-react'
import { Card, CardContent, Button, Input, Modal } from '../components/ui'
import { transactionsApi, categoriesApi, financesApi } from '../services/api'
import type { Transaction, CreateTransactionData, TransactionType } from '../types'

interface TransactionFormData {
  type: TransactionType
  amount: string
  description: string
  date: string
  categoryId: string
  notes: string
}

const initialFormData: TransactionFormData = {
  type: 'income',
  amount: '',
  description: '',
  date: new Date().toISOString().split('T')[0],
  categoryId: '',
  notes: '',
}

const MONTHS_SHORT = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
]

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

export default function Finances() {
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [formData, setFormData] = useState<TransactionFormData>(initialFormData)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [filterType, setFilterType] = useState<TransactionType | ''>('')
  const [filterCategoryId, setFilterCategoryId] = useState('')

  // Date navigation - default to current month
  const now = new Date()
  const [currentMonth, setCurrentMonth] = useState(now.getMonth())
  const [currentYear, setCurrentYear] = useState(now.getFullYear())

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1)
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0)
  const startDate = firstDayOfMonth.toISOString().split('T')[0]
  const endDate = lastDayOfMonth.toISOString().split('T')[0]

  // Navigation functions
  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  const goToCurrentMonth = () => {
    setCurrentMonth(now.getMonth())
    setCurrentYear(now.getFullYear())
  }

  const isCurrentMonth = currentMonth === now.getMonth() && currentYear === now.getFullYear()

  // Queries
  const { data: categories = [], isLoading: loadingCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list(),
  })

  const { data: transactions = [], isLoading: loadingTransactions } = useQuery({
    queryKey: ['transactions', startDate, endDate, filterType, filterCategoryId],
    queryFn: () => transactionsApi.list({
      startDate,
      endDate,
      type: filterType || undefined,
      categoryId: filterCategoryId || undefined,
    }),
  })

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['finances-summary', startDate, endDate],
    queryFn: () => financesApi.getSummary(startDate, endDate),
  })

  const { data: categoryBreakdown = [] } = useQuery({
    queryKey: ['finances-by-category', startDate, endDate],
    queryFn: () => financesApi.getByCategory(startDate, endDate),
  })

  // Seed categories if empty
  const seedMutation = useMutation({
    mutationFn: () => categoriesApi.seed(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })

  useEffect(() => {
    if (!loadingCategories && categories.length === 0) {
      seedMutation.mutate()
    }
  }, [loadingCategories, categories.length])

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: CreateTransactionData) => transactionsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['finances-summary'] })
      queryClient.invalidateQueries({ queryKey: ['finances-by-category'] })
      closeModal()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateTransactionData> }) =>
      transactionsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['finances-summary'] })
      queryClient.invalidateQueries({ queryKey: ['finances-by-category'] })
      closeModal()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => transactionsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['finances-summary'] })
      queryClient.invalidateQueries({ queryKey: ['finances-by-category'] })
      closeModal()
    },
  })

  const closeModal = () => {
    setShowModal(false)
    setEditingTransaction(null)
    setFormData(initialFormData)
    setShowDeleteConfirm(false)
  }

  const openNewTransaction = (type: TransactionType = 'income') => {
    setFormData({ ...initialFormData, type })
    setEditingTransaction(null)
    setShowModal(true)
  }

  const openEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction)
    setFormData({
      type: transaction.type,
      amount: transaction.amount.toString(),
      description: transaction.description,
      date: transaction.date.split('T')[0],
      categoryId: transaction.categoryId,
      notes: transaction.notes || '',
    })
    setShowModal(true)
  }

  const handleSubmit = () => {
    const data: CreateTransactionData = {
      type: formData.type,
      amount: parseFloat(formData.amount),
      description: formData.description,
      date: formData.date,
      categoryId: formData.categoryId,
      notes: formData.notes || undefined,
    }

    if (editingTransaction) {
      updateMutation.mutate({ id: editingTransaction.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleDelete = () => {
    if (editingTransaction) {
      deleteMutation.mutate(editingTransaction.id)
    }
  }

  const filteredCategories = categories.filter(c => c.type === formData.type)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const formatCurrencyCompact = (value: number) => {
    if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(1)}k`
    }
    return formatCurrency(value)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  }

  const isFormValid = formData.amount && formData.description && formData.categoryId && formData.date

  // Separate income and expense categories for breakdown
  const incomeBreakdown = categoryBreakdown.filter(item => item.category?.type === 'income')
  const expenseBreakdown = categoryBreakdown.filter(item => item.category?.type === 'expense')

  // Calculate totals for percentage calculations within each type
  const totalIncome = incomeBreakdown.reduce((sum, item) => sum + item.total, 0)
  const totalExpense = expenseBreakdown.reduce((sum, item) => sum + item.total, 0)

  // Filter categories for dropdown
  const filterCategories = filterType
    ? categories.filter(c => c.type === filterType)
    : categories

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-text-primary">Financeiro</h1>
          <p className="text-text-secondary text-xs sm:text-sm">Controle de receitas e despesas</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            size="sm"
            onClick={() => openNewTransaction('income')}
            className="flex-1 sm:flex-none bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30"
          >
            <ArrowUpCircle className="w-4 h-4 sm:mr-1.5" />
            <span className="hidden sm:inline">Receita</span>
          </Button>
          <Button
            size="sm"
            onClick={() => openNewTransaction('expense')}
            className="flex-1 sm:flex-none bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20"
          >
            <ArrowDownCircle className="w-4 h-4 sm:mr-1.5" />
            <span className="hidden sm:inline">Despesa</span>
          </Button>
        </div>
      </div>

      {/* Summary Cards - Compact */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Card className="bg-emerald-500/5 border-emerald-500/20">
          <CardContent className="py-2 sm:py-3 px-2 sm:px-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <div className="min-w-0">
                <p className="text-text-secondary text-[10px] sm:text-xs">Receitas</p>
                <p className="text-sm font-bold text-emerald-400 truncate sm:hidden">
                  {loadingSummary ? '...' : formatCurrencyCompact(summary?.totalIncome || 0)}
                </p>
                <p className="text-lg font-bold text-emerald-400 hidden sm:block">
                  {loadingSummary ? '...' : formatCurrency(summary?.totalIncome || 0)}
                </p>
              </div>
              <TrendingUp className="w-5 h-5 text-emerald-400/50 hidden sm:block" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-500/5 border-red-500/20">
          <CardContent className="py-2 sm:py-3 px-2 sm:px-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <div className="min-w-0">
                <p className="text-text-secondary text-[10px] sm:text-xs">Despesas</p>
                <p className="text-sm font-bold text-red-400 truncate sm:hidden">
                  {loadingSummary ? '...' : formatCurrencyCompact(summary?.totalExpense || 0)}
                </p>
                <p className="text-lg font-bold text-red-400 hidden sm:block">
                  {loadingSummary ? '...' : formatCurrency(summary?.totalExpense || 0)}
                </p>
              </div>
              <TrendingDown className="w-5 h-5 text-red-400/50 hidden sm:block" />
            </div>
          </CardContent>
        </Card>

        <Card className={`${(summary?.balance || 0) >= 0 ? 'bg-violet-500/5 border-violet-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
          <CardContent className="py-2 sm:py-3 px-2 sm:px-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <div className="min-w-0">
                <p className="text-text-secondary text-[10px] sm:text-xs">Saldo</p>
                <p className={`text-sm font-bold truncate sm:hidden ${(summary?.balance || 0) >= 0 ? 'text-violet-400' : 'text-red-400'}`}>
                  {loadingSummary ? '...' : formatCurrencyCompact(summary?.balance || 0)}
                </p>
                <p className={`text-lg font-bold hidden sm:block ${(summary?.balance || 0) >= 0 ? 'text-violet-400' : 'text-red-400'}`}>
                  {loadingSummary ? '...' : formatCurrency(summary?.balance || 0)}
                </p>
              </div>
              <DollarSign className={`w-5 h-5 hidden sm:block ${(summary?.balance || 0) >= 0 ? 'text-violet-400/50' : 'text-red-400/50'}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Bar */}
      <Card>
        <CardContent className="py-3 px-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Month Navigation */}
            <div className="flex items-center gap-1 mr-2">
              <button
                onClick={goToPreviousMonth}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-text-secondary" />
              </button>
              <button
                onClick={goToCurrentMonth}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  isCurrentMonth
                    ? 'bg-violet-500/20 text-violet-400'
                    : 'hover:bg-white/10 text-text-primary'
                }`}
              >
                {MONTHS_SHORT[currentMonth]} {currentYear}
              </button>
              <button
                onClick={goToNextMonth}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-text-secondary" />
              </button>
            </div>

            <div className="w-px h-6 bg-white/10" />

            {/* Type Filter */}
            <div className="flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-text-secondary" />
              <select
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value as TransactionType | '')
                  setFilterCategoryId('')
                }}
                className="px-2 py-1.5 text-sm rounded-lg bg-surface border border-white/10 text-text-primary focus:outline-none focus:ring-1 focus:ring-violet-500/50"
              >
                <option value="">Todos</option>
                <option value="income">Receitas</option>
                <option value="expense">Despesas</option>
              </select>
            </div>

            {/* Category Filter */}
            <select
              value={filterCategoryId}
              onChange={(e) => setFilterCategoryId(e.target.value)}
              className="px-2 py-1.5 text-sm rounded-lg bg-surface border border-white/10 text-text-primary focus:outline-none focus:ring-1 focus:ring-violet-500/50 max-w-[180px]"
            >
              <option value="">Todas categorias</option>
              {filterCategories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>

            {/* Clear filters */}
            {(filterType || filterCategoryId) && (
              <button
                onClick={() => {
                  setFilterType('')
                  setFilterCategoryId('')
                }}
                className="text-xs text-text-secondary hover:text-text-primary transition-colors"
              >
                Limpar
              </button>
            )}

            {/* Transaction count */}
            <span className="ml-auto text-xs text-text-secondary">
              {transactions.length} transação{transactions.length !== 1 ? 'ões' : ''}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Transactions List */}
        <div className="xl:col-span-2">
          <Card className="h-full">
            <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-violet-400" />
              <h2 className="font-medium text-text-primary text-sm">Transações</h2>
            </div>

            {loadingTransactions ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 text-text-secondary animate-spin" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-10 px-4">
                <DollarSign className="w-10 h-10 mx-auto mb-2 text-text-secondary/30" />
                <p className="text-text-secondary text-sm">Nenhuma transação em {MONTHS[currentMonth]}</p>
              </div>
            ) : (
              <div className="max-h-[400px] overflow-y-auto scrollbar-thin">
                <div className="divide-y divide-white/5">
                  {transactions.map(transaction => (
                    <div
                      key={transaction.id}
                      className="px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer"
                      onClick={() => openEditTransaction(transaction)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${transaction.category.color}15` }}
                        >
                          {transaction.type === 'income' ? (
                            <TrendingUp className="w-4 h-4" style={{ color: transaction.category.color }} />
                          ) : (
                            <TrendingDown className="w-4 h-4" style={{ color: transaction.category.color }} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-text-primary text-sm font-medium truncate">{transaction.description}</p>
                          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                            <span>{formatDate(transaction.date)}</span>
                            <span>•</span>
                            <span className="truncate" style={{ color: transaction.category.color }}>
                              {transaction.category.name}
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className={`text-sm font-semibold shrink-0 ml-3 ${
                        transaction.type === 'income' ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Category Breakdown */}
        <div className="space-y-4">
          {/* Income Categories */}
          {incomeBreakdown.length > 0 && (
            <Card>
              <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <h3 className="font-medium text-text-primary text-sm">Receitas</h3>
                <span className="ml-auto text-xs text-emerald-400">{formatCurrencyCompact(totalIncome)}</span>
              </div>
              <CardContent className="py-2 px-4 max-h-[160px] overflow-y-auto scrollbar-thin">
                <div className="space-y-2">
                  {incomeBreakdown.map(item => {
                    const percentage = totalIncome > 0 ? (item.total / totalIncome) * 100 : 0
                    return (
                      <div key={item.category?.id} className="group">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-text-primary truncate">{item.category?.name}</span>
                          <span className="text-text-secondary">{percentage.toFixed(0)}%</span>
                        </div>
                        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%`, backgroundColor: item.category?.color }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Expense Categories */}
          {expenseBreakdown.length > 0 && (
            <Card>
              <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <h3 className="font-medium text-text-primary text-sm">Despesas</h3>
                <span className="ml-auto text-xs text-red-400">{formatCurrencyCompact(totalExpense)}</span>
              </div>
              <CardContent className="py-2 px-4 max-h-[160px] overflow-y-auto scrollbar-thin">
                <div className="space-y-2">
                  {expenseBreakdown.map(item => {
                    const percentage = totalExpense > 0 ? (item.total / totalExpense) * 100 : 0
                    return (
                      <div key={item.category?.id} className="group">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-text-primary truncate">{item.category?.name}</span>
                          <span className="text-text-secondary">{percentage.toFixed(0)}%</span>
                        </div>
                        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%`, backgroundColor: item.category?.color }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty state */}
          {incomeBreakdown.length === 0 && expenseBreakdown.length === 0 && !loadingSummary && (
            <Card>
              <CardContent className="text-center py-6">
                <PieChart className="w-8 h-8 mx-auto mb-2 text-text-secondary/30" />
                <p className="text-text-secondary text-xs">Dados aparecerão aqui</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Transaction Modal */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editingTransaction ? 'Editar Transação' : 'Nova Transação'}
      >
        <div className="space-y-4">
          {/* Type Toggle */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: 'income', categoryId: '' })}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                formData.type === 'income'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'glass text-text-secondary hover:text-text-primary hover:bg-white/5'
              }`}
            >
              <ArrowUpCircle className="w-4 h-4" />
              Receita
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: 'expense', categoryId: '' })}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                formData.type === 'expense'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'glass text-text-secondary hover:text-text-primary hover:bg-white/5'
              }`}
            >
              <ArrowDownCircle className="w-4 h-4" />
              Despesa
            </button>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Valor</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm">R$</span>
              <input
                type="number"
                placeholder="0,00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 bg-surface border border-white/10 rounded-xl text-text-primary font-medium placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                step="0.01"
                min="0"
              />
            </div>
          </div>

          <Input
            label="Descrição"
            placeholder="Ex: Sessão de tatuagem..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />

          <Input
            label="Data"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          />

          {/* Category Select */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Categoria</label>
            <select
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-violet-500/50 appearance-none cursor-pointer bg-surface border border-white/10"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 12px center',
                backgroundSize: '16px',
              }}
            >
              <option value="" className="bg-surface text-text-secondary">Selecione...</option>
              {filteredCategories.map(cat => (
                <option key={cat.id} value={cat.id} className="bg-surface text-text-primary">
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Observações <span className="text-text-secondary/50 font-normal">(opcional)</span>
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Anotações..."
              rows={2}
              className="w-full px-3 py-2.5 bg-surface border border-white/10 rounded-xl text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none text-sm"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-white/10">
            {editingTransaction && !editingTransaction.isAutomatic ? (
              showDeleteConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-400">Confirmar?</span>
                  <Button variant="danger" size="sm" onClick={handleDelete}>Sim</Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(false)}>Não</Button>
                </div>
              ) : (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-1.5 text-text-secondary hover:text-red-400 transition-colors text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir
                </button>
              )
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={closeModal}>Cancelar</Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={!isFormValid || createMutation.isPending || updateMutation.isPending}
                className={formData.type === 'income' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'}
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                )}
                {editingTransaction ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </div>

          {editingTransaction?.isAutomatic && (
            <p className="text-xs text-amber-400 text-center bg-amber-500/10 rounded-lg py-2">
              Transação automática - não pode ser editada
            </p>
          )}
        </div>
      </Modal>
    </div>
  )
}
