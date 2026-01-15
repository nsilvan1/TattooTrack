import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { Search, Plus, Users, Phone, Instagram, LayoutGrid, List, Mail, MapPin, X, Calendar, Sparkles, MessageCircle, Clock, TrendingUp, Palette, CheckCircle2 } from 'lucide-react'
import { Button, Input, Card, CardContent, EmptyState, Avatar } from '../components/ui'
import { clientsApi, tagsApi } from '../services/api'
import type { ClientFilters, Tag as TagType } from '../types'

type ViewMode = 'cards' | 'table'

export default function Clients() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<ClientFilters>({ search: '' })
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('table')

  const { data: clientsData, isLoading } = useQuery({
    queryKey: ['clients', filters, selectedTags],
    queryFn: () => clientsApi.list({ ...filters, tagIds: selectedTags }),
  })

  const { data: tags } = useQuery({
    queryKey: ['tags'],
    queryFn: tagsApi.list,
  })

  const { data: conversionStats } = useQuery({
    queryKey: ['conversionStats'],
    queryFn: clientsApi.getConversionStats,
  })

  const clients = clientsData?.data || []

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    )
  }

  const clearFilters = () => {
    setFilters({ search: '' })
    setSelectedTags([])
  }

  const hasActiveFilters = filters.search || selectedTags.length > 0

  const renderCards = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {clients.map((client) => (
        <Link key={client.id} to={`/clients/${client.id}`}>
          <Card className="hover:bg-white/5 hover:border-white/20 transition-colors cursor-pointer h-full">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Avatar name={client.name} size="md" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm text-text-primary truncate">{client.name}</h3>
                  <div className="flex items-center gap-1 text-xs text-text-secondary mt-0.5">
                    <Phone className="w-3 h-3" />
                    {client.phone}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1">
                {client.instagram && (
                  <span className="flex items-center gap-1 text-xs text-text-secondary bg-white/5 px-2 py-0.5 rounded-full">
                    <Instagram className="w-3 h-3" />
                    @{client.instagram.replace('@', '')}
                  </span>
                )}
                {client.city && (
                  <span className="flex items-center gap-1 text-xs text-text-secondary bg-white/5 px-2 py-0.5 rounded-full">
                    <MapPin className="w-3 h-3" />
                    {client.city}
                  </span>
                )}
              </div>

              {client.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1 border-t border-white/5">
                  {client.tags.slice(0, 3).map((t) => (
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
                  {client.tags.length > 3 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-text-secondary">
                      +{client.tags.length - 3}
                    </span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )

  const formatRelativeDate = (dateStr?: string) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Hoje'
    if (diffDays === 1) return 'Ontem'
    if (diffDays < 7) return `${diffDays} dias`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} sem`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} mês${Math.floor(diffDays / 30) > 1 ? 'es' : ''}`
    return `${Math.floor(diffDays / 365)} ano${Math.floor(diffDays / 365) > 1 ? 's' : ''}`
  }

  const renderTable = () => (
    <Card>
      <div className="overflow-auto max-h-[calc(100vh-320px)] scrollbar-thin">
        <table className="w-full">
          <thead className="sticky top-0 bg-surface-solid z-10">
            <tr className="border-b border-white/10">
              <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">Cliente</th>
              <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">Contato</th>
              <th className="text-left text-xs font-medium text-text-secondary px-4 py-3 hidden lg:table-cell">Primeiro Contato</th>
              <th className="text-left text-xs font-medium text-text-secondary px-4 py-3 hidden md:table-cell">Último Contato</th>
              <th className="text-left text-xs font-medium text-text-secondary px-4 py-3">Tags</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {clients.map((client) => (
              <tr
                key={client.id}
                className="hover:bg-white/5 transition-colors cursor-pointer"
                onClick={() => navigate(`/clients/${client.id}`)}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={client.name} size="sm" />
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-text-primary truncate">{client.name}</p>
                      {client.instagram && (
                        <p className="text-xs text-text-secondary truncate">@{client.instagram.replace('@', '')}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 text-sm text-text-primary">
                      <Phone className="w-3 h-3 text-text-secondary" />
                      {client.phone}
                    </div>
                    {client.email && (
                      <div className="flex items-center gap-1.5 text-xs text-text-secondary truncate max-w-[150px]">
                        <Mail className="w-3 h-3 shrink-0" />
                        <span className="truncate">{client.email}</span>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  {client.firstContact ? (
                    <div className="flex items-center gap-1.5 text-sm text-text-secondary">
                      <MessageCircle className="w-3 h-3 text-emerald-400" />
                      <span>{new Date(client.firstContact).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })}</span>
                    </div>
                  ) : (
                    <span className="text-text-secondary/40 text-sm">-</span>
                  )}
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  {client.lastContact ? (
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-cyan-400" />
                      <span className="text-sm text-text-primary">{formatRelativeDate(client.lastContact)}</span>
                    </div>
                  ) : (
                    <span className="text-text-secondary/40 text-sm">-</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {client.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {client.tags.slice(0, 2).map((t) => (
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
                      {client.tags.length > 2 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-text-secondary">
                          +{client.tags.length - 2}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-text-secondary/40 text-sm">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )

  return (
    <div className="space-y-4">
      {/* Header compacto */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Clientes</h1>
          <p className="text-sm text-text-secondary">Gerencie sua base de clientes</p>
        </div>
        <Link to="/app/clients/new">
          <Button size="sm">
            <Plus className="w-4 h-4" />
            Novo Cliente
          </Button>
        </Link>
      </div>

      {/* Stats Cards - Conversion Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        <Card className="glass-strong">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-500/20">
              <Users className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-text-primary">{conversionStats?.overview.totalClients || 0}</p>
              <p className="text-xs text-text-secondary">Total de Clientes</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-strong">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/20">
              <Calendar className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-text-primary">{conversionStats?.overview.clientsWithAppointments || 0}</p>
              <p className="text-xs text-text-secondary">Com Agendamento</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-strong">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/20">
              <Palette className="w-4 h-4 text-accent" />
            </div>
            <div>
              <p className="text-lg font-bold text-text-primary">{conversionStats?.overview.clientsWithTattoos || 0}</p>
              <p className="text-xs text-text-secondary">Com Tatuagem</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-strong">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-emerald-400">{conversionStats?.overview.conversionRate || 0}%</p>
              <p className="text-xs text-text-secondary">Taxa de Conversão</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-strong">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <CheckCircle2 className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-text-primary">{conversionStats?.appointments.completed || 0}</p>
              <p className="text-xs text-text-secondary">Sessões Concluídas</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-strong">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-pink-500/20">
              <Sparkles className="w-4 h-4 text-pink-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-text-primary">{conversionStats?.tattoos.total || 0}</p>
              <p className="text-xs text-text-secondary">Total de Tatuagens</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de filtros unificada */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <Input
                placeholder="Buscar cliente..."
                className="pl-9 h-9 text-sm"
                value={filters.search || ''}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              />
            </div>

            {/* Tag filters inline */}
            {tags && tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-text-secondary px-2">Tags:</span>
                {tags.slice(0, 6).map((tag: TagType) => (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className={`text-xs px-2 py-1 rounded-full transition-all ${
                      selectedTags.includes(tag.id)
                        ? 'ring-1 ring-white/30'
                        : 'opacity-60 hover:opacity-100'
                    }`}
                    style={{
                      backgroundColor: `${tag.color}20`,
                      color: tag.color,
                    }}
                  >
                    {tag.name}
                  </button>
                ))}
                {tags.length > 6 && (
                  <span className="text-xs text-text-secondary">+{tags.length - 6}</span>
                )}
              </div>
            )}

            {/* Clear & View Toggle */}
            <div className="flex items-center gap-2 ml-auto">
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary transition-colors"
                >
                  <X className="w-3 h-3" />
                  Limpar
                </button>
              )}

              <div className="flex bg-white/5 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`p-1.5 rounded-md transition-colors ${
                    viewMode === 'cards'
                      ? 'bg-violet-500/20 text-violet-400'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                  title="Cards"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-md transition-colors ${
                    viewMode === 'table'
                      ? 'bg-violet-500/20 text-violet-400'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                  title="Tabela"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Active filters count */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5">
              <span className="text-xs text-text-secondary">
                {clients.length} resultado{clients.length !== 1 ? 's' : ''}
              </span>
              {selectedTags.length > 0 && (
                <span className="text-xs text-violet-400">
                  • {selectedTags.length} tag{selectedTags.length !== 1 ? 's' : ''} selecionada{selectedTags.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content */}
      {isLoading ? (
        viewMode === 'cards' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="h-28" />
              </Card>
            ))}
          </div>
        ) : (
          <Card className="animate-pulse">
            <div className="h-64" />
          </Card>
        )
      ) : clients.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Users className="w-6 h-6" />}
            title="Nenhum cliente encontrado"
            description={
              hasActiveFilters
                ? 'Tente ajustar os filtros de busca'
                : 'Comece cadastrando seu primeiro cliente'
            }
            action={
              !hasActiveFilters ? (
                <Link to="/app/clients/new">
                  <Button size="sm">
                    <Plus className="w-4 h-4" />
                    Cadastrar Cliente
                  </Button>
                </Link>
              ) : undefined
            }
          />
        </Card>
      ) : (
        viewMode === 'cards' ? renderCards() : renderTable()
      )}
    </div>
  )
}
