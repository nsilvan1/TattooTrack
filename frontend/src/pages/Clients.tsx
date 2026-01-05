import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { Search, Plus, Users, Phone, Instagram, Filter, LayoutGrid, List, Mail, MapPin } from 'lucide-react'
import { Button, Input, Card, CardContent, EmptyState, Avatar, Tag } from '../components/ui'
import { clientsApi, tagsApi } from '../services/api'
import type { ClientFilters, Tag as TagType } from '../types'

type ViewMode = 'cards' | 'table'

export default function Clients() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<ClientFilters>({ search: '' })
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('table')

  const { data: clientsData, isLoading } = useQuery({
    queryKey: ['clients', filters, selectedTags],
    queryFn: () => clientsApi.list({ ...filters, tagIds: selectedTags }),
  })

  const { data: tags } = useQuery({
    queryKey: ['tags'],
    queryFn: tagsApi.list,
  })

  const clients = clientsData?.data || []

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    )
  }

  const renderCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {clients.map((client) => (
        <Link key={client.id} to={`/clients/${client.id}`}>
          <Card className="hover:bg-white/5 hover:border-white/20 transition-colors cursor-pointer h-full">
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Avatar name={client.name} size="lg" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-text-primary truncate">{client.name}</h3>
                  <div className="flex items-center gap-1.5 text-sm text-text-secondary mt-1">
                    <Phone className="w-3.5 h-3.5" />
                    {client.phone}
                  </div>
                  {client.instagram && (
                    <div className="flex items-center gap-1.5 text-sm text-text-secondary mt-0.5">
                      <Instagram className="w-3.5 h-3.5" />
                      @{client.instagram.replace('@', '')}
                    </div>
                  )}
                </div>
              </div>

              {client.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {client.tags.map((t) => (
                    <Tag key={t.tagId} name={t.tag.name} color={t.tag.color} size="sm" />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )

  const renderTable = () => (
    <Card>
      <div className="overflow-auto max-h-[600px]">
        <table className="w-full">
          <thead className="sticky top-0 bg-surface-solid z-10">
            <tr className="border-b border-white/10">
              <th className="text-left text-sm font-medium text-text-secondary px-6 py-4">Cliente</th>
              <th className="text-left text-sm font-medium text-text-secondary px-6 py-4">Contato</th>
              <th className="text-left text-sm font-medium text-text-secondary px-6 py-4 hidden lg:table-cell">Cidade</th>
              <th className="text-left text-sm font-medium text-text-secondary px-6 py-4">Tags</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {clients.map((client) => (
              <tr
                key={client.id}
                className="hover:bg-white/5 transition-colors cursor-pointer"
                onClick={() => navigate(`/clients/${client.id}`)}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={client.name} size="sm" />
                    <div>
                      <p className="font-medium text-text-primary">{client.name}</p>
                      {client.instagram && (
                        <p className="text-sm text-text-secondary">@{client.instagram.replace('@', '')}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-sm text-text-primary">
                      <Phone className="w-3.5 h-3.5 text-text-secondary" />
                      {client.phone}
                    </div>
                    {client.email && (
                      <div className="flex items-center gap-1.5 text-sm text-text-secondary">
                        <Mail className="w-3.5 h-3.5" />
                        {client.email}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 hidden lg:table-cell">
                  {client.city ? (
                    <div className="flex items-center gap-1.5 text-sm text-text-secondary">
                      <MapPin className="w-3.5 h-3.5" />
                      {client.city}
                    </div>
                  ) : (
                    <span className="text-text-secondary/50 text-sm">-</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {client.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {client.tags.map((t) => (
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
                    </div>
                  ) : (
                    <span className="text-text-secondary/50 text-sm">-</span>
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Clientes</h1>
          <p className="text-text-secondary mt-1">Gerencie seus clientes e orçamentos</p>
        </div>
        <Link to="/clients/new">
          <Button>
            <Plus className="w-4 h-4" />
            Novo Cliente
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <Input
                placeholder="Buscar por nome, telefone ou Instagram..."
                className="pl-10"
                value={filters.search || ''}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              />
            </div>
            <Button
              variant="secondary"
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? 'bg-white/10' : ''}
            >
              <Filter className="w-4 h-4" />
              Filtros
            </Button>
            <div className="flex glass rounded-xl p-1">
              <button
                onClick={() => setViewMode('cards')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'cards'
                    ? 'bg-violet-500/20 text-violet-400'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
                title="Visualização em cards"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'table'
                    ? 'bg-violet-500/20 text-violet-400'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
                title="Visualização em tabela"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {showFilters && tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2 pb-1 border-t border-white/10">
              <span className="text-sm text-text-secondary mr-2 py-1">Filtrar por tag:</span>
              {tags.map((tag: TagType) => (
                <Tag
                  key={tag.id}
                  name={tag.name}
                  color={tag.color}
                  size="sm"
                  selected={selectedTags.includes(tag.id)}
                  onClick={() => toggleTag(tag.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {isLoading ? (
        viewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="h-32" />
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
            icon={<Users className="w-8 h-8" />}
            title="Nenhum cliente encontrado"
            description={
              filters.search || selectedTags.length > 0
                ? 'Tente ajustar os filtros de busca'
                : 'Comece cadastrando seu primeiro cliente'
            }
            action={
              !filters.search && selectedTags.length === 0 ? (
                <Link to="/clients/new">
                  <Button>
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

      {clients.length > 0 && (
        <div className="text-center text-sm text-text-secondary">
          {clients.length} cliente{clients.length !== 1 ? 's' : ''} encontrado{clients.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}
