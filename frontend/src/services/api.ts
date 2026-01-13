import axios from 'axios'
import type { Client, CreateClientData, UpdateClientData, Tag, PaginatedResponse, ClientFilters, Tattoo, Reference, Appointment, CreateAppointmentData, UpdateAppointmentData, AppointmentFilters, AppointmentStatus, Category, Transaction, CreateTransactionData, UpdateTransactionData, TransactionFilters, FinancialSummary, CategorySummary, TransactionType, ConversionStats, ProductCategory, Product, CreateProductData, UpdateProductData, ProductFilters, StockMovement, CreateStockMovementData, InventoryStats, BatchStockMovementData, BatchStockMovementResponse, Report, CreateReportData, UpdateReportData, ReportResponse, ReportStats, ReportStatus, ReportType, ReportPriority, Notification } from '../types'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
})

// Interceptor para adicionar token em todas as requisições
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Clients
export const clientsApi = {
  list: async (filters?: ClientFilters, page = 1, limit = 10): Promise<PaginatedResponse<Client>> => {
    const params = new URLSearchParams()
    params.append('page', String(page))
    params.append('limit', String(limit))
    if (filters?.search) params.append('search', filters.search)
    if (filters?.tagIds?.length) params.append('tagIds', filters.tagIds.join(','))

    const { data } = await api.get(`/clients?${params}`)
    return data
  },

  get: async (id: string): Promise<Client> => {
    const { data } = await api.get(`/clients/${id}`)
    return data
  },

  getConversionStats: async (): Promise<ConversionStats> => {
    const { data } = await api.get('/clients/stats/conversion')
    return data
  },

  create: async (clientData: CreateClientData): Promise<Client> => {
    const { data } = await api.post('/clients', clientData)
    return data
  },

  update: async (id: string, clientData: UpdateClientData): Promise<Client> => {
    const { data } = await api.put(`/clients/${id}`, clientData)
    return data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/clients/${id}`)
  },

  addTag: async (clientId: string, tagId: string): Promise<void> => {
    await api.post(`/clients/${clientId}/tags`, { tagId })
  },

  removeTag: async (clientId: string, tagId: string): Promise<void> => {
    await api.delete(`/clients/${clientId}/tags/${tagId}`)
  },
}

// Tags
export const tagsApi = {
  list: async (): Promise<Tag[]> => {
    const { data } = await api.get('/tags')
    return data
  },

  create: async (name: string, color: string): Promise<Tag> => {
    const { data } = await api.post('/tags', { name, color })
    return data
  },

  update: async (id: string, name: string, color: string): Promise<Tag> => {
    const { data } = await api.put(`/tags/${id}`, { name, color })
    return data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/tags/${id}`)
  },
}

// Tattoos
export const tattoosApi = {
  list: async (clientId: string): Promise<Tattoo[]> => {
    const { data } = await api.get(`/clients/${clientId}/tattoos`)
    return data
  },

  create: async (clientId: string, tattooData: Omit<Tattoo, 'id' | 'clientId' | 'createdAt'>): Promise<Tattoo> => {
    const { data } = await api.post(`/clients/${clientId}/tattoos`, tattooData)
    return data
  },

  update: async (id: string, tattooData: Partial<Tattoo>): Promise<Tattoo> => {
    const { data } = await api.put(`/tattoos/${id}`, tattooData)
    return data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/tattoos/${id}`)
  },
}

// References
export const referencesApi = {
  upload: async (clientId: string, file: File, notes?: string): Promise<Reference> => {
    const formData = new FormData()
    formData.append('image', file)
    if (notes) formData.append('notes', notes)

    const { data } = await api.post(`/clients/${clientId}/references`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/references/${id}`)
  },
}

// Upload
export const uploadApi = {
  upload: async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('image', file)

    const { data } = await api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data.url
  },
}

