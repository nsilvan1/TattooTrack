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
