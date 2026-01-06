import axios from 'axios'
import type { Client, CreateClientData, UpdateClientData, Tag, PaginatedResponse, ClientFilters, Tattoo, Reference, Appointment, CreateAppointmentData, UpdateAppointmentData, AppointmentFilters, AppointmentStatus } from '../types'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
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

export default api