// Appointments
export const appointmentsApi = {
  list: async (filters?: AppointmentFilters): Promise<Appointment[]> => {
    const params = new URLSearchParams()
    if (filters?.startDate) params.append('startDate', filters.startDate)
    if (filters?.endDate) params.append('endDate', filters.endDate)
    if (filters?.status) params.append('status', filters.status)
    if (filters?.clientId) params.append('clientId', filters.clientId)

    const { data } = await api.get(`/appointments?${params}`)
    return data
  },

  get: async (id: string): Promise<Appointment> => {
    const { data } = await api.get(`/appointments/${id}`)
    return data
  },

  getByMonth: async (year: number, month: number): Promise<Appointment[]> => {
    const { data } = await api.get(`/appointments/calendar/${year}/${month}`)
    return data
  },

  create: async (appointmentData: CreateAppointmentData): Promise<Appointment> => {
    const { data } = await api.post('/appointments', appointmentData)
    return data
  },

  update: async (id: string, appointmentData: UpdateAppointmentData): Promise<Appointment> => {
    const { data } = await api.put(`/appointments/${id}`, appointmentData)
    return data
  },

  updateStatus: async (id: string, status: AppointmentStatus): Promise<Appointment> => {
    const { data } = await api.patch(`/appointments/${id}/status`, { status })
    return data
  },

  updateDeposit: async (id: string, depositPaid: boolean, depositAmount?: number): Promise<Appointment> => {
    const { data } = await api.patch(`/appointments/${id}/deposit`, { depositPaid, depositAmount })
    return data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/appointments/${id}`)
  },
}

// Categories
export const categoriesApi = {
  list: async (type?: TransactionType): Promise<Category[]> => {
    const params = new URLSearchParams()
    if (type) params.append('type', type)
    const { data } = await api.get(`/categories?${params}`)
    return data
  },

  create: async (categoryData: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<Category> => {
    const { data } = await api.post('/categories', categoryData)
    return data
  },

  update: async (id: string, categoryData: Partial<Category>): Promise<Category> => {
    const { data } = await api.put(`/categories/${id}`, categoryData)
    return data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/categories/${id}`)
  },

  seed: async (): Promise<{ created: number; categories: Category[] }> => {
    const { data } = await api.post('/categories/seed')
    return data
  },
}

// Transactions
export const transactionsApi = {
  list: async (filters?: TransactionFilters): Promise<Transaction[]> => {
    const params = new URLSearchParams()
    if (filters?.startDate) params.append('startDate', filters.startDate)
    if (filters?.endDate) params.append('endDate', filters.endDate)
    if (filters?.type) params.append('type', filters.type)
    if (filters?.categoryId) params.append('categoryId', filters.categoryId)

    const { data } = await api.get(`/transactions?${params}`)
    return data
  },

  get: async (id: string): Promise<Transaction> => {
    const { data } = await api.get(`/transactions/${id}`)
    return data
  },

  create: async (transactionData: CreateTransactionData): Promise<Transaction> => {
    const { data } = await api.post('/transactions', transactionData)
    return data
  },

  update: async (id: string, transactionData: UpdateTransactionData): Promise<Transaction> => {
    const { data } = await api.put(`/transactions/${id}`, transactionData)
    return data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/transactions/${id}`)
  },
}

// Finances
export const financesApi = {
  getSummary: async (startDate?: string, endDate?: string): Promise<FinancialSummary> => {
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)

    const { data } = await api.get(`/finances/summary?${params}`)
    return data
  },

  getByCategory: async (startDate?: string, endDate?: string, type?: TransactionType): Promise<CategorySummary[]> => {
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)
    if (type) params.append('type', type)

    const { data } = await api.get(`/finances/by-category?${params}`)
    return data
  },
}

// Inventory - Product Categories
export const productCategoriesApi = {
  list: async (): Promise<ProductCategory[]> => {
    const { data } = await api.get('/inventory/categories')
    return data
  },

  create: async (categoryData: { name: string; color: string; icon?: string }): Promise<ProductCategory> => {
    const { data } = await api.post('/inventory/categories', categoryData)
    return data
  },

  update: async (id: string, categoryData: { name: string; color: string; icon?: string }): Promise<ProductCategory> => {
    const { data } = await api.put(`/inventory/categories/${id}`, categoryData)
    return data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/inventory/categories/${id}`)
  },
}

