import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Save } from 'lucide-react'
import { Button, Input, Textarea, Card, CardContent, Tag } from '../components/ui'
import { clientsApi, tagsApi } from '../services/api'
import type { Tag as TagType } from '../types'

const clientSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  phone: z.string().min(10, 'Telefone inválido'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  instagram: z.string().optional(),
  birthDate: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  allergies: z.string().optional(),
  medicalNotes: z.string().optional(),
  notes: z.string().optional(),
})

type ClientFormData = z.infer<typeof clientSchema>

export default function ClientForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEditing = !!id

  const { data: client, isLoading: isLoadingClient } = useQuery({
    queryKey: ['client', id],
    queryFn: () => clientsApi.get(id!),
    enabled: isEditing,
  })

  const { data: tags } = useQuery({
    queryKey: ['tags'],
    queryFn: tagsApi.list,
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
  })

  useEffect(() => {
    if (client) {
      reset({
        name: client.name,
        phone: client.phone,
        email: client.email || '',
        instagram: client.instagram || '',
        birthDate: client.birthDate ? client.birthDate.split('T')[0] : '',
        address: client.address || '',
        city: client.city || '',
        allergies: client.allergies || '',
        medicalNotes: client.medicalNotes || '',
        notes: client.notes || '',
      })
    }
  }, [client, reset])

  const createMutation = useMutation({
    mutationFn: clientsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      navigate('/clients')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ClientFormData }) =>
      clientsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      queryClient.invalidateQueries({ queryKey: ['client', id] })
      navigate(`/clients/${id}`)
    },
  })

  const addTagMutation = useMutation({
    mutationFn: ({ clientId, tagId }: { clientId: string; tagId: string }) =>
      clientsApi.addTag(clientId, tagId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', id] })
    },
  })

  const removeTagMutation = useMutation({
    mutationFn: ({ clientId, tagId }: { clientId: string; tagId: string }) =>
      clientsApi.removeTag(clientId, tagId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', id] })
    },
  })

  const onSubmit = (data: ClientFormData) => {
    const cleanData = {
      ...data,
      email: data.email || undefined,
      instagram: data.instagram || undefined,
      birthDate: data.birthDate || undefined,
      address: data.address || undefined,
      city: data.city || undefined,
      allergies: data.allergies || undefined,
      medicalNotes: data.medicalNotes || undefined,
      notes: data.notes || undefined,
    }

    if (isEditing) {
      updateMutation.mutate({ id: id!, data: cleanData })
    } else {
      createMutation.mutate(cleanData)
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  if (isEditing && isLoadingClient) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-surface rounded w-48" />
        <Card>
          <CardContent className="h-96" />
        </Card>
      </div>
    )
  }

  const clientTags = client?.tags.map((t) => t.tagId) || []

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-white/5 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-text-secondary" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            {isEditing ? 'Editar Cliente' : 'Novo Cliente'}
          </h1>
          <p className="text-text-secondary mt-1">
            {isEditing ? 'Atualize os dados do cliente' : 'Cadastre um novo cliente'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="font-semibold text-text-primary">Informações Básicas</h2>
          </div>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nome *"
              placeholder="Nome completo"
              error={errors.name?.message}
              {...register('name')}
            />
            <Input
              label="Telefone *"
              placeholder="(00) 00000-0000"
              error={errors.phone?.message}
              {...register('phone')}
            />
            <Input
              label="Email"
              type="email"
              placeholder="email@exemplo.com"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label="Instagram"
              placeholder="@usuario"
              {...register('instagram')}
            />
            <Input
              label="Data de Nascimento"
              type="date"
              {...register('birthDate')}
            />
            <Input label="Cidade" placeholder="Cidade" {...register('city')} />
            <div className="md:col-span-2">
              <Input
                label="Endereço"
                placeholder="Endereço completo"
                {...register('address')}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="font-semibold text-text-primary">Informações Médicas</h2>
          </div>
          <CardContent className="space-y-4">
            <Textarea
              label="Alergias"
              placeholder="Liste alergias conhecidas (medicamentos, materiais, etc.)"
              rows={2}
              {...register('allergies')}
            />
            <Textarea
              label="Observações Médicas"
              placeholder="Outras informações médicas relevantes"
              rows={2}
              {...register('medicalNotes')}
            />
          </CardContent>
        </Card>

        <Card>
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="font-semibold text-text-primary">Observações</h2>
          </div>
          <CardContent>
            <Textarea
              placeholder="Observações gerais sobre o cliente..."
              rows={3}
              {...register('notes')}
            />
          </CardContent>
        </Card>

        {isEditing && tags && tags.length > 0 && (
          <Card>
            <div className="px-6 py-4 border-b border-white/10">
              <h2 className="font-semibold text-text-primary">Tags</h2>
            </div>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag: TagType) => {
                  const isSelected = clientTags.includes(tag.id)
                  return (
                    <Tag
                      key={tag.id}
                      name={tag.name}
                      color={tag.color}
                      selected={isSelected}
                      onClick={() => {
                        if (isSelected) {
                          removeTagMutation.mutate({ clientId: id!, tagId: tag.id })
                        } else {
                          addTagMutation.mutate({ clientId: id!, tagId: tag.id })
                        }
                      }}
                    />
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isLoading}>
            <Save className="w-4 h-4" />
            {isEditing ? 'Salvar Alterações' : 'Cadastrar Cliente'}
          </Button>
        </div>
      </form>
    </div>
  )
}
