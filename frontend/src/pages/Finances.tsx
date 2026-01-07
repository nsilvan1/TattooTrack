import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  Calendar,
  Filter,
  Trash2,
  Edit2,
  ArrowUpCircle,
  ArrowDownCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { Card, CardContent, Button, Input, Modal } from '../components/ui'
import { transactionsApi, categoriesApi, financesApi } from '../services/api'
import type { Transaction, Category, CreateTransactionData, TransactionType, FinancialSummary, CategorySummary } from '../types'

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

export default function Finances() {
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [formData, setFormData] = useState<TransactionFormData>(initialFormData)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [filterType, setFilterType] = useState<TransactionType | ''>('')
  const [filterCategoryId, setFilterCategoryId] = useState('')

  // Date filters - default to current month
  const now = new Date()
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  const [startDate, setStartDate] = useState(firstDayOfMonth.toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(lastDayOfMonth.toISOString().split('T')[0])

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

  const formatCurrency = (value: number) => `R$ ${value.toFixed(2)}`

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('pt-BR')
  }

  const isFormValid = formData.amount && formData.description && formData.categoryId && formData.date

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Financeiro</h1>
          <p className="text-text-secondary mt-1">Gerencie suas receitas e despesas</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => openNewTransaction('expense')}
            className="flex items-center gap-2"
          >
            <ArrowDownCircle className="w-4 h-4 text-red-400" />
            Nova Despesa
          </Button>
          <Button
            onClick={() => openNewTransaction('income')}
            className="flex items-center gap-2"
          >
            <ArrowUpCircle className="w-4 h-4" />
            Nova Receita
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/20">
              <TrendingUp className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-text-secondary text-sm">Receitas</p>
              <p className="text-2xl font-bold text-emerald-400">
                {loadingSummary ? '...' : formatCurrency(summary?.totalIncome || 0)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-red-500/20">
              <TrendingDown className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <p className="text-text-secondary text-sm">Despesas</p>
              <p className="text-2xl font-bold text-red-400">
                {loadingSummary ? '...' : formatCurrency(summary?.totalExpense || 0)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${(summary?.balance || 0) >= 0 ? 'bg-violet-500/20' : 'bg-red-500/20'}`}>
              <DollarSign className={`w-6 h-6 ${(summary?.balance || 0) >= 0 ? 'text-violet-400' : 'text-red-400'}`} />
            </div>
            <div>
              <p className="text-text-secondary text-sm">Saldo</p>
              <p className={`text-2xl font-bold ${(summary?.balance || 0) >= 0 ? 'text-violet-400' : 'text-red-400'}`}>
                {loadingSummary ? '...' : formatCurrency(summary?.balance || 0)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-text-secondary" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-1.5 glass rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              />
              <span className="text-text-secondary">ate</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-1.5 glass rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-text-secondary" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as TransactionType | '')}
                className="px-3 py-1.5 glass rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 bg-transparent"
              >
                <option value="">Todos os tipos</option>
                <option value="income">Receitas</option>
                <option value="expense">Despesas</option>
              </select>

              <select
                value={filterCategoryId}
                onChange={(e) => setFilterCategoryId(e.target.value)}
                className="px-3 py-1.5 glass rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 bg-transparent"
              >
                <option value="">Todas as categorias</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Transactions List */}
        <div className="lg:col-span-2">
          <Card>
            <div className="px-6 py-4 border-b border-white/10">
              <h2 className="font-semibold text-text-primary">Transacoes</h2>
            </div>
            <CardContent className="p-0">
              {loadingTransactions ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-text-secondary animate-spin" />
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-12 text-text-secondary">
                  <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhuma transacao encontrada</p>
                  <p className="text-sm mt-1">Adicione sua primeira receita ou despesa</p>
                </div>
              ) : (
                <div className="divide-y divide-white/10">
                  {transactions.map(transaction => (
                    <div
                      key={transaction.id}
                      className="px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer"
                      onClick={() => openEditTransaction(transaction)}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: `${transaction.category.color}20` }}
                        >
                          {transaction.type === 'income' ? (
                            <ArrowUpCircle className="w-5 h-5" style={{ color: transaction.category.color }} />
                          ) : (
                            <ArrowDownCircle className="w-5 h-5" style={{ color: transaction.category.color }} />
                          )}
                        </div>
                        <div>
                          <p className="text-text-primary font-medium">{transaction.description}</p>
                          <div className="flex items-center gap-2 text-sm text-text-secondary">
                            <span
                              className="px-2 py-0.5 rounded text-xs"
                              style={{
                                backgroundColor: `${transaction.category.color}20`,
                                color: transaction.category.color,
                              }}
                            >
                              {transaction.category.name}
                            </span>
                            <span>{formatDate(transaction.date)}</span>
                            {transaction.isAutomatic && (
                              <span className="text-xs text-violet-400">(automatico)</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <p className={`font-semibold ${transaction.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {transaction.type === 'income' ? '+' : '-'} {formatCurrency(transaction.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Category Breakdown */}
        <div>
          <Card>
            <div className="px-6 py-4 border-b border-white/10">
              <h2 className="font-semibold text-text-primary">Por Categoria</h2>
            </div>
            <CardContent>
              {categoryBreakdown.length === 0 ? (
                <p className="text-text-secondary text-center py-4">Sem dados</p>
              ) : (
                <div className="space-y-4">
                  {categoryBreakdown.map(item => (
                    <div key={item.category?.id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-text-primary text-sm">{item.category?.name}</span>
                        <span className="text-text-secondary text-sm">{formatCurrency(item.total)}</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${item.percentage}%`,
                            backgroundColor: item.category?.color,
                          }}
                        />
                      </div>
                      <p className="text-xs text-text-secondary mt-1">
                        {item.count} transacao(es) - {item.percentage.toFixed(1)}%
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Transaction Modal */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editingTransaction ? 'Editar Transacao' : 'Nova Transacao'}
      >
        <div className="space-y-4">
          {/* Type Toggle */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setFormData({ ...formData, type: 'income', categoryId: '' })
              }}
              className={`flex-1 py-2 rounded-xl font-medium transition-all ${
                formData.type === 'income'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'glass text-text-secondary hover:text-text-primary'
              }`}
            >
              <ArrowUpCircle className="w-4 h-4 inline mr-2" />
              Receita
            </button>
            <button
              type="button"
              onClick={() => {
                setFormData({ ...formData, type: 'expense', categoryId: '' })
              }}
              className={`flex-1 py-2 rounded-xl font-medium transition-all ${
                formData.type === 'expense'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'glass text-text-secondary hover:text-text-primary'
              }`}
            >
              <ArrowDownCircle className="w-4 h-4 inline mr-2" />
              Despesa
            </button>
          </div>

          <Input
            label="Valor (R$)"
            type="number"
            placeholder="0.00"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          />

          <Input
            label="Descricao"
            placeholder="Ex: Sessao de tatuagem, Compra de tinta..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />

          <Input
            label="Data"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          />

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Categoria</label>
            <select
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              className="w-full px-3 py-2 glass rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-violet-500/50 bg-transparent"
            >
              <option value="">Selecione uma categoria</option>
              {filteredCategories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Observacoes (opcional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Anotacoes adicionais..."
              rows={2}
              className="w-full px-3 py-2 glass rounded-xl text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            {editingTransaction && !editingTransaction.isAutomatic ? (
              showDeleteConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-red-400">Confirmar exclusao?</span>
                  <Button variant="danger" size="sm" onClick={handleDelete}>
                    Sim, excluir
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(false)}>
                    Cancelar
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-red-400 hover:text-red-300"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </Button>
              )
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={closeModal}>
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!isFormValid || createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {editingTransaction ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </div>

          {editingTransaction?.isAutomatic && (
            <p className="text-xs text-amber-400 text-center">
              Esta transacao foi gerada automaticamente e nao pode ser excluida.
            </p>
          )}
        </div>
      </Modal>
    </div>
  )
}