// Inventory - Products
export const productsApi = {
  list: async (filters?: ProductFilters): Promise<Product[]> => {
    const params = new URLSearchParams()
    if (filters?.search) params.append('search', filters.search)
    if (filters?.categoryId) params.append('categoryId', filters.categoryId)
    if (filters?.lowStock) params.append('lowStock', 'true')
    if (filters?.isActive !== undefined) params.append('isActive', String(filters.isActive))

    const { data } = await api.get(`/inventory/products?${params}`)
    return data
  },

  get: async (id: string): Promise<Product & { movements: StockMovement[] }> => {
    const { data } = await api.get(`/inventory/products/${id}`)
    return data
  },

  create: async (productData: CreateProductData): Promise<Product> => {
    const { data } = await api.post('/inventory/products', productData)
    return data
  },

  update: async (id: string, productData: UpdateProductData): Promise<Product> => {
    const { data } = await api.put(`/inventory/products/${id}`, productData)
    return data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/inventory/products/${id}`)
  },
}

// Inventory - Stock Movements
export const stockMovementsApi = {
  list: async (filters?: { productId?: string; type?: string; startDate?: string; endDate?: string; appointmentId?: string; limit?: number }): Promise<StockMovement[]> => {
    const params = new URLSearchParams()
    if (filters?.productId) params.append('productId', filters.productId)
    if (filters?.type) params.append('type', filters.type)
    if (filters?.startDate) params.append('startDate', filters.startDate)
    if (filters?.endDate) params.append('endDate', filters.endDate)
    if (filters?.appointmentId) params.append('appointmentId', filters.appointmentId)
    if (filters?.limit) params.append('limit', String(filters.limit))

    const { data } = await api.get(`/inventory/movements?${params}`)
    return data
  },

  create: async (movementData: CreateStockMovementData): Promise<StockMovement & { newStock: number }> => {
    const { data } = await api.post('/inventory/movements', movementData)
    return data
  },

  createBatch: async (batchData: BatchStockMovementData): Promise<BatchStockMovementResponse> => {
    const { data } = await api.post('/inventory/movements/batch', batchData)
    return data
  },
}

// Inventory - Stats
export const inventoryApi = {
  getStats: async (): Promise<InventoryStats> => {
    const { data } = await api.get('/inventory/stats')
    return data
  },
}

// Reports
export const reportsApi = {
  list: async (filters?: { status?: ReportStatus; type?: ReportType; priority?: ReportPriority }): Promise<Report[]> => {
    const params = new URLSearchParams()
    if (filters?.status) params.append('status', filters.status)
    if (filters?.type) params.append('type', filters.type)
    if (filters?.priority) params.append('priority', filters.priority)
    const { data } = await api.get(`/reports?${params}`)
    return data
  },

  get: async (id: string): Promise<Report> => {
    const { data } = await api.get(`/reports/${id}`)
    return data
  },

  create: async (reportData: CreateReportData): Promise<Report> => {
    const { data } = await api.post('/reports', reportData)
    return data
  },

  update: async (id: string, reportData: UpdateReportData): Promise<Report> => {
    const { data } = await api.patch(`/reports/${id}`, reportData)
    return data
  },

  addResponse: async (reportId: string, message: string): Promise<ReportResponse> => {
    const { data } = await api.post(`/reports/${reportId}/responses`, { message })
    return data
  },

  uploadScreenshots: async (files: File[]): Promise<{ urls: string[] }> => {
    const formData = new FormData()
    files.forEach(file => formData.append('screenshots', file))
    const { data } = await api.post('/reports/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  getStats: async (): Promise<ReportStats> => {
    const { data } = await api.get('/reports/admin/stats')
    return data
  },
}

// Notifications
export const notificationsApi = {
  list: async (): Promise<Notification[]> => {
    const { data } = await api.get('/notifications')
    return data
  },

  getUnreadCount: async (): Promise<{ count: number }> => {
    const { data } = await api.get('/notifications/unread-count')
    return data
  },

  markAsRead: async (id: string): Promise<void> => {
    await api.patch(`/notifications/${id}/read`)
  },

  markAllAsRead: async (): Promise<void> => {
    await api.patch('/notifications/read-all')
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/notifications/${id}`)
  },

  send: async (data: { userId: string; title: string; message: string; type?: string; reportId?: string }): Promise<Notification> => {
    const { data: response } = await api.post('/notifications/send', data)
    return response
  },
}

export default api
