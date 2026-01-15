import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Edit, Trash2, Tag as TagIcon, Users, Search, LayoutGrid, List, TrendingUp } from 'lucide-react'
import { Button, Card, CardContent, Modal, Input, EmptyState } from '../components/ui'
import { tagsApi } from '../services/api'
import type { Tag } from '../types'

const defaultColors = [
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#84CC16', // Lime
  '#6366F1', // Indigo
  '#14B8A6', // Teal
  '#A855F7', // Purple
]

type ViewMode = 'grid' | 'list'

export default function Tags() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const [tagName, setTagName] = useState('')
  const [tagColor, setTagColor] = useState(defaultColors[0])
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingTag, setDeletingTag] = useState<Tag | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')

  const { data: tags, isLoading } = useQuery({
    queryKey: ['tags'],
    queryFn: tagsApi.list,
  })

  const filteredTags = useMemo(() => {
    if (!tags) return []
    if (!searchQuery) return tags
    return tags.filter((tag: Tag) =>
      tag.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [tags, searchQuery])

  const stats = useMemo(() => {
    if (!tags) return { total: 0, totalClients: 0, avgPerTag: 0, mostUsed: null }
    const totalClients = tags.reduce((sum: number, tag: Tag) => sum + (tag.clientCount || 0), 0)
    const mostUsed = tags.reduce((max: Tag | null, tag: Tag) =>
      !max || (tag.clientCount || 0) > (max.clientCount || 0) ? tag : max
    , null as Tag | null)
    return {
      total: tags.length,
      totalClients,
      avgPerTag: tags.length > 0 ? (totalClients / tags.length).toFixed(1) : 0,
      mostUsed,
    }
  }, [tags])

  const createMutation = useMutation({
    mutationFn: () => tagsApi.create(tagName, tagColor),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      handleCloseModal()
    },
  })

  const updateMutation = useMutation({
    mutationFn: () => tagsApi.update(editingTag!.id, tagName, tagColor),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      handleCloseModal()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => tagsApi.delete(deletingTag!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      setShowDeleteModal(false)
      setDeletingTag(null)
    },
  })

  const handleOpenModal = (tag?: Tag) => {
    if (tag) {
      setEditingTag(tag)
      setTagName(tag.name)
      setTagColor(tag.color)
    } else {
      setEditingTag(null)
      setTagName('')
      // Select a random color for new tags
      setTagColor(defaultColors[Math.floor(Math.random() * defaultColors.length)])
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingTag(null)
    setTagName('')
    setTagColor(defaultColors[0])
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!tagName.trim()) return

    if (editingTag) {
      updateMutation.mutate()
    } else {
      createMutation.mutate()
    }
  }

  const handleDelete = (tag: Tag, e: React.MouseEvent) => {
    e.stopPropagation()
    setDeletingTag(tag)
    setShowDeleteModal(true)
  }

  const handleTagClick = (tag: Tag) => {
    navigate(`/clients?tagId=${tag.id}`)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-text-primary">Tags</h1>
          <p className="text-xs sm:text-sm text-text-secondary">Organize seus clientes com tags</p>
        </div>
        <Button size="sm" onClick={() => handleOpenModal()} className="w-full sm:w-auto">
          <Plus className="w-4 h-4" />
          Nova Tag
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="glass-strong">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-500/20">
              <TagIcon className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-text-primary">{stats.total}</p>
              <p className="text-xs text-text-secondary">Total de Tags</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-strong">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/20">
              <Users className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-text-primary">{stats.totalClients}</p>
              <p className="text-xs text-text-secondary">Clientes Tagueados</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-strong">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-text-primary">{stats.avgPerTag}</p>
              <p className="text-xs text-text-secondary">Média por Tag</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-strong">
          <CardContent className="p-3 flex items-center gap-3">
            {stats.mostUsed ? (
              <>
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: `${stats.mostUsed.color}20` }}
                >
                  <TagIcon className="w-4 h-4" style={{ color: stats.mostUsed.color }} />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold text-text-primary truncate">{stats.mostUsed.name}</p>
                  <p className="text-xs text-text-secondary">Mais Usada ({stats.mostUsed.clientCount})</p>
                </div>
              </>
            ) : (
              <>
                <div className="p-2 rounded-lg bg-white/10">
                  <TagIcon className="w-4 h-4 text-text-secondary" />
                </div>
                <div>
                  <p className="text-lg font-bold text-text-primary">-</p>
                  <p className="text-xs text-text-secondary">Mais Usada</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Search and View Toggle */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <Input
                placeholder="Buscar tag..."
                className="pl-9 h-9 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex bg-white/5 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-violet-500/20 text-violet-400'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
                title="Grid"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'list'
                    ? 'bg-violet-500/20 text-violet-400'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
                title="Lista"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tags Content */}
      {isLoading ? (
        <div className={viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3' : 'space-y-2'}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className={viewMode === 'grid' ? 'h-24' : 'h-14'} />
            </Card>
          ))}
        </div>
      ) : filteredTags.length === 0 ? (
        <Card>
          <EmptyState
            icon={<TagIcon className="w-6 h-6" />}
            title={searchQuery ? 'Nenhuma tag encontrada' : 'Nenhuma tag criada'}
            description={searchQuery ? 'Tente outra busca' : 'Crie tags para organizar seus clientes'}
            action={
              !searchQuery ? (
                <Button size="sm" onClick={() => handleOpenModal()}>
                  <Plus className="w-4 h-4" />
                  Criar Tag
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filteredTags.map((tag: Tag) => (
            <Card
              key={tag.id}
              className="group hover:bg-white/5 hover:border-white/20 transition-all cursor-pointer"
              onClick={() => handleTagClick(tag)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                    style={{ backgroundColor: `${tag.color}20` }}
                  >
                    <TagIcon className="w-5 h-5" style={{ color: tag.color }} />
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleOpenModal(tag)
                      }}
                      className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5 text-text-secondary" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(tag, e)}
                      className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                </div>
                <p className="font-medium text-text-primary truncate">{tag.name}</p>
                <p className="text-sm text-text-secondary mt-0.5">
                  {tag.clientCount || 0} cliente{(tag.clientCount || 0) !== 1 ? 's' : ''}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <div className="divide-y divide-white/5">
            {filteredTags.map((tag: Tag) => (
              <div
                key={tag.id}
                className="flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer group"
                onClick={() => handleTagClick(tag)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${tag.color}20` }}
                  >
                    <TagIcon className="w-4 h-4" style={{ color: tag.color }} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-text-primary truncate">{tag.name}</p>
                    <p className="text-xs text-text-secondary">
                      {tag.clientCount || 0} cliente{(tag.clientCount || 0) !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs px-2.5 py-1 rounded-full font-medium"
                    style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                  >
                    {tag.name}
                  </span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleOpenModal(tag)
                      }}
                      className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5 text-text-secondary" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(tag, e)}
                      className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingTag ? 'Editar Tag' : 'Nova Tag'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nome da Tag"
            placeholder="Ex: VIP, Orçamento, Retorno..."
            value={tagName}
            onChange={(e) => setTagName(e.target.value)}
            autoFocus
          />
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Cor</label>
            <div className="grid grid-cols-6 gap-2">
              {defaultColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setTagColor(color)}
                  className={`w-full aspect-square rounded-lg transition-all ${
                    tagColor === color
                      ? 'ring-2 ring-offset-2 ring-offset-surface scale-110'
                      : 'hover:scale-105'
                  }`}
                  style={{
                    backgroundColor: color,
                    ['--tw-ring-color' as string]: color
                  }}
                />
              ))}
            </div>
          </div>
          <div className="pt-2 pb-2">
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
              <span className="text-sm text-text-secondary">Preview:</span>
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center"
                  style={{ backgroundColor: `${tagColor}20` }}
                >
                  <TagIcon className="w-3.5 h-3.5" style={{ color: tagColor }} />
                </div>
                <span
                  className="text-sm px-3 py-1 rounded-full font-medium"
                  style={{
                    backgroundColor: `${tagColor}20`,
                    color: tagColor,
                  }}
                >
                  {tagName || 'Nome da tag'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button
              type="submit"
              isLoading={createMutation.isPending || updateMutation.isPending}
              disabled={!tagName.trim()}
            >
              {editingTag ? 'Salvar' : 'Criar Tag'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false)
          setDeletingTag(null)
        }}
        title="Excluir Tag"
      >
        <div className="space-y-4">
          {deletingTag && (
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${deletingTag.color}20` }}
              >
                <TagIcon className="w-5 h-5" style={{ color: deletingTag.color }} />
              </div>
              <div>
                <p className="font-medium text-text-primary">{deletingTag.name}</p>
                <p className="text-sm text-text-secondary">
                  {deletingTag.clientCount || 0} cliente{(deletingTag.clientCount || 0) !== 1 ? 's' : ''} usam esta tag
                </p>
              </div>
            </div>
          )}
          <p className="text-text-secondary">
            Tem certeza que deseja excluir esta tag? Ela será removida de todos os clientes associados.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setShowDeleteModal(false)
                setDeletingTag(null)
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => deleteMutation.mutate()}
              isLoading={deleteMutation.isPending}
            >
              Excluir Tag
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
