import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Edit,
  Trash2,
  Phone,
  Mail,
  Instagram,
  MapPin,
  Calendar,
  AlertCircle,
  FileText,
  Image,
  Plus,
  X,
  MessageCircle,
  Clock,
  Palette,
  CheckCircle2,
  XCircle,
  ClockIcon,
  History,
} from 'lucide-react'
import { Button, Card, CardContent, Avatar, Tag, Modal, Textarea } from '../components/ui'
import { clientsApi, tagsApi, referencesApi } from '../services/api'
import { formatDate } from '../utils/date'
import type { Tag as TagType } from '../types'

export default function ClientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showAddTagModal, setShowAddTagModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadNotes, setUploadNotes] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const { data: client, isLoading } = useQuery({
    queryKey: ['client', id],
    queryFn: () => clientsApi.get(id!),
    enabled: !!id,
  })

  const { data: tags } = useQuery({
    queryKey: ['tags'],
    queryFn: tagsApi.list,
  })

  const deleteMutation = useMutation({
    mutationFn: () => clientsApi.delete(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      navigate('/clients')
    },
  })

  const addTagMutation = useMutation({
    mutationFn: (tagId: string) => clientsApi.addTag(id!, tagId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', id] })
      setShowAddTagModal(false)
    },
  })

  const removeTagMutation = useMutation({
    mutationFn: (tagId: string) => clientsApi.removeTag(id!, tagId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', id] })
    },
  })

  const uploadReferenceMutation = useMutation({
    mutationFn: () => referencesApi.upload(id!, selectedFile!, uploadNotes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', id] })
      setShowUploadModal(false)
      setSelectedFile(null)
      setUploadNotes('')
    },
  })

  const deleteReferenceMutation = useMutation({
    mutationFn: (refId: string) => referencesApi.delete(refId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', id] })
    },
  })

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-surface rounded w-48" />
        <Card>
          <CardContent className="h-64" />
        </Card>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <p className="text-text-secondary">Cliente não encontrado</p>
        <Link to="/app/clients" className="text-accent hover:underline mt-2 inline-block">
          Voltar para lista
        </Link>
      </div>
    )
  }

  const clientTagIds = client.tags.map((t) => t.tagId)
  const availableTags = tags?.filter((t: TagType) => !clientTagIds.includes(t.id)) || []

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={() => navigate('/app/clients')}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-text-secondary" />
          </button>
          <div className="flex items-center gap-3 sm:gap-4">
            <Avatar name={client.name} size="xl" className="hidden sm:flex" />
            <Avatar name={client.name} size="lg" className="sm:hidden" />
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-text-primary">{client.name}</h1>
              <p className="text-xs sm:text-base text-text-secondary">
                Cliente desde {formatDate(client.createdAt)}
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2 ml-11 sm:ml-0">
          <Link to={`/app/clients/${id}/edit`}>
            <Button variant="secondary" size="sm" className="sm:size-md">
              <Edit className="w-4 h-4" />
              <span className="hidden sm:inline">Editar</span>
            </Button>
          </Link>
          <Button variant="danger" size="sm" onClick={() => setShowDeleteModal(true)} className="sm:size-md">
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Excluir</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        {client.tags.map((t) => (
          <Tag
            key={t.tagId}
            name={t.tag.name}
            color={t.tag.color}
            onRemove={() => removeTagMutation.mutate(t.tagId)}
          />
        ))}
        {availableTags.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setShowAddTagModal(true)}>
            <Plus className="w-4 h-4" />
            Adicionar Tag
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3 space-y-6">
          <Card>
            <div className="px-6 py-4 border-b border-white/10">
              <h2 className="font-semibold text-text-primary">Informações de Contato</h2>
            </div>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/10">
                  <Phone className="w-4 h-4 text-text-secondary" />
                </div>
                <div>
                  <p className="text-sm text-text-secondary">Telefone</p>
                  <p className="text-text-primary">{client.phone}</p>
                </div>
              </div>
              {client.email && (
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white/10">
                    <Mail className="w-4 h-4 text-text-secondary" />
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary">Email</p>
                    <p className="text-text-primary">{client.email}</p>
                  </div>
                </div>
              )}
              {client.instagram && (
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white/10">
                    <Instagram className="w-4 h-4 text-text-secondary" />
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary">Instagram</p>
                    <p className="text-text-primary">@{client.instagram.replace('@', '')}</p>
                  </div>
                </div>
              )}
              {client.birthDate && (
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white/10">
                    <Calendar className="w-4 h-4 text-text-secondary" />
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary">Data de Nascimento</p>
                    <p className="text-text-primary">{formatDate(client.birthDate)}</p>
                  </div>
                </div>
              )}
              {client.firstContact && (
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/20">
                    <MessageCircle className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary">Primeiro Contato</p>
                    <p className="text-text-primary">{formatDate(client.firstContact)}</p>
                  </div>
                </div>
              )}
              {client.lastContact && (
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-cyan-500/20">
                    <Clock className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary">Último Contato</p>
                    <p className="text-text-primary">{formatDate(client.lastContact)}</p>
                  </div>
                </div>
              )}
              {(client.address || client.city) && (
                <div className="flex items-center gap-3 md:col-span-2">
                  <div className="p-2 rounded-lg bg-white/10">
                    <MapPin className="w-4 h-4 text-text-secondary" />
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary">Endereço</p>
                    <p className="text-text-primary">
                      {[client.address, client.city].filter(Boolean).join(', ')}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {(client.allergies || client.medicalNotes) && (
            <Card>
              <div className="px-6 py-4 border-b border-white/10">
                <h2 className="font-semibold text-text-primary flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-tag-retorno" />
                  Informações Médicas
                </h2>
              </div>
              <CardContent className="space-y-4">
                {client.allergies && (
                  <div>
                    <p className="text-sm font-medium text-text-secondary mb-1">Alergias</p>
                    <p className="text-text-primary">{client.allergies}</p>
                  </div>
                )}
                {client.medicalNotes && (
                  <div>
                    <p className="text-sm font-medium text-text-secondary mb-1">
                      Observações Médicas
                    </p>
                    <p className="text-text-primary">{client.medicalNotes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {client.notes && (
            <Card>
              <div className="px-6 py-4 border-b border-white/10">
                <h2 className="font-semibold text-text-primary flex items-center gap-2">
                  <FileText className="w-4 h-4 text-text-secondary" />
                  Observações
                </h2>
              </div>
              <CardContent>
                <p className="text-text-primary whitespace-pre-wrap">{client.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Client Summary Stats */}
          <Card>
            <div className="px-6 py-4 border-b border-white/10">
              <h2 className="font-semibold text-text-primary flex items-center gap-2">
                <History className="w-4 h-4 text-text-secondary" />
                Resumo do Cliente
              </h2>
            </div>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/5 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-accent">{client.tattoos?.length || 0}</p>
                  <p className="text-sm text-text-secondary">Tatuagens</p>
                </div>
                <div className="bg-white/5 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-400">{client.appointments?.filter(a => a.status === 'completed').length || 0}</p>
                  <p className="text-sm text-text-secondary">Sessões</p>
                </div>
                <div className="bg-white/5 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-cyan-400">
                    R$ {((client.tattoos?.reduce((sum, t) => sum + (t.price || 0), 0) || 0) +
                        (client.appointments?.filter(a => a.status === 'completed').reduce((sum, a) => sum + (a.price || 0), 0) || 0)).toLocaleString('pt-BR')}
                  </p>
                  <p className="text-sm text-text-secondary">Total Gasto</p>
                </div>
                <div className="bg-white/5 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-amber-400">
                    {client.appointments?.filter(a => a.status === 'scheduled' || a.status === 'confirmed').length || 0}
                  </p>
                  <p className="text-sm text-text-secondary">Agendados</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tattoos History */}
          <Card>
            <div className="px-6 py-4 border-b border-white/10">
              <h2 className="font-semibold text-text-primary flex items-center gap-2">
                <Palette className="w-4 h-4 text-accent" />
                Histórico de Tatuagens
              </h2>
            </div>
            <CardContent>
              {!client.tattoos || client.tattoos.length === 0 ? (
                <p className="text-text-secondary text-sm text-center py-4">
                  Nenhuma tatuagem registrada
                </p>
              ) : (
                <div className="space-y-4">
                  {client.tattoos.map((tattoo) => (
                    <div key={tattoo.id} className="bg-white/5 rounded-lg p-4 border-l-4 border-accent">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-text-primary">{tattoo.description}</h3>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className="text-xs bg-white/10 px-2 py-1 rounded-full text-text-secondary">
                              {tattoo.bodyPart}
                            </span>
                            {tattoo.style && (
                              <span className="text-xs bg-accent/20 px-2 py-1 rounded-full text-accent">
                                {tattoo.style}
                              </span>
                            )}
                            {tattoo.size && (
                              <span className="text-xs bg-cyan-500/20 px-2 py-1 rounded-full text-cyan-400">
                                {tattoo.size}
                              </span>
                            )}
                            {tattoo.sessions && tattoo.sessions > 1 && (
                              <span className="text-xs bg-amber-500/20 px-2 py-1 rounded-full text-amber-400">
                                {tattoo.sessions} sessões
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          {tattoo.price && (
                            <p className="text-emerald-400 font-semibold">
                              R$ {tattoo.price.toLocaleString('pt-BR')}
                            </p>
                          )}
                          {tattoo.date && (
                            <p className="text-xs text-text-secondary mt-1">
                              {formatDate(tattoo.date)}
                            </p>
                          )}
                        </div>
                      </div>
                      {tattoo.notes && (
                        <p className="text-sm text-text-secondary mt-2 italic">
                          {tattoo.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Appointments History */}
          <Card>
            <div className="px-6 py-4 border-b border-white/10">
              <h2 className="font-semibold text-text-primary flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-400" />
                Histórico de Agendamentos
              </h2>
            </div>
            <CardContent>
              {!client.appointments || client.appointments.length === 0 ? (
                <p className="text-text-secondary text-sm text-center py-4">
                  Nenhum agendamento registrado
                </p>
              ) : (
                <div className="space-y-3">
                  {client.appointments.map((appointment) => {
                    const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
                      scheduled: { color: 'text-amber-400 bg-amber-500/20', icon: <Clock className="w-3 h-3" />, label: 'Agendado' },
                      confirmed: { color: 'text-blue-400 bg-blue-500/20', icon: <CheckCircle2 className="w-3 h-3" />, label: 'Confirmado' },
                      in_progress: { color: 'text-purple-400 bg-purple-500/20', icon: <ClockIcon className="w-3 h-3" />, label: 'Em andamento' },
                      completed: { color: 'text-emerald-400 bg-emerald-500/20', icon: <CheckCircle2 className="w-3 h-3" />, label: 'Concluído' },
                      cancelled: { color: 'text-red-400 bg-red-500/20', icon: <XCircle className="w-3 h-3" />, label: 'Cancelado' },
                    }
                    const status = statusConfig[appointment.status] || statusConfig.scheduled

                    return (
                      <Link
                        key={appointment.id}
                        to={`/appointments?date=${appointment.date.split('T')[0]}`}
                        className="block bg-white/5 rounded-lg p-3 hover:bg-white/10 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-1.5 rounded-full ${status.color}`}>
                              {status.icon}
                            </div>
                            <div>
                              <p className="font-medium text-text-primary text-sm">{appointment.title}</p>
                              <p className="text-xs text-text-secondary">
                                {formatDate(appointment.date)} às {appointment.startTime} • {appointment.estimatedHours}h
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            {appointment.price && (
                              <p className="text-sm font-medium text-emerald-400">
                                R$ {appointment.price.toLocaleString('pt-BR')}
                              </p>
                            )}
                            <span className={`text-xs px-2 py-0.5 rounded-full ${status.color}`}>
                              {status.label}
                            </span>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="font-semibold text-text-primary flex items-center gap-2">
                <Image className="w-4 h-4 text-text-secondary" />
                Referências
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setShowUploadModal(true)}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <CardContent>
              {!client.references || client.references.length === 0 ? (
                <p className="text-text-secondary text-sm text-center py-4">
                  Nenhuma referência adicionada
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {client.references.map((ref) => (
                    <div key={ref.id} className="relative group">
                      <img
                        src={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3333'}${ref.imageUrl}`}
                        alt="Referência"
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => deleteReferenceMutation.mutate(ref.id)}
                        className="absolute top-1 right-1 p-1 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Excluir Cliente"
      >
        <p className="text-text-secondary mb-6">
          Tem certeza que deseja excluir o cliente <strong>{client.name}</strong>? Esta ação não
          pode ser desfeita.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={() => deleteMutation.mutate()}
            isLoading={deleteMutation.isPending}
          >
            Excluir
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={showAddTagModal}
        onClose={() => setShowAddTagModal(false)}
        title="Adicionar Tag"
      >
        <div className="flex flex-wrap gap-2">
          {availableTags.map((tag: TagType) => (
            <Tag
              key={tag.id}
              name={tag.name}
              color={tag.color}
              onClick={() => addTagMutation.mutate(tag.id)}
            />
          ))}
        </div>
      </Modal>

      <Modal
        isOpen={showUploadModal}
        onClose={() => {
          setShowUploadModal(false)
          setSelectedFile(null)
          setUploadNotes('')
        }}
        title="Adicionar Referência"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Imagem
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-surface file:text-text-primary hover:file:bg-white/10"
            />
          </div>
          <Textarea
            label="Notas (opcional)"
            placeholder="Adicione notas sobre esta referência..."
            rows={2}
            value={uploadNotes}
            onChange={(e) => setUploadNotes(e.target.value)}
          />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowUploadModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => uploadReferenceMutation.mutate()}
              isLoading={uploadReferenceMutation.isPending}
              disabled={!selectedFile}
            >
              Enviar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
