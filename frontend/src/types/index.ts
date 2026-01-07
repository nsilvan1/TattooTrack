export interface Tag {
  id: string
  name: string
  color: string
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
  date?: string
  price?: number
  notes?: string
  images: string[]
  createdAt: string
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
  createdAt: string
  updatedAt: string
  tags: ClientTag[]
  tattoos?: Tattoo[]
  references?: Reference[]
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
