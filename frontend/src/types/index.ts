export interface Tag {
  id: string
  name: string
  color: string
  clientCount?: number
}

export interface ClientTag {
  clientId: string
  tagId: string
  tag: Tag
}

export interface Tattoo {
  id: string
  clientId: string
  description: string
  bodyPart: string
  style?: string
  size?: string
  date?: string
  price?: number
  sessions?: number
  duration?: number
  notes?: string
  images: string[]
  appointmentId?: string
  createdAt: string
  updatedAt?: string
}

export interface Reference {
  id: string
  clientId: string
  imageUrl: string
  notes?: string
  createdAt: string
}

export interface Client {
  id: string
  name: string
  phone: string
  email?: string
  instagram?: string
  birthDate?: string
  address?: string
  city?: string
  allergies?: string
  medicalNotes?: string
  notes?: string
  firstContact?: string
  lastContact?: string
  createdAt: string
  updatedAt: string
  tags: ClientTag[]
  tattoos?: Tattoo[]
  references?: Reference[]
  appointments?: Appointment[]
}

export interface CreateClientData {
  name: string
  phone: string
  email?: string
  instagram?: string
  birthDate?: string
  address?: string
  city?: string
  allergies?: string
  medicalNotes?: string
  notes?: string
  firstContact?: string
  lastContact?: string
  tagIds?: string[]
}

export interface UpdateClientData extends Partial<CreateClientData> {}

