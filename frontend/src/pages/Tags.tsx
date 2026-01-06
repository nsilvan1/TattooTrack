import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit, Trash2, Tag as TagIcon } from 'lucide-react'
import { Button, Card, CardContent, Modal, Input, EmptyState } from '../components/ui'
import { tagsApi } from '../services/api'
import type { Tag } from '../types'

const defaultColors = [
  '#FCD34D', // Amarelo
  '#60A5FA', // Azul
  '#A78BFA', // Roxo
  '#4ADE80', // Verde
  '#FB923C', // Laranja
  '#FBBF24', // Dourado
  '#F87171', // Vermelho
  '#38BDF8', // Cyan
  '#E879F9', // Rosa
  '#34D399', // Esmeralda
]

export default function Tags() {
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const [tagName, setTagName] = useState('')
  const [tagColor, setTagColor] = useState(defaultColors[0])
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingTag, setDeletingTag] = useState<Tag | null>(null)

  const { data: tags, isLoading } = useQuery({
    queryKey: ['tags'],
    queryFn: tagsApi.list,
  })

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
      setTagColor(defaultColors[0])
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

  const handleDelete = (tag: Tag) => {
    setDeletingTag(tag)
    setShowDeleteModal(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Tags</h1>
          <p className="text-text-secondary mt-1">Organize seus clientes com tags personalizadas</p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="w-4 h-4" />
          Nova Tag
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-20" />
            </Card>
          ))}
        </div>
      ) : !tags || tags.length === 0 ? (
        <Card>
          <EmptyState
            icon={<TagIcon className="w-8 h-8" />}
            title="Nenhuma tag criada"
            description="Crie tags para organizar seus clientes por status ou categoria"
            action={
              <Button onClick={() => handleOpenModal()}>
                <Plus className="w-4 h-4" />
                Criar Primeira Tag
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tags.map((tag: Tag) => (
            <Card key={tag.id} className="hover:bg-white/5 hover:border-white/20 transition-colors">
              <CardContent className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${tag.color}20` }}
                  >
                    <TagIcon className="w-5 h-5" style={{ color: tag.color }} />
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">{tag.name}</p>
                    <p className="text-sm text-text-secondary">{tag.color}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleOpenModal(tag)}
                    className="p-2 hover:bg-surface-hover rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4 text-text-secondary" />
                  </button>
                  <button
                    onClick={() => handleDelete(tag)}
                    className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingTag ? 'Editar Tag' : 'Nova Tag'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nome da Tag"
            placeholder="Ex: Orçamento, Agendado, VIP..."
            value={tagName}
            onChange={(e) => setTagName(e.target.value)}
            autoFocus
          />
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Cor</label>
            <div className="flex flex-wrap gap-2">
              {defaultColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setTagColor(color)}
                  className={`w-8 h-8 rounded-full transition-all ${
                    tagColor === color ? 'ring-2 ring-offset-2 ring-offset-surface' : ''
                  }`}
                  style={{ backgroundColor: color, ['--tw-ring-color' as string]: color }}
                />
              ))}
            </div>
          </div>
          <div className="pt-2">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-text-secondary">Preview:</span>
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
          <div className="flex justify-end gap-3">
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

      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false)
          setDeletingTag(null)
        }}
        title="Excluir Tag"
      >
        <p className="text-text-secondary mb-6">
          Tem certeza que deseja excluir a tag <strong>{deletingTag?.name}</strong>? Esta tag será
          removida de todos os clientes.
        </p>
        <div className="flex justify-end gap-3">
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
            Excluir
          </Button>
        </div>
      </Modal>
    </div>
  )
}
