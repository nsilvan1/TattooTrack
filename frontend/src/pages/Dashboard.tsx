import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { Users, UserPlus, CalendarCheck, TrendingUp, Edit, Phone, ExternalLink, Save, Mail, Instagram } from 'lucide-react'
import { Card, CardContent, Button, Input, Modal } from '../components/ui'
import { clientsApi, tagsApi } from '../services/api'
import type { Client, Tag as TagType } from '../types'

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  color: string
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4">
        <div className={`p-3 rounded-xl ${color}`}>{icon}</div>
        <div className="flex-1">
          <p className="text-sm text-text-secondary">{title}</p>
          <p className="text-2xl font-bold text-text-primary">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function Dashboard() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [editForm, setEditForm] = useState({ name: '', phone: '', notes: '' })

  const { data: clientsData } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientsApi.list({}, 1, 1000),
  })

  const { data: tags } = useQuery({
    queryKey: ['tags'],
    queryFn: tagsApi.list,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => clientsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      setEditingClient(null)
    },
  })

  const clients = clientsData?.data || []

  const stats = {
    total: clients.length,
    orcamentos: clients.filter((c) => c.tags.some((t) => t.tag.name === 'Orçamento')).length,
    agendados: clients.filter((c) => c.tags.some((t) => t.tag.name === 'Agendado')).length,
    finalizados: clients.filter((c) => c.tags.some((t) => t.tag.name === 'Finalizado')).length,
  }

  const openEditModal = (client: Client) => {
    setEditingClient(client)
    setEditForm({
      name: client.name,
      phone: client.phone,
      notes: client.notes || '',
    })
  }

  const handleSave = () => {
    if (editingClient) {
      updateMutation.mutate({ id: editingClient.id, data: editForm })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
        <p className="text-text-secondary mt-1">Visão geral do seu negócio</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total de Clientes"
          value={stats.total}
          icon={<Users className="w-5 h-5 text-violet-400" />}
          color="bg-violet-500/20"
        />
        <StatCard
          title="Orçamentos"
          value={stats.orcamentos}
          icon={<UserPlus className="w-5 h-5 text-amber-400" />}
          color="bg-amber-500/20"
        />
        <StatCard
          title="Agendados"
          value={stats.agendados}
          icon={<CalendarCheck className="w-5 h-5 text-cyan-400" />}
          color="bg-cyan-500/20"
        />
        <StatCard
          title="Finalizados"
          value={stats.finalizados}
          icon={<TrendingUp className="w-5 h-5 text-emerald-400" />}
          color="bg-emerald-500/20"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
            <h2 className="font-semibold text-text-primary">Clientes Recentes</h2>
            <Link to="/clients" className="text-sm text-violet-400 hover:text-violet-300 flex items-center gap-1">
              Ver todos <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
          <div className="overflow-auto max-h-[400px]">
            {clients.length === 0 ? (
              <p className="text-text-secondary text-sm py-8 text-center">
                Nenhum cliente cadastrado ainda
              </p>
            ) : (
              <table className="w-full">
                <thead className="sticky top-0 bg-surface-solid z-10">
                  <tr className="border-b border-white/10">
                    <th className="text-left text-xs font-medium text-text-secondary px-6 py-3">Cliente</th>
                    <th className="text-left text-xs font-medium text-text-secondary px-6 py-3 hidden sm:table-cell">Contato</th>
                    <th className="text-left text-xs font-medium text-text-secondary px-6 py-3">Tags</th>
                    <th className="text-right text-xs font-medium text-text-secondary px-6 py-3 w-16">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {clients.slice(0, 6).map((client) => (
                    <tr
                      key={client.id}
                      className="hover:bg-white/5 transition-colors cursor-pointer group"
                      onClick={() => navigate(`/clients/${client.id}`)}
                    >
                      <td className="px-6 py-3">
                        <p className="font-medium text-text-primary truncate max-w-[180px]">{client.name}</p>
                        {client.instagram && (
                          <p className="text-xs text-text-secondary flex items-center gap-1 mt-0.5">
                            <Instagram className="w-3 h-3" />
                            @{client.instagram.replace('@', '')}
                          </p>
                        )}
                        <p className="text-xs text-text-secondary sm:hidden flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" />
                          {client.phone}
                        </p>
                      </td>
                      <td className="px-6 py-3 hidden sm:table-cell">
                        <div className="space-y-0.5">
                          <p className="text-sm text-text-primary flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-text-secondary" />
                            {client.phone}
                          </p>
                          {client.email && (
                            <p className="text-xs text-text-secondary flex items-center gap-1.5">
                              <Mail className="w-3 h-3" />
                              {client.email}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3">
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
                            <span className="text-xs text-text-secondary">+{client.tags.length - 2}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            openEditModal(client)
                          }}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-text-secondary hover:text-text-primary opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>

        <Card>
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="font-semibold text-text-primary">Tags</h2>
          </div>
          <CardContent>
            {!tags || tags.length === 0 ? (
              <p className="text-text-secondary text-sm py-4 text-center">
                Nenhuma tag criada
              </p>
            ) : (
              <div className="space-y-2">
                {tags.map((tag: TagType) => {
                  const count = clients.filter(c => c.tags.some(t => t.tag.id === tag.id)).length
                  return (
                    <div key={tag.id} className="flex items-center justify-between py-1.5">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span className="text-sm text-text-primary">{tag.name}</span>
                      </div>
                      <span className="text-sm text-text-secondary">{count}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Modal
        isOpen={!!editingClient}
        onClose={() => setEditingClient(null)}
        title="Edição Rápida"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Nome"
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
          />
          <Input
            label="Telefone"
            value={editForm.phone}
            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Observações
            </label>
            <textarea
              className="w-full px-4 py-2.5 glass rounded-xl text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:bg-white/10 transition-all duration-300 resize-none"
              rows={3}
              value={editForm.notes}
              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
            />
          </div>
          {editingClient && editingClient.tags.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Tags</label>
              <div className="flex flex-wrap gap-1.5">
                {editingClient.tags.map((t) => (
                  <span
                    key={t.tagId}
                    className="text-xs px-2.5 py-1 rounded-full"
                    style={{
                      backgroundColor: `${t.tag.color}20`,
                      color: t.tag.color,
                    }}
                  >
                    {t.tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-between pt-2">
            <Link to={editingClient ? `/clients/${editingClient.id}` : '#'}>
              <Button variant="ghost" size="sm">
                Ver perfil completo
              </Button>
            </Link>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setEditingClient(null)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} isLoading={updateMutation.isPending}>
                <Save className="w-4 h-4" />
                Salvar
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