export interface ClientFilters {
  search?: string
  tagIds?: string[]
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export type AppointmentStatus = 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'

export interface Appointment {
  id: string
  clientId: string
  client: Pick<Client, 'id' | 'name' | 'phone' | 'instagram'>
  title: string
  description?: string
  date: string
  startTime: string
  estimatedHours: number
  status: AppointmentStatus
  price?: number
  depositAmount?: number
  depositPaid: boolean
  depositPaidAt?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface CreateAppointmentData {
  clientId: string
  title: string
  description?: string
  date: string
  startTime: string
  estimatedHours: number
  status?: AppointmentStatus
  price?: number
  depositAmount?: number
  depositPaid?: boolean
  notes?: string
}

export interface UpdateAppointmentData extends Partial<CreateAppointmentData> {}

export interface AppointmentFilters {
  startDate?: string
  endDate?: string
  status?: AppointmentStatus
  clientId?: string
}

// ============ FINANCIAL TYPES ============

export type TransactionType = 'income' | 'expense'

export interface Category {
  id: string
  name: string
  type: TransactionType
  color: string
  icon?: string
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export interface Transaction {
  id: string
  type: TransactionType
  amount: number
  description: string
  date: string
  categoryId: string
  category: Category
  appointmentId?: string
  appointment?: Pick<Appointment, 'id' | 'title' | 'client'>
  isAutomatic: boolean
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface CreateTransactionData {
  type: TransactionType
  amount: number
  description: string
  date: string
  categoryId: string
  notes?: string
}

export interface UpdateTransactionData extends Partial<CreateTransactionData> {}

export interface TransactionFilters {
  startDate?: string
  endDate?: string
  type?: TransactionType
  categoryId?: string
}

export interface FinancialSummary {
  totalIncome: number
  totalExpense: number
  balance: number
}

export interface CategorySummary {
  category: Category
  total: number
  count: number
  percentage: number
}

// ============ CONVERSION STATS ============

export interface ConversionStats {
  overview: {
    totalClients: number
    clientsWithTattoos: number
    clientsWithAppointments: number
    clientsWithCompletedAppointments: number
    conversionRate: string
    appointmentConversionRate: string
  }
  appointments: {
    total: number
    completed: number
    cancelled: number
    completionRate: string
  }
  tattoos: {
    total: number
    averagePerClient: string
  }
  revenue: {
    fromAppointments: number
    fromTattoos: number
  }
  clientsByMonth: Record<string, number>
}

// ============ INVENTORY TYPES ============

export interface ProductCategory {
  id: string
  name: string
  color: string
  icon?: string
  productCount?: number
  createdAt: string
  updatedAt: string
}

export interface Product {
  id: string
  name: string
  description?: string
  sku?: string
  categoryId: string
  category: ProductCategory
  brand?: string
  // Unidades de medida
  purchaseUnit: string        // Unidade de compra: cx (caixa), pct (pacote), fr (frasco), un (unidade)
  usageUnit: string           // Unidade de uso: un (unidade), ml, g
  quantityPerPurchaseUnit: number  // Ex: 50 agulhas por caixa, 100ml por frasco
  // Estoque (sempre em usageUnit)
  currentStock: number
  minStock: number
  costPrice?: number          // Preço por purchaseUnit
  supplier?: string
  notes?: string
  isActive: boolean
  isLowStock?: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateProductData {
  name: string
  description?: string
  sku?: string
  categoryId: string
  brand?: string
  purchaseUnit?: string
  usageUnit?: string
  quantityPerPurchaseUnit?: number
  currentStock?: number
  minStock?: number
  costPrice?: number
  supplier?: string
  notes?: string
  isActive?: boolean
}

export interface UpdateProductData extends Partial<CreateProductData> {}

export interface ProductFilters {
  search?: string
  categoryId?: string
  lowStock?: boolean
  isActive?: boolean
}

export type StockMovementType = 'in' | 'out' | 'adjustment'

export interface StockMovement {
  id: string
  productId: string
  product: Pick<Product, 'id' | 'name' | 'sku' | 'usageUnit' | 'purchaseUnit' | 'quantityPerPurchaseUnit'>
  type: StockMovementType
  quantity: number
  unit: string    // Unidade usada na movimentação
  reason?: string
  notes?: string
  costPerUnit?: number
  appointmentId?: string
  appointment?: {
    id: string
    title: string
    client: {
      id: string
      name: string
    }
  }
  createdAt: string
}

export interface CreateStockMovementData {
  productId: string
  type: StockMovementType
  quantity: number
  unit: string      // Unidade da movimentação (purchaseUnit ou usageUnit)
  reason?: string
  notes?: string
  costPerUnit?: number
  appointmentId?: string
}

export interface BatchStockMovementData {
  appointmentId: string
  movements: Array<{
    productId: string
    quantity: number
    unit: string
  }>
}

export interface BatchStockMovementResponse {
  appointmentId: string
  appointment: {
    id: string
    title: string
    clientName: string
  }
  movements: StockMovement[]
  summary: {
    totalItems: number
    productsAffected: Array<{
      id: string
      name: string
      previousStock: number
      newStock: number
    }>
  }
}

export interface InventoryStats {
  overview: {
    totalProducts: number
    activeProducts: number
    totalCategories: number
    lowStockCount: number
    totalValue: number
  }
  recentMovements: StockMovement[]
  criticalStock: Product[]
}

// ============ REPORTS/BUG REPORTS TYPES ============

export type ReportType = 'bug' | 'feature' | 'other'
export type ReportStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export type ReportPriority = 'low' | 'medium' | 'high' | 'critical'

export interface ReportResponse {
  id: string
  reportId: string
  userId: string
  user: {
    id: string
    name: string
    isAdmin: boolean
  }
  message: string
  isAdmin: boolean
  createdAt: string
}

export interface Report {
  id: string
  userId: string
  user: {
    id: string
    name: string
    username: string
    email?: string
  }
  title: string
  description: string
  type: ReportType
  status: ReportStatus
  priority: ReportPriority
  screenshots: string[]
  pageUrl?: string
  userAgent?: string
  createdAt: string
  updatedAt: string
  responses?: ReportResponse[]
  _count?: {
    responses: number
  }
}

export interface CreateReportData {
  title: string
  description: string
  type?: ReportType
  priority?: ReportPriority
  screenshots?: string[]
  pageUrl?: string
  userAgent?: string
}

export interface UpdateReportData {
  status?: ReportStatus
  priority?: ReportPriority
}

export interface ReportStats {
  total: number
  byStatus: {
    open: number
    inProgress: number
    resolved: number
    closed: number
  }
  byType: Record<string, number>
  byPriority: Record<string, number>
}

// ============ USER TYPES ============

export interface User {
  id: string
  username: string
  name: string
  email?: string
  picture?: string
  calendarConnected: boolean
  isAdmin: boolean
}

// ============ NOTIFICATION TYPES ============

export type NotificationType = 'info' | 'success' | 'warning' | 'report'

export interface Notification {
  id: string
  userId: string
  title: string
  message: string
  type: NotificationType
  read: boolean
  reportId?: string
  createdAt: string
}
